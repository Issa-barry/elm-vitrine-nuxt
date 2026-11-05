import { describe, expect, it } from "vitest";
import { ACTIVITES, activiteIcon, activiteLabel, estActivite, ordonnerActivites, repartitionVisible } from "./clientActivites";

describe("activités du compte", () => {
  it("garde l'ordre du backend : propriétaire, livreur, parrain, consultant", () => {
    expect(ACTIVITES.map((a) => a.value)).toEqual(["proprietaire", "livreur", "parrain", "consultant"]);
  });

  it("donne un libellé et une icône par activité", () => {
    expect(activiteLabel("proprietaire")).toBe("Propriétaire");
    expect(activiteLabel("livreur")).toBe("Livreur");
    expect(activiteLabel("parrain")).toBe("Parrain");
    expect(activiteLabel("consultant")).toBe("Consultant");
    expect(activiteIcon("parrain")).toBe("pi pi-users");
  });

  it("affiche telle quelle une activité future inconnue", () => {
    expect(activiteLabel("site")).toBe("site");
    expect(activiteIcon("site")).toBe("pi pi-tag");
    expect(estActivite("site")).toBe(false);
    expect(estActivite("parrain")).toBe(true);
    expect(estActivite(null)).toBe(false);
  });

  it("n'affiche la répartition qu'à partir de deux activités", () => {
    expect(repartitionVisible(undefined)).toBe(false);
    expect(repartitionVisible([])).toBe(false);
    expect(repartitionVisible([{ activite: "proprietaire" }])).toBe(false);
    expect(repartitionVisible([{ activite: "proprietaire" }, { activite: "parrain" }])).toBe(true);
  });

  it("ordonne des liens sans doublon", () => {
    expect(ordonnerActivites(["parrain", "proprietaire", "parrain", "inconnu"])).toEqual(["proprietaire", "parrain"]);
  });
});
