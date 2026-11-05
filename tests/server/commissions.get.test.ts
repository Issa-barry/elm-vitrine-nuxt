import { beforeEach, describe, expect, it, vi } from "vitest";

const callMonolith = vi.fn();
const getSessionToken = vi.fn(async () => "token-test" as string | null);
const clearAuthSession = vi.fn();

vi.mock("../../server/utils/monolithClient", () => ({ callMonolith }));
vi.mock("../../server/utils/authSession", () => ({ clearAuthSession, getSessionToken }));

// Globals Nitro, auto-importés hors de vitest.
vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
vi.stubGlobal("createError", (input: unknown) => input);
vi.stubGlobal("getQuery", (event: { query: Record<string, unknown> }) => event.query);

type Handler = (event: unknown) => Promise<unknown>;

describe("GET /api/client/commissions", () => {
  beforeEach(() => {
    callMonolith.mockReset();
    clearAuthSession.mockReset();
    getSessionToken.mockResolvedValue("token-test");
  });

  it("transmet période, activité, statut, recherche et pagination tels quels", async () => {
    const { default: handler } = await import("../../server/api/client/commissions.get");
    callMonolith.mockResolvedValue({ data: [] });

    await (handler as unknown as Handler)({
      query: { annee: "2026", mois: "10", quinzaine: "P2", vehicule_id: "veh-c", activite: "parrain", statut: "annulee", recherche: "CC-003", per_page: "20", page: "2" },
    });

    expect(callMonolith).toHaveBeenCalledWith("/api/v1/mobile/commissions", {
      token: "token-test",
      query: {
        periode: undefined,
        annee: "2026",
        mois: "10",
        quinzaine: "P2",
        date_debut: undefined,
        date_fin: undefined,
        vehicule_id: "veh-c",
        activite: "parrain",
        statut: "annulee",
        recherche: "CC-003",
        per_page: "20",
        page: "2",
      },
    });
  });

  it("refuse une requête sans session", async () => {
    const { default: handler } = await import("../../server/api/client/commissions.get");
    getSessionToken.mockResolvedValue(null);

    await expect((handler as unknown as Handler)({ query: {} })).rejects.toMatchObject({ statusCode: 401 });
    expect(callMonolith).not.toHaveBeenCalled();
  });

  it("invalide la session sur un 401 du backend, jamais sur un 403", async () => {
    const { default: handler } = await import("../../server/api/client/commissions.get");

    callMonolith.mockRejectedValueOnce({ statusCode: 403 });
    await expect((handler as unknown as Handler)({ query: {} })).rejects.toMatchObject({ statusCode: 403 });
    expect(clearAuthSession).not.toHaveBeenCalled();

    callMonolith.mockRejectedValueOnce({ statusCode: 401 });
    await expect((handler as unknown as Handler)({ query: {} })).rejects.toMatchObject({ statusCode: 401 });
    expect(clearAuthSession).toHaveBeenCalledTimes(1);
  });
});

describe("GET /api/client/vehicles/rattaches", () => {
  beforeEach(() => callMonolith.mockReset());

  it("lit la liste des véhicules rattachés, jamais la liste mobile", async () => {
    const { default: handler } = await import("../../server/api/client/vehicles/rattaches.get");
    callMonolith.mockResolvedValue([]);

    await (handler as unknown as Handler)({ query: {} });

    expect(callMonolith).toHaveBeenCalledWith("/api/v1/mobile/vehicules/rattaches", { token: "token-test" });
  });
});
