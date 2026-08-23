export type AdminFilterKind = "search" | "select" | "multi-select" | "boolean" | "date" | "number-range";

export interface AdminResourceFilterDefinition {
  readonly id: string;
  readonly kind: AdminFilterKind;
  readonly queryParam: string;
  readonly multiple?: boolean;
}

export interface AdminResourceSortDefinition {
  readonly id: string;
  readonly queryParam: string;
  readonly directions: readonly ("asc" | "desc")[];
}

export interface AdminResourceListDefinition {
  readonly filters?: readonly AdminResourceFilterDefinition[];
  readonly sorts?: readonly AdminResourceSortDefinition[];
  readonly defaultSort?: string;
}

export function assertAdminResourceListDefinition(definition: AdminResourceListDefinition): void {
  const filterIds = new Set<string>();
  for (const filter of definition.filters ?? []) {
    if (!filter.id.trim() || !filter.queryParam.trim()) throw new Error("Admin filter requires id and queryParam");
    if (filterIds.has(filter.id)) throw new Error(`Duplicate admin filter: ${filter.id}`);
    filterIds.add(filter.id);
  }
  const sortIds = new Set<string>();
  for (const sort of definition.sorts ?? []) {
    if (!sort.id.trim() || !sort.queryParam.trim()) throw new Error("Admin sort requires id and queryParam");
    if (sort.directions.length === 0) throw new Error(`Sort ${sort.id} must define at least one direction`);
    if (sortIds.has(sort.id)) throw new Error(`Duplicate admin sort: ${sort.id}`);
    sortIds.add(sort.id);
  }
  if (definition.defaultSort && !sortIds.has(definition.defaultSort)) {
    throw new Error(`Unknown default admin sort: ${definition.defaultSort}`);
  }
}
