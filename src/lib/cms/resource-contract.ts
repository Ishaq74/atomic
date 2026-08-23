import type { AtomicModuleDefinition } from "./module-contract";
import type { AdminResourceListDefinition } from "@/core/admin/filter-contract";

export type ResourceAction =
  | "create"
  | "read"
  | "update"
  | "duplicate"
  | "publish"
  | "unpublish"
  | "archive"
  | "restore"
  | "delete";

export interface ResourcePresentationVariants {
  readonly card?: readonly string[];
  readonly list?: readonly string[];
  readonly single?: readonly string[];
}

/** Product-management capabilities shared by every admin resource. */
export interface ResourceManagementCapabilities {
  readonly list?: boolean;
  readonly search?: boolean;
  readonly filters?: boolean;
  readonly sort?: boolean;
  readonly pagination?: boolean;
  readonly stats?: boolean;
}

export interface ResourceActionCapabilities {
  readonly create?: boolean;
  readonly read?: boolean;
  readonly update?: boolean;
  readonly duplicate?: boolean;
  readonly publish?: boolean;
  readonly unpublish?: boolean;
  readonly archive?: boolean;
  readonly restore?: boolean;
  readonly delete?: boolean;
  readonly bulk?: boolean;
}

export interface AdminResourceDefinition {
  readonly id: string;
  readonly entity: string;
  readonly management: Readonly<ResourceManagementCapabilities>;
  readonly actions: Readonly<ResourceActionCapabilities>;
  readonly presentation?: Readonly<ResourcePresentationVariants>;
  readonly list?: Readonly<AdminResourceListDefinition>;
  /** Permission namespace used by the domain's existing RBAC adapter. */
  readonly permissionNamespace?: string;
}

const ACTION_CAPABILITY_REQUIREMENTS: Readonly<Partial<Record<keyof ResourceActionCapabilities, keyof AtomicModuleDefinition["capabilities"]>>> = {
  publish: "publication",
  unpublish: "publication",
  archive: "publication",
  restore: "publication",
};

export function assertResourceCompatibility(
  module: AtomicModuleDefinition,
  resource: AdminResourceDefinition,
): void {
  if (module.entity !== resource.entity) {
    throw new Error(`Resource ${resource.id} targets ${resource.entity}, but module ${module.id} owns ${module.entity}.`);
  }

  for (const [action, capability] of Object.entries(ACTION_CAPABILITY_REQUIREMENTS)) {
    if (resource.actions[action as keyof ResourceActionCapabilities] === true && module.capabilities[capability! as keyof AtomicModuleDefinition["capabilities"]] !== true) {
      throw new Error(`Resource ${resource.id} enables ${action}, but module ${module.id} does not enable ${capability}.`);
    }
  }

  if (resource.management.filters && !resource.management.list) throw new Error(`Resource ${resource.id} enables filters without list capability.`);
  if (resource.management.search && !resource.management.list) throw new Error(`Resource ${resource.id} enables search without list capability.`);
  if (resource.management.sort && !resource.management.list) throw new Error(`Resource ${resource.id} enables sort without list capability.`);
  if (resource.management.pagination && !resource.management.list) throw new Error(`Resource ${resource.id} enables pagination without list capability.`);

  if (resource.list?.defaultSort && !resource.management.sort) {
    throw new Error(`Resource ${resource.id} defines a default sort without sort capability.`);
  }
  if (resource.list && !resource.management.list) {
    throw new Error(`Resource ${resource.id} defines list configuration without list capability.`);
  }
}
