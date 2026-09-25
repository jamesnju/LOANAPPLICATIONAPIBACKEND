import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import {
  PrismaClient,
} from "../generated/prisma/client.js";


/*
 * ============================================================
 * DATABASE CONNECTION
 * ============================================================
 *
 * DATABASE_URL comes from .env
 *
 * Example:
 *
 * DATABASE_URL="postgresql://postgres:password@localhost:5432/loan_db"
 */
const connectionString =
  process.env.DATABASE_URL;


if (!connectionString) {

  throw new Error(
    "DATABASE_URL is not defined"
  );

}


/*
 * PostgreSQL driver adapter.
 *
 * Prisma 7 requires a driver adapter when
 * connecting directly to PostgreSQL.
 */
const adapter =
  new PrismaPg({
    connectionString,
  });


/*
 * Single Prisma Client instance.
 *
 * We will import this same instance throughout
 * the entire application.
 */
export const prisma =
  new PrismaClient({
    adapter,
  });