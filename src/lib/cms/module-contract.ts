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

export interface AtomicModuleDefinition<
  TEntity extends object = object,
  TFilter extends object = object,
> {
  readonly id: string;
  readonly entity: string;
  readonly capabilities: Readonly<AtomicModuleCapabilities>;
  readonly entityType: TEntity;
  readonly filterType: TFilter;
}

export type ModuleCapability = keyof AtomicModuleCapabilities;

export function defineModuleCapabilities<const T extends AtomicModuleCapabilities>(
  capabilities: T,
): Readonly<T> {
  return capabilities;
}
