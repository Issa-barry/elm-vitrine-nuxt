import { forwardPasswordResetRequest } from "../../../utils/passwordResetProxy";

// Contrat exact de PasswordReset\ResetController côté Laravel.
interface PasswordResetResponse {
  message: string;
}

export default defineEventHandler((event) =>
  forwardPasswordResetRequest<PasswordResetResponse>(event, "reset"),
);
