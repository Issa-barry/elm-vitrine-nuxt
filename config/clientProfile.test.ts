import { describe, expect, it } from "vitest";
import { buildIdentityPatch } from "./clientProfile";

const current = { prenom: "Ya Moussa", nom: "CAMARA", email: "ya@example.com" };

describe("buildIdentityPatch", () => {
  it("n'envoie rien quand rien n'a changé", () => {
    expect(buildIdentityPatch({ prenom: " Ya Moussa ", nom: "CAMARA", email: "YA@example.com" }, current)).toEqual({});
  });

  it("n'envoie que les champs modifiés", () => {
    expect(buildIdentityPatch({ prenom: "Moussa", nom: "CAMARA", email: "ya@example.com" }, current)).toEqual({
      prenom: "Moussa",
    });
  });

  it("permet de renseigner l'e-mail sans toucher à un prénom et un nom vides", () => {
    expect(
      buildIdentityPatch({ prenom: "", nom: "", email: "ya@example.com" }, { prenom: null, nom: null, email: null }),
    ).toEqual({ email: "ya@example.com" });
  });

  it("envoie un champ vidé pour que le backend le refuse", () => {
    expect(buildIdentityPatch({ prenom: "", nom: "CAMARA", email: "" }, current)).toEqual({ prenom: "", email: "" });
  });
});
