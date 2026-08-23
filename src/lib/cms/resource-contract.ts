import type { AtomicModuleDefinition } from "./module-contract";

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

export interface ResourceCapabilities {
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
  readonly actions: Readonly<ResourceCapabilities>;
  readonly presentation?: Readonly<ResourcePresentationVariants>;
}

export type ResourceActionResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string };

const ACTION_CAPABILITY_REQUIREMENTS: Readonly<Partial<Record<keyof ResourceCapabilities, keyof AtomicModuleDefinition["capabilities"]>>> = {
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
    if (resource.actions[action as keyof ResourceCapabilities] === true && module.capabilities[capability! as keyof AtomicModuleDefinition["capabilities"]] !== true) {
      throw new Error(`Resource ${resource.id} enables ${action}, but module ${module.id} does not enable ${capability}.`);
    }
  }
}
