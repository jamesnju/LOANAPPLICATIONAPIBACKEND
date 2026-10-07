import "dotenv/config";
export default {
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  //datasource: { url: process.env["DATABASE_URL"] },
  //for migration only
  datasource: { url: process.env["DIRECT_URL"] },

};
