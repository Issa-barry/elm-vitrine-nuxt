// Config ESLint autonome (n'a pas besoin que `.nuxt/eslint.config.mjs` ait
// été généré au préalable par le module — plus robuste pour `npm run lint`
// exécuté seul, en CI ou juste après un `npm install`).
import { createConfigForNuxt } from "@nuxt/eslint-config/flat";

export default createConfigForNuxt({
  features: {
    stylistic: false,
  },
}).append({
  // Template de référence vendored (sakai-vue), pas du code applicatif.
  ignores: ["_template/**"],
});
