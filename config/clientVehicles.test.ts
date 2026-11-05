import { describe, expect, it } from "vitest";
import { vehicleTeamRoleLabel, vehiculeRechercheTexte } from "./clientVehicles";

const parraine = {
  nom: "C-parraine",
  immatriculation: "CC-003",
  type: "Camion",
  proprietaire: { id: null, nom_complet: "Mamadou BAH", telephone: null },
  liens: ["parrain" as const],
};

describe("recherche de la page Véhicules", () => {
  it("cherche dans l'identité du véhicule et le conducteur", () => {
    const texte = vehiculeRechercheTexte({ ...parraine, liens: ["proprietaire"] }, "Alpha Diallo");
    expect(texte).toContain("c-parraine");
    expect(texte).toContain("cc-003");
    expect(texte).toContain("camion");
    expect(texte).toContain("alpha diallo");
  });

  it("retrouve un véhicule parrainé par le nom de son propriétaire et par la nature du lien", () => {
    const texte = vehiculeRechercheTexte(parraine, null);
    expect(texte).toContain("mamadou bah");
    expect(texte).toContain("parrain");
  });

  it("couvre chaque lien d'un véhicule rattaché plusieurs fois", () => {
    const texte = vehiculeRechercheTexte({ ...parraine, liens: ["proprietaire", "parrain"] }, null);
    expect(texte).toContain("propriétaire");
    expect(texte).toContain("parrain");
  });

  it("ignore un propriétaire absent sans casser la recherche", () => {
    expect(vehiculeRechercheTexte({ ...parraine, proprietaire: null }, null)).toBe("c-parraine cc-003 camion parrain");
  });
});

describe("rôle d'équipe", () => {
  it("traduit les rôles connus et garde une valeur future lisible", () => {
    expect(vehicleTeamRoleLabel("chauffeur")).toBe("Chauffeur");
    expect(vehicleTeamRoleLabel("aide")).toBe("Aide");
  });
});
