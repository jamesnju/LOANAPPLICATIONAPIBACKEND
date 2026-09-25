import app from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/database.js";
async function startServer() {
    try {
        await prisma.$connect();
        console.log("✅ Database connected");
        app.listen(env.PORT, () => {
            console.log(`🚀 Server running at http://localhost:${env.PORT}`);
        });
    }
    catch (error) {
        console.error("❌ Failed to start server:", error);
        await prisma.$disconnect();
        process.exit(1);
    }
}
startServer();
//# sourceMappingURL=server.js.map