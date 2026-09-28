
import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { env } from './config/env.js';
import {
  verifyEmailConnection,
} from './services/email.service.js';

import authRoutes from './routes/auth.routes.js';
import loanProductRoutes from './routes/loan-product.routes.js';
import systemConfigRoutes from './routes/system-config.routes.js';
import adminKycRoutes from './routes/adminKyc.routes.js';
import adminLoanApplicationRoutes from './routes/adminLoanApplication.routes.js';
import kycRoutes from './routes/kyc.routes.js';
import loanApplicationRoutes from './routes/loanApplication.routes.js';
import loanRoutes from './routes/loan.routes.js';
import loanApplicationApprovalRoutes from './routes/loanApplicationApproval.routes.js';
import repaymentScheduleRoutes from './routes/repaymentSchedule.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import loanTransactionRoutes from './routes/loanTransaction.routes.js';
import loanStatusRoutes from './routes/loanStatus.routes.js';
import { startLoanJobs } from './jobs/loan.jobs.js';
import adminDashboardRoutes from './routes/adminDashboard.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import reportRoutes from './routes/report.routes.js';
import auditLogRoutes from './routes/auditLog.routes.js';
import userRoutes from './routes/user.routes.js';
import guarantorRoutes from './routes/guarantor.routes.js';
import collateralRoutes from './routes/collateral.routes.js';
import documentRoutes from './routes/document.routes.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';

// ✅ Explicitly type the app
const app: Express = express();

// ✅ CORS configuration with proper origin handling
const corsOptions = {
  origin: function (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) {
    // Allow mobile apps / server-to-server (no origin)
    if (!origin) {
      return callback(null, true);
    }

    // ✅ Allow all origins if ALLOWED_ORIGINS contains "*"
    if (env.ALLOWED_ORIGINS.includes('*')) {
      return callback(null, true);
    }

    // In development, allow any origin (localhost, LAN, etc.)
    if (env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    // Check if origin is in the allowed list
    if (env.ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-App-Version', 'X-Device-ID'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Total'],
};

// Security middleware
app.use(helmet());
app.use(cors(corsOptions));

// Body parsing
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
app.use(
  express.json({
    limit: "2mb",
  }),
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "2mb",
  }),
);

// Health check
app.get('/api/v1/health', (_req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Loan Platform API is running',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    allowedOrigins: env.ALLOWED_ORIGINS,
  });
});

// API Routes
const apiPrefix = '/api/v1';

app.use(`${apiPrefix}/auth`, authRoutes);

/*
 * System configuration
 */
app.use(`${apiPrefix}/system-config`, systemConfigRoutes);

app.use(`${apiPrefix}/loan-products`, loanProductRoutes);
app.use(`${apiPrefix}/kyc`, kycRoutes);
app.use(`${apiPrefix}/admin/kyc`, adminKycRoutes);
app.use(`${apiPrefix}/loan-applications`, loanApplicationRoutes);
app.use(`${apiPrefix}/admin/loan-applications`, adminLoanApplicationRoutes);
app.use(`${apiPrefix}/loan-applications`, loanApplicationApprovalRoutes);
app.use(`${apiPrefix}/loans`, loanRoutes);
app.use(`${apiPrefix}/repayment-schedules`, repaymentScheduleRoutes);

app.use(`${apiPrefix}/payments`, paymentRoutes);
app.use(`${apiPrefix}/loan-transactions`, loanTransactionRoutes);
app.use(`${apiPrefix}/loan-status`, loanStatusRoutes);

app.use(`${apiPrefix}/notifications`, notificationRoutes);
app.use(`${apiPrefix}/audit-logs`, auditLogRoutes);
app.use(`${apiPrefix}/admin/dashboard`, adminDashboardRoutes);
app.use(`${apiPrefix}/reports`, reportRoutes);
app.use(`${apiPrefix}/users`, userRoutes);
app.use(`${apiPrefix}/guarantors`, guarantorRoutes);
app.use(`${apiPrefix}/collateral`, collateralRoutes);

app.use(`${apiPrefix}/documents`, documentRoutes);

/*
 * 404 handler.
 */
app.use(
  notFoundHandler,
);

/*
 * Global error handler.
 */
app.use(
  errorHandler,
);












// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handling
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error('❌ Error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Internal server error',
    });
  }
);

// ✅ Export the app for Vercel
export default app;

// ✅ Only start server locally (not on Vercel)
if (env.NODE_ENV !== 'production') {
  const startServer = async (): Promise<void> => {
    try {
      /*
       * Verify Gmail SMTP before
       * starting the API.
       */
      await verifyEmailConnection();

      app.listen(env.PORT, () => {
        console.log(`🚀 Loan Platform API running on port ${env.PORT}`);
        console.log(`🔧 Environment: ${env.NODE_ENV}`);
        console.log(`📚 API Docs: http://localhost:${env.PORT}/api/v1`);
        console.log(`🌐 Allowed Origins: ${env.ALLOWED_ORIGINS.join(', ')}`);
      });
    } catch (error) {
      console.error('❌ Failed to start server');
      console.error(error);
      process.exit(1);
    }
  };

  startLoanJobs();
  startServer();

}



// import express from "express";
// import cors from "cors";
// import helmet from "helmet";

// import authRoutes from "./routes/auth.routes.js";
// import loanProductRoutes from "./routes/loan-product.routes.js";
// import systemConfigRoutes from "./routes/system-config.routes.js";
// import adminKycRoutes from "./routes/adminKyc.routes.js";
// import adminLoanApplicationRoutes from "./routes/adminLoanApplication.routes.js";
// import kycRoutes from "./routes/kyc.routes.js";
// import loanApplicationRoutes from "./routes/loanApplication.routes.js";
// // import systemConfigRoutes from "./routes/systemconfig.routes.js";
// const app = express();

// app.use(helmet());

// app.use(
//   cors({
//     origin: "http://localhost:3000",
//     credentials: true,
//   })
// );

// app.use(express.json());

// app.use(
//   express.urlencoded({
//     extended: true,
//   })
// );

// app.get(
//   "/api/v1/health",
//   (_req, res) => {
//     return res.status(200).json({
//       success: true,
//       message:
//         "Loan Platform API is running",
//     });
//   }
// );

// app.use(
//   "/api/v1/auth",
//   authRoutes
// );
// /*
//  * System configuration
//  */

// app.use(
//   "/api/v1/system-config",
//   systemConfigRoutes
// );



// app.use(
//   "/api/v1/loan-products",
//   loanProductRoutes
// );
// app.use(
//   "/api/v1/kyc",
//   kycRoutes,
// );

// app.use(
//   "/api/v1/admin/kyc",
//   adminKycRoutes,
// );

// app.use(
//   "/api/v1/loan-applications",
//   loanApplicationRoutes,
// );

// app.use(
//   "/api/v1/admin/loan-applications",
//   adminLoanApplicationRoutes,
// );

// export default app;