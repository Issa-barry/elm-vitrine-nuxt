import { test, expect } from "@playwright/test";

// Ces tests tournent contre `nuxt dev` (voir playwright.config.ts et
// docs/e2e.md), où le service worker est volontairement désactivé
// (pwa.devOptions.enabled: false dans nuxt.config.ts) pour ne pas interférer
// avec cette suite existante. Ils ne couvrent donc que ce qui est vérifiable
// sans service worker : le manifest et les balises associées. La vérification
// du service worker lui-même se fait manuellement contre un build réel (voir
// docs/pwa.md § Vérifications effectuées).
test.describe("PWA", () => {
  test("le head expose le manifest et les icônes PWA", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
      "href",
      "/manifest.webmanifest",
    );
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
      "href",
      "/icons/apple-touch-icon-180x180.png",
    );
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
      "content",
      "#2563eb",
    );
  });

  test("manifest.webmanifest répond avec les champs attendus", async ({ request }) => {
    const response = await request.get("/manifest.webmanifest");

    expect(response.ok()).toBeTruthy();
    expect(response.headers()["content-type"]).toContain("application/manifest+json");

    const manifest = await response.json();
    // Pas de valeur exacte figée : NUXT_PUBLIC_APP_NAME peut être
    // personnalisée localement (.env, ignoré par git — voir
    // docs/environment.md), c'est même le comportement attendu. On vérifie
    // que le champ est bien rempli dynamiquement, pas sa valeur précise.
    expect(typeof manifest.name).toBe("string");
    expect(manifest.name.length).toBeGreaterThan(0);
    expect(manifest.start_url).toBe("/espace-client");
    expect(manifest.scope).toBe("/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ src: "/icons/pwa-192x192.png" }),
        expect.objectContaining({ src: "/icons/pwa-512x512.png", purpose: "any" }),
        expect.objectContaining({
          src: "/icons/maskable-icon-512x512.png",
          purpose: "maskable",
        }),
      ]),
    );
  });

  test("les icônes PWA référencées sont servies", async ({ request }) => {
    for (const icon of [
      "/icons/pwa-192x192.png",
      "/icons/pwa-512x512.png",
      "/icons/maskable-icon-512x512.png",
      "/icons/apple-touch-icon-180x180.png",
    ]) {
      const response = await request.get(icon);
      expect(response.ok(), `${icon} devrait répondre 200`).toBeTruthy();
    }
  });
});
