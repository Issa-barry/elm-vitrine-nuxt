import type { AuthUser } from "./auth";
import type { ClientCapabilities } from "./clientCapabilities";
import { resolveClientCapabilities } from "./clientCapabilities";

// Fixtures UI de preview UNIQUEMENT (voir pages/_preview/espace-client/
// [scenario].vue) — jamais un fallback runtime, jamais consommées par une
// page réelle de l'espace client. Chaque scénario passe par
// resolveClientCapabilities() (le même code que la vraie résolution), avec
// un `context` fabriqué localement — garantit que la preview reflète
// exactement ce que produirait un vrai compte ayant ce cumul de contextes,
// jamais une capacité recopiée/désynchronisée à la main.
export const CLIENT_CAPABILITIES_PREVIEW_SCENARIOS = [
  "prestataire-seul",
  "client-prestataire",
  "proprietaire-prestataire",
  "client-proprietaire-prestataire",
] as const;

export type ClientCapabilitiesPreviewScenario = (typeof CLIENT_CAPABILITIES_PREVIEW_SCENARIOS)[number];

export function isClientCapabilitiesPreviewScenario(value: string): value is ClientCapabilitiesPreviewScenario {
  return (CLIENT_CAPABILITIES_PREVIEW_SCENARIOS as readonly string[]).includes(value);
}

interface ClientCapabilitiesFixture {
  label: string;
  description: string;
  user: AuthUser;
  capabilities: ClientCapabilities;
}

const baseContext = { organization_id: "org-preview" };

export const CLIENT_CAPABILITIES_PREVIEW_FIXTURES: Record<ClientCapabilitiesPreviewScenario, ClientCapabilitiesFixture> = {
  "prestataire-seul": {
    label: "Prestataire seul",
    description: "Consultant sans véhicule ni profil client — voit ses commissions/dépenses/prestations, jamais véhicules/activité/commandes.",
    user: { id: "preview-1", prenom: "Aïssatou", nom: "Diallo", telephone: "+224620000001", email: null, roles: ["prestataire"] },
    capabilities: resolveClientCapabilities({
      ...baseContext, client_id: null, proprietaire_id: null, livreur_id: null, prestataire_id: "prest-preview-1",
    }),
  },
  "client-prestataire": {
    label: "Client + Prestataire",
    description: "Achète ET fournit une prestation — voit en plus ses commandes.",
    user: { id: "preview-2", prenom: "Mamadou", nom: "Bah", telephone: "+224620000002", email: null, roles: ["client", "prestataire"] },
    capabilities: resolveClientCapabilities({
      ...baseContext, client_id: "cli-preview-2", proprietaire_id: null, livreur_id: null, prestataire_id: "prest-preview-2",
    }),
  },
  "proprietaire-prestataire": {
    label: "Propriétaire + Prestataire",
    description: "Possède des véhicules ET fournit une prestation — voit en plus véhicules/activité.",
    user: { id: "preview-3", prenom: "Fatoumata", nom: "Camara", telephone: "+224620000003", email: null, roles: ["proprietaire", "prestataire"] },
    capabilities: resolveClientCapabilities({
      ...baseContext, client_id: null, proprietaire_id: "prop-preview-3", livreur_id: null, prestataire_id: "prest-preview-3",
    }),
  },
  "client-proprietaire-prestataire": {
    label: "Client + Propriétaire + Prestataire",
    description: "Cumule les trois contextes — tout ce qui est pertinent est visible.",
    user: { id: "preview-4", prenom: "Ousmane", nom: "Sow", telephone: "+224620000004", email: null, roles: ["client", "proprietaire", "prestataire"] },
    capabilities: resolveClientCapabilities({
      ...baseContext, client_id: "cli-preview-4", proprietaire_id: "prop-preview-4", livreur_id: null, prestataire_id: "prest-preview-4",
    }),
  },
};
