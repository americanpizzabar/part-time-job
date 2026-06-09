import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prismaBase: PrismaClient | undefined;
  prismaTenant: PrismaClient | undefined;
};

function createPrisma() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  // Neon(本番)はサーバーレスドライバ、ローカルのPostgresはnode-postgresを使う
  const isNeon = /neon\.tech/.test(connectionString);
  const adapter = isNeon
    ? new PrismaNeon({ connectionString })
    : new PrismaPg({ connectionString });

  return new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);
}

function getBasePrisma(): PrismaClient {
  if (!globalForPrisma.prismaBase) {
    globalForPrisma.prismaBase = createPrisma();
  }
  return globalForPrisma.prismaBase;
}

// ─── マルチテナント: 家族コンテナ解決 ──────────────────────────────────
// 全データは FamilyID に紐づく。Cookie のメンバートークンから家族を解決し、
// テナントガードが全クエリに familyId を強制注入する(サーバー側一律遮断)。

export const DEFAULT_FAMILY_ID = "default-family";
export const MEMBER_COOKIE = "optis_member";

// token → familyId のプロセス内キャッシュ(TTL 60秒)
const memberCache = new Map<string, { familyId: string; at: number }>();
const MEMBER_CACHE_TTL = 60_000;

export async function familyIdForToken(token: string): Promise<string | null> {
  const hit = memberCache.get(token);
  if (hit && Date.now() - hit.at < MEMBER_CACHE_TTL) return hit.familyId;
  const member = await getBasePrisma().familyMember.findUnique({ where: { token } });
  if (!member) return null;
  memberCache.set(token, { familyId: member.familyId, at: Date.now() });
  return member.familyId;
}

export function invalidateMemberCache(token?: string) {
  if (token) memberCache.delete(token);
  else memberCache.clear();
}

// リクエストの Cookie から familyId を解決。
// トークンなし/無効時は default-family(既存シングル家族デプロイの互換動作)。
export async function resolveFamilyId(): Promise<string> {
  try {
    const { cookies } = await import("next/headers");
    const store = await cookies();
    const token = store.get(MEMBER_COOKIE)?.value;
    if (!token) return DEFAULT_FAMILY_ID;
    return (await familyIdForToken(token)) ?? DEFAULT_FAMILY_ID;
  } catch {
    // リクエストスコープ外(ビルド時/スクリプト)は default-family
    return DEFAULT_FAMILY_ID;
  }
}

// familyId 列を持つ全テナントモデル。ここに載っていないモデル
// (Family/FamilyMember/PairingCode)はガード対象外。
const TENANT_MODELS = new Set([
  "AllowanceConfig", "AggregationConfig", "Chore", "ChoreSchedule", "ChoreLog",
  "AllowancePeriod", "Transaction", "SavingsGoal", "SavingsTransaction", "PresentationRequest",
  "OptisState", "Project", "ProjectContribution", "RewardLog", "OutfitSet", "Mission",
  "Guild", "GuildMembership", "TradeOffer", "OutcomeReport", "PartMarketPrice", "MemoryCube",
  "FamilyLoan", "FeedItem", "VirtualBankDeposit", "EconomicWeather", "NewsQuiz", "QuizAttempt",
  "IndexFund", "IndexFundTx", "DailyKeyword", "WordMission", "LearningProfile", "MercariSale",
  "BackupSnapshot", "MarketTrade", "DecodeMission",
]);

const WHERE_OPS = new Set([
  "findFirst", "findFirstOrThrow", "findMany", "count", "aggregate", "groupBy",
  "updateMany", "deleteMany",
]);
// 一意 where にも familyId を追加(extendedWhereUnique)。他家族の id を
// 直撃指定しても自家族のレコードでなければヒットしない。
const UNIQUE_WHERE_OPS = new Set([
  "findUnique", "findUniqueOrThrow", "update", "delete", "upsert",
]);

/* eslint-disable @typescript-eslint/no-explicit-any */
function createTenantPrisma(): PrismaClient {
  const base = getBasePrisma();
  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !TENANT_MODELS.has(model)) return query(args);
          const familyId = await resolveFamilyId();
          const a = (args ?? {}) as any;

          if (WHERE_OPS.has(operation)) {
            a.where = { AND: [a.where ?? {}, { familyId }] };
          } else if (UNIQUE_WHERE_OPS.has(operation)) {
            a.where = { ...(a.where ?? {}), familyId };
            if (operation === "upsert" && a.create) a.create.familyId = familyId;
          }

          if (operation === "create" && a.data) {
            a.data.familyId = familyId;
          } else if (operation === "createMany" && a.data) {
            a.data = (Array.isArray(a.data) ? a.data : [a.data]).map((d: any) => ({
              ...d, familyId,
            }));
          }

          return query(a);
        },
      },
    },
  }) as unknown as PrismaClient;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function getTenantPrisma(): PrismaClient {
  if (!globalForPrisma.prismaTenant) {
    globalForPrisma.prismaTenant = createTenantPrisma();
  }
  return globalForPrisma.prismaTenant;
}

// Lazy proxy: defers DB connection until first query — safe at build time
// テナントガード適用済みクライアント。アプリ内の全クエリはこれを使う。
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_, prop) {
    return Reflect.get(getTenantPrisma(), prop);
  },
});

// ガードなしの素のクライアント。Family/FamilyMember/PairingCode の管理
// (ペアリングAPI)専用。テナントデータには絶対に使わないこと。
export const basePrisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_, prop) {
    return Reflect.get(getBasePrisma(), prop);
  },
});
