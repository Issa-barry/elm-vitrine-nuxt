import { forwardRegistration } from "../../../utils/registrationProxy";

export default defineEventHandler((event) =>
  forwardRegistration(event, "/api/auth/register/check-phone"),
);
