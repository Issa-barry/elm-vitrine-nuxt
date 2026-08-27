import type {
  ClientProfile,
  ClientProfileResponse,
  UpdateClientProfileLocalisationPayload,
  UpdateNotificationPreferencesResponse,
} from "~/config/clientProfile";
import type { AuthErrorInfo } from "~/config/auth";
import { normalizeAuthError } from "~/config/auth";

// Fiche métier (localisation, entreprise, préférences) — distincte de
// useAuth() (identité minimale + session issue de /api/auth/me). Ne pas
// fusionner : voir config/clientProfile.ts.
export function useClientProfile() {
  const profile = useState<ClientProfile | null>("client:profile", () => null);
  const isLoading = useState<boolean>("client:profile:loading", () => false);
  const isSavingLocalisation = useState<boolean>("client:profile:savingLocalisation", () => false);
  const isSavingNotifications = useState<boolean>("client:profile:savingNotifications", () => false);
  const error = useState<AuthErrorInfo | null>("client:profile:error", () => null);
  // useRequestFetch() plutôt qu'un ofetch importé brut : voir le commentaire
  // équivalent dans composables/useAuth.ts (résolution d'URL relative +
  // transmission du cookie de session côté SSR).
  const requestFetch = useRequestFetch();

  async function fetchProfile(): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      const data = await requestFetch<ClientProfileResponse>("/api/client/profile");
      profile.value = data.profile;
      return true;
    } catch (fetchError) {
      error.value = normalizeAuthError(fetchError);
      profile.value = null;
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  // Seuls pays/code_pays/ville/adresse sont acceptés par le backend (voir
  // config/clientProfile.ts) — n'envoie jamais autre chose, même si l'appelant
  // en fournit par erreur : le type du paramètre l'empêche déjà à la
  // compilation.
  async function updateLocalisation(
    payload: UpdateClientProfileLocalisationPayload,
  ): Promise<{ ok: true } | { ok: false; error: AuthErrorInfo }> {
    isSavingLocalisation.value = true;
    try {
      const data = await requestFetch<ClientProfileResponse>("/api/client/profile", {
        method: "PATCH",
        body: payload,
      });
      profile.value = data.profile;
      return { ok: true };
    } catch (fetchError) {
      const info = normalizeAuthError(fetchError);
      return { ok: false, error: info };
    } finally {
      isSavingLocalisation.value = false;
    }
  }

  // Non optimiste, volontairement : on met à jour l'état local uniquement
  // après confirmation du backend, jamais avant — un rollback UI correct
  // n'est pas justifié pour un simple interrupteur (voir demande du
  // 26/08/2026, section 11).
  async function updateNotificationPreference(
    activite: boolean,
  ): Promise<{ ok: true } | { ok: false; error: AuthErrorInfo }> {
    isSavingNotifications.value = true;
    try {
      const data = await requestFetch<UpdateNotificationPreferencesResponse>(
        "/api/client/profile/notification-preferences",
        { method: "PATCH", body: { preferences: { activite } } },
      );
      if (profile.value) {
        profile.value = { ...profile.value, notifications: data.notifications };
      }
      return { ok: true };
    } catch (fetchError) {
      const info = normalizeAuthError(fetchError);
      return { ok: false, error: info };
    } finally {
      isSavingNotifications.value = false;
    }
  }

  return {
    profile,
    isLoading,
    isSavingLocalisation,
    isSavingNotifications,
    error,
    fetchProfile,
    updateLocalisation,
    updateNotificationPreference,
  };
}
