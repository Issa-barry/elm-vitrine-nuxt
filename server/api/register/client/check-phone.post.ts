import { forwardRegistration } from "../../../utils/registrationProxy";

// Contrat exact de CheckPhoneController::lookupPhone() côté Laravel :
// prefill est toujours présent, jamais absent (null si aucune fiche trouvée).
interface CheckPhoneResponse {
  status: "user_exists" | "prefill_available" | "not_found";
  prefill: { prenom: string; nom: string } | null;
}

export default defineEventHandler((event) =>
  forwardRegistration<CheckPhoneResponse>(event, "/api/auth/register/check-phone"),
);
