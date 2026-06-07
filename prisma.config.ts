import "dotenv/config";
import { defineConfig } from "prisma/config";

function withTimeout(url: string): string {
  if (!url) return url;
  const sep = url.includes("?") ? "&" : "?";
  // connect_timeout gives Neon time to wake from cold start before advisory lock attempt
  return url.includes("connect_timeout") ? url : `${url}${sep}connect_timeout=30`;
}

const rawUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: withTimeout(rawUrl),
  },
});
