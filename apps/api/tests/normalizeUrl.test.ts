import { describe, expect, it } from 'vitest';
import { ensureUrlScheme } from '../src/config/normalizeUrl.js';

describe('ensureUrlScheme (Gate 7 deployment hardening)', () => {
  it('leaves a value that already has a scheme untouched', () => {
    expect(ensureUrlScheme('https://quest-board-web.onrender.com')).toBe('https://quest-board-web.onrender.com');
    expect(ensureUrlScheme('http://localhost:3000')).toBe('http://localhost:3000');
  });

  it('prepends the default scheme to a bare hostname', () => {
    expect(ensureUrlScheme('quest-board-web.onrender.com')).toBe('https://quest-board-web.onrender.com');
  });

  it('respects an explicit non-default scheme argument', () => {
    expect(ensureUrlScheme('localhost:3000', 'http')).toBe('http://localhost:3000');
  });

  it('trims incidental whitespace from a copy-pasted env var value', () => {
    expect(ensureUrlScheme('  quest-board-web.onrender.com  ')).toBe('https://quest-board-web.onrender.com');
  });
});
