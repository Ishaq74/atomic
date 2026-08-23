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

export interface AdminResourceDefinition<
  TFilter extends object = object,
  TRow extends object = object,
> {
  readonly id: string;
  readonly entity: string;
  readonly actions: Readonly<ResourceCapabilities>;
  readonly presentation?: Readonly<ResourcePresentationVariants>;
  readonly filterType?: TFilter;
  readonly rowType?: TRow;
}

export type ResourceActionResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string };
