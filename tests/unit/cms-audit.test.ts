import { describe, it, expect } from 'vitest';
import type { AuditAction } from '@lib/audit';

describe('AuditAction type — CMS actions', () => {
  // This test validates that the CMS-related audit actions compile correctly.
  // If the type is missing an action, TS will fail at compile time.
  const cmsActions: AuditAction[] = [
    'SITE_SETTINGS_UPDATE',
    'SOCIAL_LINK_CREATE',
    'SOCIAL_LINK_UPDATE',
    'SOCIAL_LINK_DELETE',
    'CONTACT_INFO_UPDATE',
    'OPENING_HOURS_UPDATE',
    'NAVIGATION_ITEM_CREATE',
    'NAVIGATION_ITEM_UPDATE',
    'NAVIGATION_ITEM_DELETE',
    'THEME_UPDATE',
    'THEME_CREATE',
    'THEME_DELETE',
  ];

  it('has all CMS audit actions defined', () => {
    expect(cmsActions.length).toBe(12);
    cmsActions.forEach((action) => {
      expect(action).toBeTypeOf('string');
    });
  });
});
