import { forwardPasswordResetRequest } from "../../../utils/passwordResetProxy";

// Contrat exact de PasswordReset\LookupController côté Laravel.
interface PasswordLookupResponse {
  message: string;
  masked_email: string;
}

export default defineEventHandler((event) =>
  forwardPasswordResetRequest<PasswordLookupResponse>(event, "lookup"),
);
