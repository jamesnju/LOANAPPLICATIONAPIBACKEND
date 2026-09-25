import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./routes/auth.routes.js";
const app = express();
app.use(helmet());
app.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.get("/api/v1/health", (_req, res) => {
    res.json({
        success: true,
        message: "Loan Platform API is running"
    });
});
app.use("/api/v1/auth", authRoutes);
export default app;
//# sourceMappingURL=app.js.map