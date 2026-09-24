import { describe, expect, it } from 'vitest';
import { clientIpFromForwarded } from './client-ip';

describe('clientIpFromForwarded', () => {
  it('reads the entry written by the outermost trusted proxy', () => {
    // Two proxies: the outer one wrote the client address, the inner one appended the outer's.
    expect(clientIpFromForwarded('203.0.113.7, 172.18.0.2', 2)).toBe('203.0.113.7');
    expect(clientIpFromForwarded('203.0.113.7', 1)).toBe('203.0.113.7');
  });

  it('ignores a forged value the client put in front', () => {
    expect(clientIpFromForwarded('6.6.6.6, 203.0.113.7, 172.18.0.2', 2)).toBe('203.0.113.7');
  });

  it('trusts nothing when no proxy is configured', () => {
    expect(clientIpFromForwarded('6.6.6.6', 0)).toBeNull();
  });

  it('rejects values that are not addresses and normalizes IPv4-mapped IPv6', () => {
    expect(clientIpFromForwarded('<script>, 172.18.0.2', 2)).toBeNull();
    expect(clientIpFromForwarded('::ffff:10.0.0.1', 1)).toBe('10.0.0.1');
  });

  it('returns null when the chain is shorter than the hop count', () => {
    expect(clientIpFromForwarded('203.0.113.7', 2)).toBeNull();
    expect(clientIpFromForwarded(null, 2)).toBeNull();
  });
});
