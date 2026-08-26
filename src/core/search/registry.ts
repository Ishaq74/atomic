import type { SearchResourceDefinition } from "./contract";
import { assertSearchResourceDefinition } from "./contract";

const resources = new Map<string, SearchResourceDefinition>();

export function registerSearchResource(definition: SearchResourceDefinition): void {
  assertSearchResourceDefinition(definition);
  if (resources.has(definition.resourceId)) {
    throw new Error(`Search resource ${definition.resourceId} is already registered.`);
  }
  resources.set(definition.resourceId, Object.freeze({ ...definition, fields: Object.freeze([...definition.fields]) }));
}

export function getSearchResource(resourceId: string): SearchResourceDefinition | undefined {
  return resources.get(resourceId);
}

export function listSearchResources(): readonly SearchResourceDefinition[] {
  return Object.freeze([...resources.values()]);
}

export function resetSearchRegistryForTests(): void {
  resources.clear();
}
