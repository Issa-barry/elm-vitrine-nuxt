// Copie openapi/elm-client.json depuis le dépôt backend voisin (chantier
// "types OpenAPI" du 27/08/2026) — CONVENANCE POUR POSTE DE DÉV UNIQUEMENT,
// jamais une étape requise par `npm run api:types` ni par la CI : la source
// autoritaire reste elm-monolithe/docs/openapi/client.json (deux dépôts
// séparés), mais ce dépôt Nuxt reste buildable sans checkout du backend
// grâce à la snapshot déjà committée (openapi/elm-client.json). Voir
// docs/openapi-workflow.md pour la procédure complète.
//
// Chemin relatif résolu depuis CE fichier (pas depuis process.cwd(), qui
// dépend d'où `npm run` est lancé) — jamais un chemin Windows absolu en dur.
import { copyFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(here, "../../elm-monolithe/docs/openapi/client.json");
const destination = resolve(here, "../openapi/elm-client.json");

if (!existsSync(source)) {
  console.error(
    `[api:sync-spec] Introuvable : ${source}\n` +
    "Ce script suppose que elm-monolithe est un dépôt frère (../elm-monolithe) de ce dépôt Nuxt. " +
    "Sans ce checkout local, utilisez directement la snapshot déjà committée (openapi/elm-client.json) " +
    "et lancez `npm run api:types` — aucune synchronisation n'est nécessaire pour juste régénérer les types.",
  );
  process.exit(1);
}

copyFileSync(source, destination);
console.log(`[api:sync-spec] openapi/elm-client.json mis à jour depuis ${source}`);
console.log("[api:sync-spec] Lancez maintenant : npm run api:types");
