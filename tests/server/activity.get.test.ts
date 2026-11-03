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
        date_debut: undefined,
        date_fin: undefined,
        per_page: "50",
        page: "2",
      },
    });
  });
});
