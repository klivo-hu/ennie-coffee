import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createCollection, dataDir, dataPath } from './json-store';

/**
 * The store is the one place in the application where a bug costs data rather than a page, so
 * these cover the four properties everything above it assumes: an absent file reads as empty, a
 * write round-trips, concurrent read-modify-writes cannot lose an update, and a failed update
 * leaves the previous state exactly as it was.
 */

interface Row {
  id: string;
  count: number;
}

let root: string;
let previousDataDir: string | undefined;

beforeAll(async () => {
  previousDataDir = process.env.DATA_DIR;
  root = await mkdtemp(path.join(tmpdir(), 'ennie-store-'));
  process.env.DATA_DIR = root;
});

afterAll(async () => {
  if (previousDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = previousDataDir;
  await rm(root, { recursive: true, force: true });
});

describe('createCollection', () => {
  it('resolves paths inside DATA_DIR', () => {
    expect(dataDir()).toBe(root);
    expect(dataPath('a.json')).toBe(path.join(root, 'a.json'));
  });

  it('reads an absent file as the empty list', async () => {
    const store = createCollection<Row>('absent.json');
    expect(await store.read()).toEqual([]);
  });

  it('round-trips a write through the file, not just the cache', async () => {
    const store = createCollection<Row>('write.json');
    await store.mutate((items) => ({
      items: [...items, { id: 'a', count: 1 }],
      result: undefined,
    }));

    expect(await store.read()).toEqual([{ id: 'a', count: 1 }]);
    const onDisk = JSON.parse(await readFile(path.join(root, 'write.json'), 'utf8')) as Row[];
    expect(onDisk).toEqual([{ id: 'a', count: 1 }]);
  });

  it('serialises concurrent read-modify-writes instead of losing updates', async () => {
    const store = createCollection<Row>('concurrent.json');
    await store.mutate(() => ({ items: [{ id: 'a', count: 0 }], result: undefined }));

    // Started together on purpose: without the per-file lock these would each read count 0 and
    // the file would end at 1 rather than 20.
    await Promise.all(
      Array.from({ length: 20 }, () =>
        store.mutate((items) => ({
          items: items.map((row) => ({ ...row, count: row.count + 1 })),
          result: undefined,
        })),
      ),
    );

    expect((await store.read())[0]?.count).toBe(20);
  });

  it('leaves the stored state untouched when an update throws', async () => {
    const store = createCollection<Row>('failing.json');
    await store.mutate(() => ({ items: [{ id: 'a', count: 1 }], result: undefined }));

    await expect(
      store.mutate<never>(() => {
        throw new Error('rejected by a validation rule');
      }),
    ).rejects.toThrow('rejected');

    expect(await store.read()).toEqual([{ id: 'a', count: 1 }]);
    // And the queue still works for the next caller.
    await store.mutate((items) => ({
      items: [...items, { id: 'b', count: 2 }],
      result: undefined,
    }));
    expect(await store.read()).toHaveLength(2);
  });

  it('falls back to the empty list when the file is not valid JSON', async () => {
    await writeFile(path.join(root, 'corrupt.json'), '{ this is not json', 'utf8');
    const store = createCollection<Row>('corrupt.json');
    expect(await store.read()).toEqual([]);
  });
});
