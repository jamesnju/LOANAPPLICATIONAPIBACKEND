import app from "./app.js";

import { env } from "./config/env.js";

import {
  verifyEmailConnection,
} from "./services/email.service.js";


async function startServer() {

  try {

    /*
     * Verify Gmail SMTP before
     * starting the API.
     */
    await verifyEmailConnection();


    app.listen(
      env.PORT,
      () => {

        console.log(
          `🚀 Loan Platform API running on port ${env.PORT}`
        );

      }
    );

  } catch (error) {

    console.error(
      "❌ Failed to start server"
    );

    console.error(error);

    process.exit(1);
  }
}


startServer();