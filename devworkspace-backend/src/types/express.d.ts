import type { PublicUser } from "../utils/publicUser.js";

declare global {
  namespace Express {
    interface Request {
      /** Set by requireAuth. */
      user?: PublicUser;
    }
  }
}
