import { PATHS, listTree, claimTestsByPattern } from './utils';
import { i18n, type Lang } from './i18n';

  const DESCRIPTION: Record<Lang, string> = {
    en: 'The CMS manages localised pages with typed JSON content sections, navigation menus, page versioning and scheduled publishing. Content can be imported and exported. Routes are prefixed with the locale (`/fr/`, `/en/`, `/es/`, `/ar/`).',
    fr: "Le CMS gère les pages localisées avec des sections de contenu JSON typées, les menus de navigation, le versioning des pages et la publication planifiée. Le contenu peut être importé et exporté. Les routes sont préfixées par la locale (`/fr/`, `/en/`, `/es/`, `/ar/`).",
    ar: 'يدير نظام إدارة المحتوى الصفحات المحلية مع أقسام محتوى JSON مكتوبة، قوائم تنقل، نسخ الصفحات والنشر المجدول. يمكن استيراد المحتوى وتصديره.',
    es: 'El CMS gestiona páginas localizadas con secciones de contenido JSON tipadas, menús de navegación, versionado de páginas y publicación programada. El contenido puede importarse y exportarse. Las rutas llevan el prefijo de la locale (`/fr/`, `/en/`, `/es/`, `/ar/`).',
  };

export async function generateCMS(lang: Lang, assigned: Set<string> = new Set()): Promise<string> {
  const s = i18n.sections;
  const sub = i18n.subsections;

  let out = `## ${s.cms[lang]}\n\n`;

  // ── Files ────────────────────────────────────────────────────────────────
  out += `### ${sub.files[lang]}\n\n`;
  out += '```\n';
  const pagesTree = await listTree(PATHS.pages, 0, 2);
  if (pagesTree) out += `src/pages/\n${pagesTree}`;
  const layoutsTree = await listTree(PATHS.layouts);
  if (layoutsTree) out += `src/layouts/\n${layoutsTree}`;
  out += '```\n\n';

  out += `${DESCRIPTION[lang]}\n\n`;

  // ── Tests ────────────────────────────────────────────────────────────────
  const testFiles = await claimTestsByPattern([
    'cms-admin', 'cms-audit', 'admin-pages', 'admin-navigation',
    'admin-versions', 'admin-sections', 'admin-menus', 'admin-site',
    'admin-social', 'admin-contact', 'admin-hours', 'admin-theme',
    'admin-consent', 'admin-roles', 'admin-helpers',
    'content-import', 'content-locking', 'export-data',
    'navigation-menus', 'navigation-tree', 'navigation-cycle',
    'contact-api', 'consent-cms', 'legal-cms', 'media-loader',
  ], assigned);
  if (testFiles.length > 0) {
    out += `### ${sub.tests[lang]}\n\n`;
    for (const f of testFiles) out += `- \`${f}\`\n`;
    out += '\n';
  }

  return out;
}
