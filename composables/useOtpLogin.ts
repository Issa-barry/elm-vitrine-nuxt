import type { AuthErrorInfo, OtpChannel, OtpLoginRequestResponse } from "~/config/auth";
import { normalizeAuthError } from "~/config/auth";

// Machine à états de la connexion sans mot de passe par OTP (chantier du
// 27/08/2026, voir pages/connexion.vue) — un seul `phase` (pas une
// accumulation de booléens indépendants) + quelques données associées
// (`channel`, `cooldownRemaining`) qui persistent naturellement à travers les
// transitions qui les concernent. Composable séparé de useAuth.ts : la
// demande de code (étape 1) ne touche jamais à l'état de session, seule
// verifyCode() (étape 2, via auth.loginWithOtp()) le fait.
export type OtpPhase =
  | "request" // téléphone + canal, prêt à demander un code
  | "sending" // POST .../request en vol
  | "code" // code à saisir (canal réel connu, cooldown de renvoi actif)
  | "verifying" // POST .../verify en vol
  | "not_found" // 404 : aucun compte pour ce numéro
  | "rate_limited" // 429 sur /request : anti-spam, cooldown = retry_after_seconds
  | "unavailable"; // 503 : aucun canal exploitable pour ce compte

export function useOtpLogin() {
  const auth = useAuth();
  const requestFetch = useRequestFetch();

  const phase = ref<OtpPhase>("request");
  // Canal RÉELLEMENT utilisé pour le code en cours (renvoyé par le backend,
  // jamais un choix du frontend) — persiste tel quel entre "code" et
  // "verifying" (un échec de vérification revient à "code" avec le même
  // canal, pas de nouvelle demande nécessaire).
  const channel = ref<OtpChannel | null>(null);
  // Coordonnée réellement utilisée, déjà masquée côté serveur (voir
  // config/auth.ts::OtpLoginRequestResponse) — persiste comme `channel`
  // entre "code" et "verifying".
  const destinationMasked = ref<string | null>(null);
  const error = ref<AuthErrorInfo | null>(null);

  // Secondes avant de pouvoir redemander un code — même compteur pour le
  // cooldown normal (phase "code", valeur = cooldown_seconds du backend) et
  // pour un blocage anti-spam (phase "rate_limited", valeur =
  // retry_after_seconds) : les deux sont conceptuellement la même chose
  // ("délai avant le prochain POST .../request autorisé").
  const cooldownRemaining = ref(0);
  let cooldownTimer: ReturnType<typeof setInterval> | null = null;

  // Remet TOUJOURS cooldownRemaining à 0 (pas seulement l'intervalle) : un
  // appelant qui arrête le cooldown le fait précisément parce que ce délai ne
  // s'applique plus (verrouillage 429 sur verify(), reset()...) — bug réel
  // trouvé le 27/08/2026 en testant le verrouillage : sans ce reset, un
  // compte à rebours interrompu en cours de route (ex. à 28s sur 30)
  // laissait le bouton "Recevoir le code" bloqué sur "Réessayer dans 28 s",
  // alors qu'aucun cooldown réel n'est plus en cours.
  function stopCooldown() {
    if (cooldownTimer !== null) {
      clearInterval(cooldownTimer);
      cooldownTimer = null;
    }
    cooldownRemaining.value = 0;
  }

  function startCooldown(seconds: number) {
    stopCooldown();
    cooldownRemaining.value = Math.max(0, Math.round(seconds));
    if (cooldownRemaining.value <= 0) return;
    cooldownTimer = setInterval(() => {
      cooldownRemaining.value = Math.max(0, cooldownRemaining.value - 1);
      if (cooldownRemaining.value <= 0) stopCooldown();
    }, 1000);
  }

  if (import.meta.client) {
    onBeforeUnmount(stopCooldown);
  }

  // Étape 1 — aussi utilisée pour "Renvoyer le code" (même endpoint, même
  // effet : un nouveau code, un nouveau cooldown). `telephone` déjà normalisé
  // (E.164) par l'appelant, voir pages/connexion.vue.
  async function requestCode(telephone: string): Promise<boolean> {
    phase.value = "sending";
    error.value = null;
    try {
      const data = await requestFetch<OtpLoginRequestResponse>("/api/auth/otp-login/request", {
        method: "POST",
        body: { telephone },
      });
      channel.value = data.channel;
      destinationMasked.value = data.destination_masked;
      phase.value = "code";
      startCooldown(data.cooldown_seconds);
      return true;
    } catch (err) {
      const info = normalizeAuthError(err);
      error.value = info;

      if (info.status === 404) {
        phase.value = "not_found";
      } else if (info.status === 429) {
        phase.value = "rate_limited";
        startCooldown(info.retryAfterSeconds ?? 60);
      } else if (info.status === 503) {
        phase.value = "unavailable";
      } else {
        // 422 (numéro invalide) ou erreur réseau : reste sur l'écran de
        // demande pour corriger, jamais un état "code" sans code envoyé.
        phase.value = "request";
      }
      return false;
    }
  }

  // Étape 2 — délègue à auth.loginWithOtp() pour converger EXACTEMENT vers le
  // même mécanisme post-authentification que la connexion par mot de passe
  // (voir composables/useAuth.ts::completeLogin()).
  async function verifyCode(telephone: string, code: string) {
    phase.value = "verifying";
    error.value = null;

    const result = await auth.loginWithOtp({ telephone, code });

    if (result.ok) {
      stopCooldown();
      return result;
    }

    error.value = result.error;

    if (result.error.status === 429) {
      // Verrouillé après 5 essais (OtpService::tooManyAttempts côté backend) :
      // ce challenge n'est plus utilisable, il faut redemander un code —
      // jamais continuer à soumettre le même code en boucle.
      stopCooldown();
      channel.value = null;
      destinationMasked.value = null;
      phase.value = "request";
    } else {
      // 422 (code incorrect/expiré) ou 403 (statut de compte) : reste sur
      // l'écran code pour corriger, même canal, cooldown de renvoi inchangé.
      phase.value = "code";
    }

    return result;
  }

  // "Utiliser mon mot de passe" — remet la machine à l'état initial pour une
  // future bascule vers OTP, sans effet sur le mode "password" lui-même
  // (géré par la page, voir pages/connexion.vue).
  function reset() {
    stopCooldown(); // remet aussi cooldownRemaining à 0
    phase.value = "request";
    channel.value = null;
    destinationMasked.value = null;
    error.value = null;
  }

  return {
    phase,
    channel,
    destinationMasked,
    error,
    cooldownRemaining,
    requestCode,
    verifyCode,
    reset,
  };
}
