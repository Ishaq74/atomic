import { updateSiteSettings, upsertSiteSettings } from "./admin/site";
import {
  createSocialLink,
  updateSocialLink,
  deleteSocialLink,
  reorderSocialLinks,
} from "./admin/social";
import { updateContactInfo } from "./admin/contact";
import { updateOpeningHours } from "./admin/hours";
import {
  createNavigationMenu,
  updateNavigationMenu,
  deleteNavigationMenu,
} from "./admin/menus";
import {
  createNavigationItem,
  updateNavigationItem,
  deleteNavigationItem,
  reorderNavigationItems,
} from "./admin/navigation";
import {
  createPage,
  updatePage,
  deletePage,
  publishPage,
  schedulePage,
  unschedulePage,
  scheduleUnpublishPage,
  unscheduleUnpublishPage,
  restoreFromTrash,
  permanentlyDeletePage,
  bulkPublishPages,
  bulkArchivePages,
  bulkRestorePages,
  bulkDeletePages,
  clonePage,
  lockPage,
  unlockPage,
} from "./admin/pages";
import {
  createSection,
  updateSection,
  deleteSection,
  reorderSections,
} from "./admin/sections";
import { createTheme, updateTheme, deleteTheme } from "./admin/theme";
import { updateConsentSettings } from "./admin/consent";
import {
  createMediaFolder,
  updateMediaFolder,
  deleteMediaFolder,
  uploadMediaFile,
  renameMediaFile,
  moveMediaFile,
  deleteMediaFile,
  upsertMediaFileAlt,
  deleteMediaFileAlt,
} from "./admin/media";
import {
  createPageVersion,
  listPageVersions,
  restorePageVersion,
} from "./admin/versions";
import {
  listOrgRoles,
  createOrgRole,
  updateOrgRole,
  deleteOrgRole,
  updateMemberRole,
} from "./admin/roles";
import {
  orgListRoles,
  orgCreateRole,
  orgUpdateRole,
  orgDeleteRole,
  orgUpdateMemberRole,
} from "./org/roles";

export const server = {
  // ─── Site ────────────────────────────────────────────────────────
  updateSiteSettings,
  upsertSiteSettings,

  // ─── Réseaux sociaux ─────────────────────────────────────────────
  createSocialLink,
  updateSocialLink,
  deleteSocialLink,
  reorderSocialLinks,

  // ─── Contact ─────────────────────────────────────────────────────
  updateContactInfo,

  // ─── Horaires ────────────────────────────────────────────────────
  updateOpeningHours,

  // ─── Navigation (menus) ──────────────────────────────────────────
  createNavigationMenu,
  updateNavigationMenu,
  deleteNavigationMenu,

  // ─── Navigation (items) ──────────────────────────────────────────
  createNavigationItem,
  updateNavigationItem,
  deleteNavigationItem,
  reorderNavigationItems,

  // ─── Pages ───────────────────────────────────────────────────────
  createPage,
  updatePage,
  deletePage,
  publishPage,
  schedulePage,
  unschedulePage,
  scheduleUnpublishPage,
  unscheduleUnpublishPage,
  restoreFromTrash,
  permanentlyDeletePage,
  bulkPublishPages,
  bulkArchivePages,
  bulkRestorePages,
  bulkDeletePages,
  clonePage,
  lockPage,
  unlockPage,

  // ─── Sections ────────────────────────────────────────────────────
  createSection,
  updateSection,
  deleteSection,
  reorderSections,

  // ─── Thème ───────────────────────────────────────────────────────
  createTheme,
  updateTheme,
  deleteTheme,

  // ─── Consentement cookies ────────────────────────────────────────
  updateConsentSettings,

  // ─── Média ───────────────────────────────────────────────────────
  createMediaFolder,
  updateMediaFolder,
  deleteMediaFolder,
  uploadMediaFile,
  renameMediaFile,
  moveMediaFile,
  deleteMediaFile,
  upsertMediaFileAlt,
  deleteMediaFileAlt,

  // ─── Versioning pages ────────────────────────────────────────────
  createPageVersion,
  listPageVersions,
  restorePageVersion,

  // ─── Rôles (RBAC org — admin) ─────────────────────────────────────
  listOrgRoles,
  createOrgRole,
  updateOrgRole,
  deleteOrgRole,
  updateMemberRole,

  // ─── Rôles (RBAC org — owner/admin) ──────────────────────────────
  orgListRoles,
  orgCreateRole,
  orgUpdateRole,
  orgDeleteRole,
  orgUpdateMemberRole,
};
