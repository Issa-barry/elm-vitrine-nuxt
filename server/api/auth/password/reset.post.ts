import { forwardPasswordResetRequest } from "../../../utils/passwordResetProxy";

export default defineEventHandler((event) =>
  forwardPasswordResetRequest(event, "reset"),
);
