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
vi.stubGlobal("getRouterParam", (event: { params: Record<string, string> }, name: string) => event.params?.[name]);

describe("GET /api/client/activity", () => {
  beforeEach(() => callMonolith.mockReset());

  it("transmet la période et les autres filtres au backend", async () => {
    const { default: handler } = await import("../../server/api/client/activity.get");
    callMonolith.mockResolvedValue({ data: [] });

    await (handler as unknown as (event: unknown) => Promise<unknown>)({
      query: { periode: "cette_semaine", type: "vente", lien: "livreur", vehicule_id: "veh-1", per_page: "50", page: "2", statut: "cloturee" },
    });

    expect(callMonolith).toHaveBeenCalledWith("/api/v1/mobile/activite", {
      token: "token-test",
      query: {
        type: "vente",
        lien: "livreur",
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

describe("GET /api/client/activity/{type}/{id}", () => {
  beforeEach(() => callMonolith.mockReset());

  const appeler = async (params: Record<string, string>) => {
    const { default: handler } = await import("../../server/api/client/activity/[type]/[id].get");
    return (handler as unknown as (event: unknown) => Promise<unknown>)({ params });
  };

  it("relaie le détail d'une vente ou d'un transfert au backend", async () => {
    callMonolith.mockResolvedValue({ data: { id: "v-1" } });

    await expect(appeler({ type: "vente", id: "v-1" })).resolves.toEqual({ data: { id: "v-1" } });
    expect(callMonolith).toHaveBeenCalledWith("/api/v1/mobile/activite/vente/v-1", { token: "token-test" });

    await appeler({ type: "logistique", id: "t/../1" });
    expect(callMonolith).toHaveBeenLastCalledWith("/api/v1/mobile/activite/logistique/t%2F..%2F1", { token: "token-test" });
  });

  it("refuse un type inconnu sans appeler le backend", async () => {
    await expect(appeler({ type: "commissions", id: "x" })).rejects.toMatchObject({ statusCode: 404 });
    expect(callMonolith).not.toHaveBeenCalled();
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
