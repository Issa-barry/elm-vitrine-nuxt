import { forwardPasswordResetRequest } from "../../../utils/passwordResetProxy";

// Contrat exact de PasswordReset\VerifyController côté Laravel.
interface PasswordVerifyResponse {
  verified: true;
}

export default defineEventHandler((event) =>
  forwardPasswordResetRequest<PasswordVerifyResponse>(event, "verify"),
);
