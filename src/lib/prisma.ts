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

// ─── マルチテナント: 家族コンテナ + 子プロファイル解決 ──────────────────
// 全データは FamilyID に紐づく。さらに「子スコープ」のデータは
// ChildProfileID にも紐づき、きょうだい間でも完全に分離される。
// テナントガードが全クエリに familyId(+ 子スコープなら childProfileId)を
// 強制注入する(サーバー側一律遮断)。

export const MEMBER_COOKIE = "optis_member";
export const ACTIVE_CHILD_COOKIE = "optis_active_child"; // 親端末が選択中の子

interface MemberInfo {
  familyId: string;
  role: string;
  childProfileId: string | null;
}

// token → メンバー情報のプロセス内キャッシュ(TTL 60秒)
const memberCache = new Map<string, { info: MemberInfo; at: number }>();
// familyId → 先頭の子プロファイルID(親のフォールバック用, TTL 60秒)
const firstChildCache = new Map<string, { childId: string | null; at: number }>();
const CACHE_TTL = 60_000;

async function memberForToken(token: string): Promise<MemberInfo | null> {
  const hit = memberCache.get(token);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.info;
  const member = await getBasePrisma().familyMember.findUnique({
    where: { token },
    select: { familyId: true, role: true, childProfileId: true },
  });
  if (!member) return null;
  const info: MemberInfo = {
    familyId: member.familyId,
    role: member.role,
    childProfileId: member.childProfileId,
  };
  memberCache.set(token, { info, at: Date.now() });
  return info;
}

async function firstChildForFamily(familyId: string): Promise<string | null> {
  const hit = firstChildCache.get(familyId);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.childId;
  const child = await getBasePrisma().childProfile.findFirst({
    where: { familyId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  const childId = child?.id ?? null;
  firstChildCache.set(familyId, { childId, at: Date.now() });
  return childId;
}

export function invalidateMemberCache(token?: string) {
  if (token) memberCache.delete(token);
  else memberCache.clear();
}

export function invalidateChildCache(familyId?: string) {
  if (familyId) firstChildCache.delete(familyId);
  else firstChildCache.clear();
}

async function readCookie(name: string): Promise<string | undefined> {
  const { cookies } = await import("next/headers");
  const store = await cookies();
  return store.get(name)?.value;
}

// リクエストの Cookie から familyId を解決。
// トークンなし/無効時はエラー(未ペアリング端末からのアクセスを拒否)。
export async function resolveFamilyId(): Promise<string> {
  const token = await readCookie(MEMBER_COOKIE);
  if (!token) throw new Error("UNREGISTERED_DEVICE");
  const member = await memberForToken(token);
  if (!member) throw new Error("INVALID_TOKEN");
  return member.familyId;
}

// アクティブな子プロファイルIDを解決。
// - 子端末: 自身が紐づく子プロファイル(固定)
// - 親端末: optis_active_child Cookie の選択、なければ家族の先頭の子
export async function resolveActiveChildId(): Promise<string> {
  const token = await readCookie(MEMBER_COOKIE);
  if (!token) throw new Error("UNREGISTERED_DEVICE");
  const member = await memberForToken(token);
  if (!member) throw new Error("INVALID_TOKEN");

  if (member.role === "CHILD") {
    if (!member.childProfileId) throw new Error("CHILD_NOT_LINKED");
    return member.childProfileId;
  }

  // 親端末: 選択中の子(Cookie)を優先。同一家族の子プロファイルか検証する。
  const active = await readCookie(ACTIVE_CHILD_COOKIE);
  if (active) {
    const child = await getBasePrisma().childProfile.findFirst({
      where: { id: active, familyId: member.familyId },
      select: { id: true },
    });
    if (child) return child.id;
  }
  const first = await firstChildForFamily(member.familyId);
  if (!first) throw new Error("NO_CHILD_PROFILE");
  return first;
}

// familyId 列を持つ全テナントモデル。ここに載っていないモデル
// (Family/FamilyMember/PairingCode/ChildProfile)はガード対象外。
const TENANT_MODELS = new Set([
  "AllowanceConfig", "AggregationConfig", "Chore", "ChoreSchedule", "ChoreLog",
  "AllowancePeriod", "Transaction", "SavingsGoal", "SavingsTransaction", "PresentationRequest",
  "OptisState", "Project", "ProjectContribution", "RewardLog", "OutfitSet", "Mission",
  "Guild", "GuildMembership", "TradeOffer", "OutcomeReport", "PartMarketPrice", "MemoryCube",
  "FamilyLoan", "FeedItem", "VirtualBankDeposit", "EconomicWeather", "NewsQuiz", "QuizAttempt",
  "IndexFund", "IndexFundTx", "DailyKeyword", "WordMission", "LearningProfile", "MercariSale",
  "BackupSnapshot", "MarketTrade", "DecodeMission",
  "QuizBonusEarning", "ShadowGhost", "MainframeSolve", "GiftMoney", "BlackDeal",
]);

// 子スコープモデル(familyId に加え childProfileId でも分離)。
// ここに無い TENANT_MODELS は家族共通(familyId のみ)。
const CHILD_SCOPED_MODELS = new Set([
  "ChoreLog", "AllowancePeriod", "Transaction", "SavingsGoal", "SavingsTransaction",
  "PresentationRequest", "OptisState", "Project", "ProjectContribution", "RewardLog",
  "OutfitSet", "Mission", "GuildMembership", "TradeOffer", "OutcomeReport", "PartMarketPrice",
  "MemoryCube", "FamilyLoan", "FeedItem", "VirtualBankDeposit", "QuizAttempt", "IndexFund",
  "IndexFundTx", "WordMission", "LearningProfile", "MercariSale", "BackupSnapshot",
  "MarketTrade", "DecodeMission",
  "QuizBonusEarning", "ShadowGhost", "MainframeSolve", "GiftMoney", "BlackDeal",
]);

const WHERE_OPS = new Set([
  "findFirst", "findFirstOrThrow", "findMany", "count", "aggregate", "groupBy",
  "updateMany", "deleteMany",
]);
// 一意 where にも familyId/childProfileId を追加(extendedWhereUnique)。他家族・
// 他きょうだいの id を直撃指定しても、自分のスコープのレコードでなければヒットしない。
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
          const isChildScoped = CHILD_SCOPED_MODELS.has(model);
          const scope: Record<string, string> = { familyId };
          if (isChildScoped) scope.childProfileId = await resolveActiveChildId();
          const a = (args ?? {}) as any;

          if (WHERE_OPS.has(operation)) {
            a.where = { AND: [a.where ?? {}, scope] };
          } else if (UNIQUE_WHERE_OPS.has(operation)) {
            a.where = { ...(a.where ?? {}), ...scope };
            if (operation === "upsert" && a.create) Object.assign(a.create, scope);
          }

          if (operation === "create" && a.data) {
            Object.assign(a.data, scope);
          } else if (operation === "createMany" && a.data) {
            a.data = (Array.isArray(a.data) ? a.data : [a.data]).map((d: any) => ({
              ...d, ...scope,
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

// ガードなしの素のクライアント。Family/FamilyMember/PairingCode/ChildProfile の
// 管理(ペアリング・子プロファイルAPI)専用。テナントデータには絶対に使わないこと。
export const basePrisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_, prop) {
    return Reflect.get(getBasePrisma(), prop);
  },
});
