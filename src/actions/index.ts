import { updateSiteSettings } from "./admin/site";
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
} from "./admin/pages";
import {
  createSection,
  updateSection,
  deleteSection,
  reorderSections,
} from "./admin/sections";
import { createTheme, updateTheme, deleteTheme } from "./admin/theme";

export const server = {
  // ─── Site ────────────────────────────────────────────────────────
  updateSiteSettings,

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

  // ─── Sections ────────────────────────────────────────────────────
  createSection,
  updateSection,
  deleteSection,
  reorderSections,

  // ─── Thème ───────────────────────────────────────────────────────
  createTheme,
  updateTheme,
  deleteTheme,
};
