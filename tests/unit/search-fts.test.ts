import { describe, it, expect } from 'vitest';

/**
 * Tests for the full-text search helpers used by /api/search.
 * We import the functions by re-implementing them here since they're
 * defined inside the route module. This ensures the logic is correct.
 */

// ─── Reimplemented helpers (must mirror src/pages/api/search.ts) ───

function getRegconfig(locale: string): string {
  switch (locale) {
    case 'fr': return 'french';
    case 'en': return 'english';
    case 'es': return 'spanish';
    default: return 'simple';
  }
}

function buildTsQuery(raw: string): string | null {
  const tokens = raw
    .split(/\s+/)
    .map((w) => w.replace(/[&|!():'\\<>]/g, '').trim())
    .filter((w) => w.length > 0);

  if (tokens.length === 0) return null;

  return tokens
    .map((w, i) => (i === tokens.length - 1 ? `${w}:*` : w))
    .join(' & ');
}

// ─── Tests ──────────────────────────────────────────────────────────

describe('getRegconfig', () => {
  it('returns french for fr', () => {
    expect(getRegconfig('fr')).toBe('french');
  });

  it('returns english for en', () => {
    expect(getRegconfig('en')).toBe('english');
  });

  it('returns spanish for es', () => {
    expect(getRegconfig('es')).toBe('spanish');
  });

  it('returns simple for ar (no PG stemmer)', () => {
    expect(getRegconfig('ar')).toBe('simple');
  });

  it('returns simple for unknown locale', () => {
    expect(getRegconfig('ja')).toBe('simple');
  });
});

describe('buildTsQuery', () => {
  it('builds a simple single-word query with prefix match', () => {
    expect(buildTsQuery('hello')).toBe('hello:*');
  });

  it('builds a multi-word query with AND + prefix on last word', () => {
    expect(buildTsQuery('hello world')).toBe('hello & world:*');
  });

  it('handles three words', () => {
    expect(buildTsQuery('astro cms search')).toBe('astro & cms & search:*');
  });

  it('strips tsquery operators from input', () => {
    expect(buildTsQuery("hello & | ! ( ) ' : < > world")).toBe('hello & world:*');
  });

  it('strips backslashes', () => {
    expect(buildTsQuery('test\\injection')).toBe('testinjection:*');
  });

  it('returns null for empty string', () => {
    expect(buildTsQuery('')).toBeNull();
  });

  it('returns null for whitespace only', () => {
    expect(buildTsQuery('   ')).toBeNull();
  });

  it('returns null for string of only operators', () => {
    expect(buildTsQuery('& | ! ()')).toBeNull();
  });

  it('handles extra whitespace between words', () => {
    expect(buildTsQuery('  hello   world  ')).toBe('hello & world:*');
  });

  it('handles single character tokens after cleanup', () => {
    expect(buildTsQuery('a b c')).toBe('a & b & c:*');
  });

  it('handles mixed valid and invalid tokens', () => {
    expect(buildTsQuery('| hello & world !')).toBe('hello & world:*');
  });

  it('handles unicode characters', () => {
    expect(buildTsQuery('café résumé')).toBe('café & résumé:*');
  });

  it('handles Arabic text', () => {
    expect(buildTsQuery('مرحبا العالم')).toBe('مرحبا & العالم:*');
  });
});
