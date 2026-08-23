/** Capabilities that a first-class Atomic module may opt into. */
export interface AtomicModuleCapabilities {
  localization: boolean;
  media: boolean;
  seo: boolean;
  taxonomy: boolean;
  search: boolean;
  publication: boolean;
  revisions: boolean;
  locks: boolean;
  moderation: boolean;
  notifications: boolean;
  audit: boolean;
}

/**
 * Domain modules own entities and semantics. Platform capabilities are shared
 * and explicitly opted into. Runtime module definitions contain no phantom
 * values used only to satisfy TypeScript generics.
 */
export interface AtomicModuleDefinition {
  readonly id: string;
  readonly entity: string;
  readonly capabilities: Readonly<AtomicModuleCapabilities>;
}

export type ModuleCapability = keyof AtomicModuleCapabilities;

export function defineModuleCapabilities<const T extends AtomicModuleCapabilities>(
  capabilities: T,
): Readonly<T> {
  return capabilities;
}
