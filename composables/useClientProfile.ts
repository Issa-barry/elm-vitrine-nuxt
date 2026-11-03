import type {
  ClientProfile,
  ClientProfileEmailConfirmation,
  ClientProfilePaysOption,
  ClientProfileResponse,
  UpdateClientProfilePayload,
  UpdateClientProfileResponse,
  UpdateNotificationPreferencesResponse,
} from "~/config/clientProfile";
import type { AuthErrorInfo } from "~/config/auth";
import { normalizeAuthError } from "~/config/auth";

// Fiche métier (localisation, entreprise, préférences) — distincte de
// useAuth() (identité minimale + session issue de /api/auth/me). Ne pas
// fusionner : voir config/clientProfile.ts.
export function useClientProfile() {
  const profile = useState<ClientProfile | null>("client:profile", () => null);
  const paysDisponibles = useState<string[]>("client:profile:paysDisponibles", () => []);
  const paysOptions = useState<ClientProfilePaysOption[]>("client:profile:paysOptions", () => []);
  const isLoading = useState<boolean>("client:profile:loading", () => false);
  const isSavingIdentity = useState<boolean>("client:profile:savingIdentity", () => false);
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
      // Repli : une API pas encore à jour ne doit pas faire planter l'écran.
      paysDisponibles.value = data.pays_disponibles ?? [];
      paysOptions.value = data.pays_options ?? [];
      return true;
    } catch (fetchError) {
      error.value = normalizeAuthError(fetchError);
      profile.value = null;
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function patchProfile(payload: UpdateClientProfilePayload): Promise<UpdateClientProfileResponse> {
    const data = await requestFetch<UpdateClientProfileResponse>("/api/client/profile", {
      method: "PATCH",
      body: payload,
    });
    profile.value = data.profile;
    paysDisponibles.value = data.pays_disponibles ?? [];
    paysOptions.value = data.pays_options ?? [];
    return data;
  }

  // prenom/nom sont appliqués tout de suite, l'e-mail seulement après ouverture
  // du lien reçu : `emailConfirmation` dit à l'écran quoi annoncer.
  async function updateIdentity(
    payload: Pick<UpdateClientProfilePayload, "prenom" | "nom" | "email">,
  ): Promise<{ ok: true; emailConfirmation: ClientProfileEmailConfirmation | null } | { ok: false; error: AuthErrorInfo }> {
    isSavingIdentity.value = true;
    try {
      const data = await patchProfile(payload);
      return { ok: true, emailConfirmation: data.email_confirmation };
    } catch (fetchError) {
      return { ok: false, error: normalizeAuthError(fetchError) };
    } finally {
      isSavingIdentity.value = false;
    }
  }

  async function updateLocalisation(
    payload: Pick<UpdateClientProfilePayload, "pays" | "ville" | "adresse">,
  ): Promise<{ ok: true } | { ok: false; error: AuthErrorInfo }> {
    isSavingLocalisation.value = true;
    try {
      await patchProfile(payload);
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
    paysDisponibles,
    paysOptions,
    isLoading,
    isSavingIdentity,
    isSavingLocalisation,
    isSavingNotifications,
    error,
    fetchProfile,
    updateIdentity,
    updateLocalisation,
    updateNotificationPreference,
  };
}
