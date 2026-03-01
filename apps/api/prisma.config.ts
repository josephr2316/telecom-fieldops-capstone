import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx ts-node --transpile-only -r dotenv/config prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
    // Optional: set SHADOW_DATABASE_URL in .env to use `prisma migrate dev` (e.g. second Supabase project or local Postgres).
    shadowDatabaseUrl: process.env["SHADOW_DATABASE_URL"],
  },
});
