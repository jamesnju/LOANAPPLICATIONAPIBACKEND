import type { Express } from "express";

import cors from "cors";
import helmet from "helmet";
import hpp from "hpp";

export function configureSecurity(
  app: Express,
) {
  /*
   * Security-related HTTP headers.
   */
  app.use(
    helmet(),
  );

  /*
   * Prevent HTTP parameter pollution.
   */
  app.use(
    hpp(),
  );

  /*
   * CORS.
   *
   * For development we allow the frontend.
   * Replace the origin with your actual
   * frontend URL in production.
   */
  app.use(
    cors({
      origin: true,
      credentials: true,
      methods: [
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS",
      ],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
      ],
    }),
  );
}   