import { beforeEach, describe, expect, it, vi } from "vitest";

const callMonolith = vi.fn();

vi.mock("../../server/utils/monolithClient", () => ({ callMonolith }));
vi.mock("../../server/utils/authSession", () => ({
  clearAuthSession: vi.fn(),
  getSessionToken: vi.fn(async () => "token-test"),
}));

// Globals Nitro, auto-importés hors de vitest.
vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
vi.stubGlobal("createError", (input: unknown) => input);
vi.stubGlobal("getQuery", (event: { query: Record<string, unknown> }) => event.query);

describe("GET /api/client/activity", () => {
  beforeEach(() => callMonolith.mockReset());

  it("transmet la période et les autres filtres au backend", async () => {
    const { default: handler } = await import("../../server/api/client/activity.get");
    callMonolith.mockResolvedValue({ data: [] });

    await (handler as unknown as (event: unknown) => Promise<unknown>)({
      query: { periode: "cette_semaine", type: "vente", vehicule_id: "veh-1", per_page: "50", page: "2" },
    });

    expect(callMonolith).toHaveBeenCalledWith("/api/v1/mobile/activite", {
      token: "token-test",
      query: {
        type: "vente",
        vehicule_id: "veh-1",
        periode: "cette_semaine",
        annee: undefined,
        mois: undefined,
        quinzaine: undefined,
        date_debut: undefined,
        date_fin: undefined,
        per_page: "50",
        page: "2",
      },
    });
  });
});

describe("GET /api/client/dashboard — période rapide", () => {
  beforeEach(() => callMonolith.mockReset());

  it("transmet la clé au backend, sans calculer de bornes", async () => {
    const { default: handler } = await import("../../server/api/client/dashboard.get");
    callMonolith.mockResolvedValue({ summary: {} });

    await (handler as unknown as (event: unknown) => Promise<unknown>)({ query: { periode: "annee_precedente" } });

    expect(callMonolith).toHaveBeenCalledWith("/api/v1/mobile/dashboard", {
      token: "token-test",
      query: expect.objectContaining({ periode: "annee_precedente", date_debut: undefined, date_fin: undefined }),
    });
  });
});

describe.each([
  ["activity", "/api/v1/mobile/activite"],
  ["dashboard", "/api/v1/mobile/dashboard"],
  ["expenses", "/api/v1/mobile/depenses/mine"],
])("GET /api/client/%s — période comptable", (route, backend) => {
  beforeEach(() => callMonolith.mockReset());

  it("transmet annee, mois et quinzaine au backend, sans calculer de bornes", async () => {
    const { default: handler } = await import(`../../server/api/client/${route}.get.ts`);
    callMonolith.mockResolvedValue({ data: [] });

    await (handler as unknown as (event: unknown) => Promise<unknown>)({
      query: { annee: "2026", mois: "11", quinzaine: "P1" },
    });

    expect(callMonolith).toHaveBeenCalledWith(backend, {
      token: "token-test",
      query: expect.objectContaining({ annee: "2026", mois: "11", quinzaine: "P1", date_debut: undefined, date_fin: undefined }),
    });
  });
});
