import 'server-only';
import { randomUUID } from 'node:crypto';
import { mkdir, open, readFile, readdir, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { logger } from '@/lib/log';

/**
 * Persistence for the whole site: typed collections backed by one JSON file each, under a single
 * directory that production mounts as a Docker volume (`DATA_DIR`, default `<cwd>/data`).
 *
 * Why not a database. The café's entire dataset is a few hundred records — a menu, a handful of
 * links, one administrator, and the sessions and audit entries those produce. A PostgreSQL
 * instance for that is a second container to run, back up, patch and fail independently of the
 * site, and the hosting platform gives one container per site. Everything above this module works
 * against the collection API, so nothing else knows how storage works: swapping in a database
 * later means reimplementing this one file.
 *
 * Four properties matter, and each is guaranteed here rather than assumed:
 *
 *  1. **Writes are atomic.** Content is written to a uniquely named temporary file in the same
 *     directory, flushed to disk, and then `rename`d over the target. A rename within one
 *     filesystem is atomic, so a crash mid-write can never leave a reader a truncated file: it
 *     sees either the previous contents or the new ones.
 *  2. **Writes are durable.** The temporary file is `fsync`ed before the rename, so "the write
 *     returned" means the bytes reached the disk, not just the page cache — a container kill
 *     immediately after an admin edit does not lose it.
 *  3. **Writes are serialised per file.** Node is single-threaded, but `await` yields: two
 *     concurrent handlers could otherwise interleave a read-modify-write and lose an update.
 *     Every mutation runs in a per-file promise chain, which closes that window and makes
 *     `mutate()` the equivalent of a short transaction over one collection.
 *  4. **Reads do not touch the disk.** This process is the only writer, so the parsed contents
 *     are cached in memory and replaced write-through on every mutation. A read is a map lookup,
 *     which is what makes a per-request-rendered site affordable. (The consequence: a JSON file
 *     edited by hand underneath a running container is picked up on the next restart, not
 *     immediately.)
 *
 * State lives on `globalThis` so a development hot reload reuses the same locks and cache rather
 * than creating a second, diverging set.
 */

/** Root of the writable data directory. Production mounts a volume here. */
export function dataDir(): string {
  const configured = process.env.DATA_DIR?.trim();
  return configured ? path.resolve(configured) : path.join(process.cwd(), 'data');
}

/** Absolute path inside the data directory. Callers pass fixed, server-chosen segments only. */
export function dataPath(...segments: string[]): string {
  return path.join(dataDir(), ...segments);
}

interface FileState {
  /** Tail of the per-file mutation queue. */
  lock: Promise<unknown>;
  /** Parsed contents, or undefined until first read. */
  cache: unknown;
  loaded: boolean;
}

const globalForStore = globalThis as unknown as { __ennieStore?: Map<string, FileState> };
const files = (globalForStore.__ennieStore ??= new Map<string, FileState>());

function stateOf(fileName: string): FileState {
  let state = files.get(fileName);
  if (!state) {
    state = { lock: Promise.resolve(), cache: undefined, loaded: false };
    files.set(fileName, state);
  }
  return state;
}

/**
 * Runs `task` after every previously queued task for the same file has settled. The stored
 * promise swallows rejections so one failed write cannot poison the queue for later callers.
 */
function withLock<T>(fileName: string, task: () => Promise<T>): Promise<T> {
  const state = stateOf(fileName);
  const next = state.lock.then(task, task);
  state.lock = next.catch(() => undefined);
  return next;
}

async function readFromDisk<T>(fileName: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(dataPath(fileName), 'utf8')) as T;
  } catch (error) {
    // A missing file is the expected state on a fresh install.
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return fallback;
    // Corrupt JSON must not take the site down. Falling back to the empty state keeps the public
    // pages serving the published menu; the error names the file so it can be restored.
    if (error instanceof SyntaxError) {
      logger.error('store.file_corrupt', { file: fileName });
      return fallback;
    }
    throw error;
  }
}

async function writeToDisk(fileName: string, value: unknown): Promise<void> {
  const target = dataPath(fileName);
  await mkdir(path.dirname(target), { recursive: true });

  const temp = `${target}.${randomUUID()}.tmp`;
  const handle = await open(temp, 'wx', 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
    // Durability: without this the rename can outlive the data it was meant to publish.
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await rename(temp, target);
  } catch (error) {
    await rm(temp, { force: true });
    throw error;
  }
}

export interface Collection<T> {
  /** Every record, newest state. Served from memory after the first call. */
  read(): Promise<readonly T[]>;
  /**
   * Read-modify-write under the file's lock — the equivalent of a short transaction over this one
   * collection. `update` receives the current records, returns the complete new list and whatever
   * the caller needs back, and must treat what it is given as immutable. Throwing from it aborts
   * the write and leaves the stored state untouched.
   */
  mutate<R>(update: (items: readonly T[]) => { items: T[]; result: R }): Promise<R>;
}

/** A typed list of records stored in one JSON file. */
export function createCollection<T>(fileName: string): Collection<T> {
  async function load(): Promise<readonly T[]> {
    const state = stateOf(fileName);
    if (state.loaded) return state.cache as readonly T[];
    // Under the lock, so a concurrent mutation cannot write between this read and its own.
    return withLock(fileName, async () => {
      if (state.loaded) return state.cache as readonly T[];
      const items = await readFromDisk<T[]>(fileName, []);
      state.cache = items;
      state.loaded = true;
      return items as readonly T[];
    });
  }

  async function apply<R>(
    update: (items: readonly T[]) => Promise<{ items: T[]; result: R }>,
  ): Promise<R> {
    return withLock(fileName, async () => {
      const state = stateOf(fileName);
      if (!state.loaded) {
        state.cache = await readFromDisk<T[]>(fileName, []);
        state.loaded = true;
      }
      const current = state.cache as readonly T[];
      const { items, result } = await update(current);
      await writeToDisk(fileName, items);
      // Only published after the bytes are on disk: a failed write leaves readers on the old,
      // still-correct state rather than on a change that was never persisted.
      state.cache = items;
      state.loaded = true;
      return result;
    });
  }

  return {
    read: load,
    mutate: (update) => apply(async (items) => update(items)),
  };
}

/**
 * Record identifier. A UUID rather than anything shorter, because it is also the admin API's
 * route parameter (validated as a UUID there) and a media directory name — so it must be
 * unguessable and contain nothing a path could be built out of.
 */
export function createId(): string {
  return randomUUID();
}

/**
 * Removes temporary files a previous process left behind by dying between the write and the
 * rename. There is at most one per interrupted write, so this is tidiness rather than recovery —
 * but without it a container caught in a restart loop would slowly fill the volume.
 */
export async function sweepTempFiles(): Promise<void> {
  const root = dataDir();
  let names: string[];
  try {
    names = await readdir(root);
  } catch {
    return;
  }
  await Promise.all(
    names
      .filter((name) => name.endsWith('.tmp'))
      .map((name) => rm(path.join(root, name), { force: true }).catch(() => undefined)),
  );
}

/** ISO-8601 in UTC — the one timestamp format stored anywhere in the data directory. */
export function now(): string {
  return new Date().toISOString();
}
