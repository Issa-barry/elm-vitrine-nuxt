import { describe, expect, it } from "vitest";
import { formatPhoneNumber } from "./phone";

describe("formatPhoneNumber", () => {
  it("formate un numéro guinéen réel (3-2-2-2, cas vérifié en conditions réelles le 26/08/2026)", () => {
    expect(formatPhoneNumber("+224622602693")).toBe("+224 622 60 26 93");
  });

  it("regroupe en 2-2-2-2 quand le nombre de chiffres locaux est pair", () => {
    // +223 (Mali) : 8 chiffres locaux dans ce site (voir pages/connexion.vue).
    expect(formatPhoneNumber("+22312345678")).toBe("+223 12 34 56 78");
  });

  it("le premier groupe absorbe le chiffre impair restant", () => {
    // +225 (Côte d'Ivoire) : 10 chiffres locaux -> 2-2-2-2-2, pas de reste impair.
    expect(formatPhoneNumber("+2250102030405")).toBe("+225 01 02 03 04 05");
  });

  it("reconnaît l'indicatif le plus long en priorité (+971 pas confondu avec un préfixe plus court)", () => {
    expect(formatPhoneNumber("+971501234567")).toBe("+971 501 23 45 67");
  });

  it("retourne la valeur telle quelle si l'indicatif n'est pas reconnu", () => {
    expect(formatPhoneNumber("+9990000000")).toBe("+9990000000");
  });

  it("retourne la valeur telle quelle si elle ne commence pas par +", () => {
    expect(formatPhoneNumber("622602693")).toBe("622602693");
  });

  it("gère les entrées vides/absentes sans lever d'erreur", () => {
    expect(formatPhoneNumber("")).toBe("");
    expect(formatPhoneNumber(null)).toBe("");
    expect(formatPhoneNumber(undefined)).toBe("");
  });

  it("retourne juste l'indicatif si aucun chiffre local ne suit", () => {
    expect(formatPhoneNumber("+224")).toBe("+224");
  });
});
