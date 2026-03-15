import { eq, asc, and, isNull } from "drizzle-orm";
import { getDrizzle } from "@database/drizzle";
import { navigationMenus, navigationItems } from "@database/schemas";

export interface NavTreeItem {
  id: string;
  label: string;
  url: string | null;
  icon: string | null;
  openInNewTab: boolean;
  children: NavTreeItem[];
}

/**
 * Load a navigation menu by name and locale, returning a hierarchical tree.
 * Top-level items (parentId = null) are returned with their children nested.
 */
export async function getMenu(
  menuName: string,
  locale: string,
): Promise<NavTreeItem[]> {
  const db = getDrizzle();

  // Find the menu container
  const [menu] = await db
    .select()
    .from(navigationMenus)
    .where(eq(navigationMenus.name, menuName))
    .limit(1);

  if (!menu) return [];

  // Fetch all items for this menu + locale (flat)
  const items = await db
    .select()
    .from(navigationItems)
    .where(
      and(
        eq(navigationItems.menuId, menu.id),
        eq(navigationItems.locale, locale),
        eq(navigationItems.isActive, true),
      ),
    )
    .orderBy(asc(navigationItems.sortOrder));

  // Build tree from flat list
  const itemMap = new Map<string, NavTreeItem>();
  const roots: NavTreeItem[] = [];

  for (const item of items) {
    itemMap.set(item.id, {
      id: item.id,
      label: item.label,
      url: item.url,
      icon: item.icon,
      openInNewTab: item.openInNewTab,
      children: [],
    });
  }

  for (const item of items) {
    const node = itemMap.get(item.id)!;
    if (item.parentId && itemMap.has(item.parentId)) {
      itemMap.get(item.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}
