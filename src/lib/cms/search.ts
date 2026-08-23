export interface ResourceSearchState {
  readonly page: number;
  readonly query: string;
  readonly sort?: string;
  readonly order: "asc" | "desc";
  readonly filters: Readonly<Record<string, string | boolean | undefined>>;
}

export function normalizeResourceSearchState(
  input: Partial<ResourceSearchState>,
): ResourceSearchState {
  const page = Number.isFinite(input.page) ? Math.max(1, Math.trunc(input.page ?? 1)) : 1;
  const order = input.order === "asc" ? "asc" : "desc";
  const query = (input.query ?? "").trim();
  const filters = Object.fromEntries(
    Object.entries(input.filters ?? {}).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value]),
  );
  return { page, query, sort: input.sort, order, filters };
}

export function withPage(state: ResourceSearchState, page: number): ResourceSearchState {
  return { ...state, page: Math.max(1, Math.trunc(page)) };
}
