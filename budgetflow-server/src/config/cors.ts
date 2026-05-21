import type { CorsOptions } from "cors";

import { env } from "./env";

export const corsOptions: CorsOptions = {
  origin: env.clientUrl,
  credentials: true
};
