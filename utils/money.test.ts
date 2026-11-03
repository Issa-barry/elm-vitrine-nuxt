import { describe, expect, it } from "vitest";
import { formatGnf, formatNumber } from "./money";

describe("formatGnf", () => {
  it("formate un montant avec séparateur de milliers fr-FR et suffixe GNF", () => {
    expect(formatGnf(1_250_000)).toBe(`${new Intl.NumberFormat("fr-FR").format(1_250_000)} GNF`);
  });

  it("affiche 0 GNF pour un montant nul (jamais un tiret)", () => {
    expect(formatGnf(0)).toBe("0 GNF");
  });

  it("gère les petits montants sans séparateur", () => {
    expect(formatGnf(500)).toBe("500 GNF");
  });
});

describe("formatNumber", () => {
  it("formate sans suffixe", () => {
    expect(formatNumber(12)).toBe(new Intl.NumberFormat("fr-FR").format(12));
  });
});
