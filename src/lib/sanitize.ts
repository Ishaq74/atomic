import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "p", "b", "i", "u", "strong", "em", "a", "ul", "ol", "li",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "blockquote", "img", "br", "hr",
  "table", "thead", "tbody", "tr", "th", "td",
  "code", "pre", "span", "div",
  "figure", "figcaption", "sub", "sup", "mark", "small",
];

const ALLOWED_ATTR = [
  "href", "src", "alt", "title", "class",
  "target", "rel", "width", "height",
  "colspan", "rowspan", "loading",
];

const SAFE_URL_PROTOCOLS = /^(https?:\/\/|mailto:|tel:\/\/|\/(?!\/)).+/;

/** Validates a URL for use in <a href>. Blocks javascript:, data:, vbscript: etc. */
export function safeUrl(url: unknown): string {
  if (typeof url !== 'string') return '';
  const trimmed = url.trim();
  return SAFE_URL_PROTOCOLS.test(trimmed) ? trimmed : '';
}

/** Validates a URL for use in <iframe src>. Only allows https:// origins. */
export function safeEmbedUrl(url: unknown): string {
  if (typeof url !== 'string') return '';
  const trimmed = url.trim();
  return trimmed.startsWith('https://') ? trimmed : '';
}

const MAX_SANITIZE_LENGTH = 500_000; // 500 KB

export function sanitizeHtml(dirty: unknown): string {
  if (typeof dirty !== "string") return "";
  if (dirty.length > MAX_SANITIZE_LENGTH) return "";
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}
