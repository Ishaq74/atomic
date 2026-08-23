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
 * Standard presentation grammar for first-class modules.
 * The concrete components stay domain-specific; these names describe the
 * supported projection roles used by public, search and admin experiences.
 */
export interface AtomicModulePresentations {
  readonly card: readonly string[];
  readonly list: readonly string[];
  readonly single: readonly string[];
  readonly ui: readonly string[];
}

/**
 * Domain modules own entities and semantics. Platform capabilities are shared
 * and explicitly opted into. Runtime module definitions stay deliberately
 * small and contain no phantom generic values.
 */
export interface AtomicModuleDefinition {
  readonly id: string;
  readonly entity: string;
  readonly capabilities: Readonly<AtomicModuleCapabilities>;
  readonly presentations: Readonly<AtomicModulePresentations>;
}

export type ModuleCapability = keyof AtomicModuleCapabilities;

export function defineModuleCapabilities<const T extends AtomicModuleCapabilities>(
  capabilities: T,
): Readonly<T> {
  return capabilities;
}

export function defineModulePresentations<const T extends AtomicModulePresentations>(
  presentations: T,
): Readonly<T> {
  return presentations;
}
