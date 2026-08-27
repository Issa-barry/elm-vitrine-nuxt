// Forme commune de pagination Laravel standard, partagée par
// GET /v1/mobile/depenses/mine, /activite et /commandes/mine (voir
// docs/api-espace-client-contract.md côté elm-monolithe, §4/§5/§6) — même
// clés `links`/`meta` dans les 3, seul le type de `data` et de `filters`
// change par endpoint (voir config/clientExpenses.ts, clientActivity.ts,
// clientOrders.ts).
export interface PaginationLinks {
  first: string | null;
  last: string | null;
  prev: string | null;
  next: string | null;
}

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface PaginatedResponse<TItem, TFilters> {
  data: TItem[];
  links: PaginationLinks;
  meta: PaginationMeta;
  filters: TFilters;
}
