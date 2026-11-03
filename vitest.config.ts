import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    // _template : maquettes de référence design vendues telles quelles (voir
    // _template/shopify, _template/apollo-vue-6.2.0), pas du code applicatif.
    // Leur propre suite (_template/shopify/test/unit/**) déclare son propre
    // environnement ("happy-dom") avec sa propre dépendance, jamais installée
    // à la racine de ce dépôt (pas dans package.json) — sans cette exclusion,
    // "npm run test" échoue systématiquement sur ces fichiers (ERR_MODULE_
    // NOT_FOUND) sans rapport avec l'application réelle.
    exclude: ["node_modules", ".nuxt", ".output", "dist", "_template"],
  },
});
