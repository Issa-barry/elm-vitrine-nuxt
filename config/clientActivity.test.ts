import { describe, expect, it } from "vitest";
import { activityTypeLabel } from "./clientActivity";

describe("activityTypeLabel", () => {
  it("traduit le type réel, jamais le statut", () => {
    expect(activityTypeLabel("vente")).toBe("Vente");
    expect(activityTypeLabel("logistique")).toBe("Logistique");
  });
});
