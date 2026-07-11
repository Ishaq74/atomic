import { describe, it, expect } from 'vitest';
import {
  wrapSelection,
  prefixLines,
  insertAtCaret,
  buildImageToken,
  buildExternalLinkToken,
  buildInternalLinkToken,
  detectDeadInternalLinks,
  markDeadInternalLinks,
} from '@/lib/content/editor-helpers';

describe('content editor helpers', () => {
  it('wrapSelection wraps the selection with inline tags', () => {
    const r = wrapSelection('hello world', 0, 5, '<strong>', '</strong>', 'texte');
    expect(r.value).toBe('<strong>hello</strong> world');
    expect(r.selStart).toBe('<strong>'.length);
    expect(r.selEnd).toBe('<strong>hello'.length);
  });

  it('wrapSelection uses placeholder when nothing selected', () => {
    const r = wrapSelection('abc', 1, 1, '<em>', '</em>', 'texte');
    expect(r.value).toBe('a<em>texte</em>bc');
  });

  it('prefixLines prefixes each intersecting line', () => {
    const r = prefixLines('a\nb\nc', 0, 3, '## ');
    expect(r.value).toBe('## a\n## b\nc');
  });

  it('insertAtCaret inserts a block at the caret', () => {
    const r = insertAtCaret('ab', 1, 1, '<img />');
    expect(r.value).toBe('a<img />b');
    expect(r.selStart).toBe(1 + '<img />'.length);
  });

  it('buildImageToken escapes attributes', () => {
    expect(buildImageToken('/x.png', 'a"b')).toBe('<img src="/x.png" alt="a&quot;b" loading="lazy" />');
  });

  it('buildExternalLinkToken adds safe rel/target', () => {
    expect(buildExternalLinkToken('Site', 'https://e.com')).toBe(
      '<a href="https://e.com" target="_blank" rel="noopener noreferrer">Site</a>',
    );
  });

  it('buildInternalLinkToken marks data-internal-link', () => {
    const t = buildInternalLinkToken('Titre', '/fr/blog/slug', 'Titre', 'slug');
    expect(t).toContain('data-internal-link="slug"');
    expect(t).toContain('href="/fr/blog/slug"');
  });

  it('detectDeadInternalLinks reports missing targets', () => {
    const html =
      '<a href="/fr/blog/alive" data-internal-link="alive">A</a>' +
      '<a href="/fr/blog/dead" data-internal-link="dead">D</a>';
    const reports = detectDeadInternalLinks(html, new Set(['alive']));
    expect(reports).toHaveLength(1);
    expect(reports[0].target).toBe('dead');
    expect(reports[0].reason).toBe('missing-target');
  });

  it('detectDeadInternalLinks ignores external links', () => {
    const html = '<a href="https://e.com">E</a>';
    expect(detectDeadInternalLinks(html, new Set())).toHaveLength(0);
  });

  it('markDeadInternalLinks adds dead-link class to missing targets', () => {
    const html = '<a href="/fr/blog/dead" data-internal-link="dead" class="x">D</a>';
    const out = markDeadInternalLinks(html, new Set(['alive']));
    expect(out).toContain('class="x dead-link"');
    expect(out).toContain('data-dead-link="true"');
  });

  it('markDeadInternalLinks leaves valid links untouched', () => {
    const html = '<a href="/fr/blog/alive" data-internal-link="alive" class="x">A</a>';
    const out = markDeadInternalLinks(html, new Set(['alive']));
    expect(out).not.toContain('dead-link');
  });
});
