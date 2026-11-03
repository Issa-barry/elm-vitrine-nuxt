import { beforeEach, describe, expect, it, vi } from "vitest";

const callMonolith = vi.fn();
const clearAuthSession = vi.fn();
const getSessionToken = vi.fn(async (): Promise<string | null> => "token-test");

vi.mock("../../server/utils/monolithClient", () => ({ callMonolith }));
vi.mock("../../server/utils/authSession", () => ({ clearAuthSession, getSessionToken }));

// Globals Nitro, auto-importés hors de vitest.
vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
vi.stubGlobal("createError", (input: unknown) => input);
vi.stubGlobal("getQuery", (event: { query: Record<string, unknown> }) => event.query);

type Handler = (event: unknown) => Promise<unknown>;

describe("BFF espace parrain", () => {
  beforeEach(() => {
    callMonolith.mockReset();
    clearAuthSession.mockReset();
    getSessionToken.mockResolvedValue("token-test");
  });

  it("ne transmet que les filtres du contrat, jamais un identifiant de parrain", async () => {
    const { default: handler } = await import("../../server/api/client/parrain/commissions.get");
    callMonolith.mockResolvedValue({ data: [] });

    await (handler as unknown as Handler)({
      query: { vehicule_id: "veh-1", statut: "paye", date_debut: "2026-10-01", date_fin: "2026-10-31", per_page: "5", page: "2", parrain_id: "autre", beneficiaire_id: "autre" },
    });

    expect(callMonolith).toHaveBeenCalledWith("/api/v1/mobile/parrain/commissions", {
      token: "token-test",
      query: { vehicule_id: "veh-1", statut: "paye", date_debut: "2026-10-01", date_fin: "2026-10-31", per_page: "5", page: "2" },
    });
  });

  it("paiements : mêmes règles", async () => {
    const { default: handler } = await import("../../server/api/client/parrain/paiements.get");
    callMonolith.mockResolvedValue({ data: [] });

    await (handler as unknown as Handler)({ query: { page: "3", parrain_id: "autre" } });

    expect(callMonolith).toHaveBeenCalledWith("/api/v1/mobile/parrain/paiements", {
      token: "token-test",
      query: { date_debut: undefined, date_fin: undefined, per_page: undefined, page: "3" },
    });
  });

  it("refuse sans session, sans appeler Laravel", async () => {
    const { default: handler } = await import("../../server/api/client/parrain/synthese.get");
    getSessionToken.mockResolvedValue(null);

    await expect((handler as unknown as Handler)({})).rejects.toMatchObject({ statusCode: 401 });
    expect(callMonolith).not.toHaveBeenCalled();
  });

  it("un 404 de Laravel (compte détaché) ne ferme pas la session", async () => {
    const { default: handler } = await import("../../server/api/client/parrain/vehicules.get");
    callMonolith.mockRejectedValue({ statusCode: 404 });

    await expect((handler as unknown as Handler)({})).rejects.toMatchObject({ statusCode: 404 });
    expect(clearAuthSession).not.toHaveBeenCalled();
  });

  it("un 401 de Laravel ferme la session", async () => {
    const { default: handler } = await import("../../server/api/client/parrain/synthese.get");
    callMonolith.mockRejectedValue({ statusCode: 401 });

    await expect((handler as unknown as Handler)({})).rejects.toMatchObject({ statusCode: 401 });
    expect(clearAuthSession).toHaveBeenCalledOnce();
  });
});
