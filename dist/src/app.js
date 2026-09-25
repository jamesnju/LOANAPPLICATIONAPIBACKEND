import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./routes/auth.routes.js";
import loanProductRoutes from "./routes/loan-product.routes.js";
import systemConfigRoutes from "./routes/system-config.routes.js";
import adminKycRoutes from "./routes/adminKyc.routes.js";
import adminLoanApplicationRoutes from "./routes/adminLoanApplication.routes.js";
import kycRoutes from "./routes/kyc.routes.js";
import loanApplicationRoutes from "./routes/loanApplication.routes.js";
// import systemConfigRoutes from "./routes/systemconfig.routes.js";
const app = express();
app.use(helmet());
app.use(cors({
    origin: "http://localhost:3000",
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({
    extended: true,
}));
app.get("/api/v1/health", (_req, res) => {
    return res.status(200).json({
        success: true,
        message: "Loan Platform API is running",
    });
});
app.use("/api/v1/auth", authRoutes);
/*
 * System configuration
 */
app.use("/api/v1/system-config", systemConfigRoutes);
app.use("/api/v1/loan-products", loanProductRoutes);
app.use("/api/v1/kyc", kycRoutes);
app.use("/api/v1/admin/kyc", adminKycRoutes);
app.use("/api/v1/loan-applications", loanApplicationRoutes);
app.use("/api/v1/admin/loan-applications", adminLoanApplicationRoutes);
export default app;
//# sourceMappingURL=app.js.map