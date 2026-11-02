import { forwardRegistration } from "../../../utils/registrationProxy";

// Contrat exact de RegisterController + UserResource côté Laravel.
interface RegisterUser {
  id: string | number;
  prenom: string;
  nom: string;
  telephone: string;
  email: string | null;
  status: string;
  is_active: boolean;
  roles: string[];
}

interface RegisterResponse {
  message: string;
  user: RegisterUser;
}

export default defineEventHandler((event) =>
  forwardRegistration<RegisterResponse>(event, "/api/auth/register"),
);
