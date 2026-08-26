// Mise en forme d'affichage d'un numéro déjà normalisé E.164 par le backend
// (App\Services\PhoneNormalizer côté elm-monolithe — jamais stocké/renvoyé
// autrement, ex. "+224622602693") — ne fait AUCUNE validation ni
// normalisation elle-même, uniquement du regroupement visuel. Utilitaire
// partagé : à réutiliser partout où un numéro de téléphone réel est affiché
// sur le site (voir pages/espace-client/profil.vue), plutôt que de
// réimplémenter un formatage différent à chaque endroit.
//
// Indicatifs des pays déjà proposés par les sélecteurs de pays (pages/
// connexion.vue, pages/inscription.vue, pages/mot-de-passe-oublie.vue) — pas
// une liste exhaustive de tous les indicatifs existants, mais couvre les pays
// réellement sélectionnables sur ce site. Triés du plus long au plus court
// pour que "+971" ne matche jamais par erreur comme un indicatif "+9...".
const DIAL_CODES = [
  "+224",
  "+221",
  "+223",
  "+225",
  "+245",
  "+232",
  "+231",
  "+220",
  "+222",
  "+226",
  "+227",
  "+233",
  "+234",
  "+228",
  "+229",
  "+237",
  "+241",
  "+242",
  "+243",
  "+235",
  "+212",
  "+213",
  "+216",
  "+254",
  "+251",
  "+351",
  "+961",
  "+971",
  "+966",
  "+20",
  "+27",
  "+33",
  "+32",
  "+34",
  "+49",
  "+44",
  "+39",
  "+41",
  "+86",
  "+91",
  "+55",
  "+90",
  "+1",
].sort((a, b) => b.length - a.length);

/**
 * Formate un numéro E.164 pour l'affichage, ex. "+224622602693" ->
 * "+224 622 60 26 93". Regroupe les chiffres locaux par paires depuis la
 * gauche ; le premier groupe absorbe le chiffre impair restant s'il y en a
 * un (9 chiffres -> 3-2-2-2, 8 -> 2-2-2-2, 10 -> 2-2-2-2-2...).
 *
 * Ne devine jamais l'indicatif si le numéro ne commence pas par "+" ou si
 * aucun indicatif connu ne correspond : retourne alors la valeur telle
 * quelle plutôt qu'un regroupement arbitraire potentiellement trompeur.
 */
export function formatPhoneNumber(raw: string | null | undefined): string {
  if (!raw) return "";

  const trimmed = raw.trim();
  if (!trimmed.startsWith("+")) return trimmed;

  const dial = DIAL_CODES.find((code) => trimmed.startsWith(code));
  if (!dial) return trimmed;

  const digits = trimmed.slice(dial.length).replace(/\D/g, "");
  if (!digits) return dial;

  const firstGroupSize = digits.length % 2 === 0 ? 2 : 3;
  const groups = [digits.slice(0, firstGroupSize)];
  for (let i = firstGroupSize; i < digits.length; i += 2) {
    groups.push(digits.slice(i, i + 2));
  }

  return `${dial} ${groups.join(" ")}`;
}
