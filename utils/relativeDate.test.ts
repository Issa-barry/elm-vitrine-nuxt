import { describe, expect, it } from "vitest";
import { formatRelativeDate } from "./relativeDate";

const NOW = new Date("2026-08-28T12:00:00Z");

describe("formatRelativeDate", () => {
  it("affiche \"À l'instant\" pour moins d'une minute", () => {
    expect(formatRelativeDate("2026-08-28T11:59:30Z", NOW)).toBe("À l'instant");
  });

  it("affiche les minutes en dessous d'une heure", () => {
    expect(formatRelativeDate("2026-08-28T11:55:00Z", NOW)).toBe("Il y a 5 min");
  });

  it("affiche les heures en dessous d'un jour", () => {
    expect(formatRelativeDate("2026-08-28T10:00:00Z", NOW)).toBe("Il y a 2 h");
  });

  it("affiche \"Hier\" pour un jour d'écart", () => {
    expect(formatRelativeDate("2026-08-27T10:00:00Z", NOW)).toBe("Hier");
  });

  it("affiche les jours en dessous d'une semaine", () => {
    expect(formatRelativeDate("2026-08-23T12:00:00Z", NOW)).toBe("Il y a 5 j");
  });

  it("retombe sur une date courte au-delà d'une semaine", () => {
    expect(formatRelativeDate("2026-08-01T09:00:00Z", NOW)).toBe(
      new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date("2026-08-01T09:00:00Z")),
    );
  });
});
