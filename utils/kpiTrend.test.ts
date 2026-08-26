import { describe, expect, it } from "vitest";
import { computeKpiTrend, formatKpiTrendPercent, roundKpiTrendPercent } from "./kpiTrend";

describe("formatKpiTrendPercent", () => {
  it("affiche un entier sans décimale", () => {
    expect(formatKpiTrendPercent(12)).toBe("+12%");
    expect(formatKpiTrendPercent(-3)).toBe("-3%");
  });

  it("masque la décimale quand l'arrondi tombe sur un entier", () => {
    expect(formatKpiTrendPercent(12.04)).toBe("+12%");
  });

  it("garde 1 décimale utile, avec la virgule française", () => {
    expect(formatKpiTrendPercent(12.36)).toBe("+12,4%");
    expect(formatKpiTrendPercent(-3.26)).toBe("-3,3%");
  });

  it("n'affiche jamais plus d'1 décimale", () => {
    expect(formatKpiTrendPercent(12.428571)).toBe("+12,4%");
  });

  it("0 et -0 s'affichent tous les deux '0%', sans signe", () => {
    expect(formatKpiTrendPercent(0)).toBe("0%");
    expect(formatKpiTrendPercent(-0)).toBe("0%");
  });

  it("une valeur qui s'arrondit à 0 s'affiche aussi '0%'", () => {
    expect(formatKpiTrendPercent(0.02)).toBe("0%");
    expect(formatKpiTrendPercent(-0.02)).toBe("0%");
  });
});

describe("roundKpiTrendPercent", () => {
  it("arrondit mathématiquement, pas une troncature", () => {
    expect(roundKpiTrendPercent(12.36)).toBe(12.4);
    expect(roundKpiTrendPercent(12.34)).toBe(12.3);
  });

  it("normalise -0 en 0", () => {
    expect(Object.is(roundKpiTrendPercent(-0.02), -0)).toBe(false);
    expect(roundKpiTrendPercent(-0.02)).toBe(0);
  });
});

describe("computeKpiTrend", () => {
  it("calcule ((actuelle - précédente) / précédente) * 100", () => {
    const trend = computeKpiTrend(124, 100);
    expect(trend).not.toBeNull();
    expect(trend!.percent).toBeCloseTo(24, 10);
    expect(trend!.tone).toBe("positive");
  });

  it("détecte une baisse (tone négatif par défaut)", () => {
    const trend = computeKpiTrend(76, 100);
    expect(trend!.percent).toBeCloseTo(-24, 10);
    expect(trend!.tone).toBe("negative");
  });

  it("inverse le tone quand invertTone est vrai (ex. Dépenses)", () => {
    const rise = computeKpiTrend(124, 100, true);
    expect(rise!.tone).toBe("negative");
    const fall = computeKpiTrend(76, 100, true);
    expect(fall!.tone).toBe("positive");
  });

  it("retourne null quand la période précédente vaut 0 (pas de pourcentage inventé)", () => {
    expect(computeKpiTrend(100, 0)).toBeNull();
  });

  it("retourne null quand les deux périodes valent 0", () => {
    expect(computeKpiTrend(0, 0)).toBeNull();
  });

  it("calcule une vraie variation quand la valeur actuelle vaut 0", () => {
    const trend = computeKpiTrend(0, 100);
    expect(trend!.percent).toBeCloseTo(-100, 10);
    expect(trend!.tone).toBe("negative");
  });

  it("gère une valeur actuelle négative", () => {
    const trend = computeKpiTrend(-50, 100);
    expect(trend!.percent).toBeCloseTo(-150, 10);
  });

  it("ne produit jamais NaN ni Infinity : retourne null à la place", () => {
    expect(computeKpiTrend(Number.NaN, 100)).toBeNull();
    expect(computeKpiTrend(100, Number.NaN)).toBeNull();
    expect(computeKpiTrend(Number.POSITIVE_INFINITY, 100)).toBeNull();
    expect(computeKpiTrend(100, Number.POSITIVE_INFINITY)).toBeNull();
  });
});
