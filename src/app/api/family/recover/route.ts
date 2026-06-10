import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { basePrisma, MEMBER_COOKIE, invalidateMemberCache } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 365,
  path: "/",
};

// 簡易 IP レートリミッター(5回/10分)。プロセス内キャッシュのため
// サーバーレス cold start でリセットされるが、bcrypt の遅さと合わせて
// 実用上の総当たり攻撃を抑止する。
const attempts = new Map<string, { count: number; reset: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.reset) {
    attempts.set(ip, { count: 1, reset: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_ATTEMPTS) return false;
  entry.count++;
  return true;
}

// リカバリーコード: 読みやすい大文字英数字 16 文字(O/0/I/1/L を除外)
function generateRecoveryCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(16);
  return Array.from(bytes, b => chars[b % chars.length]).join("");
}

// POST: リカバリーコードで新端末を親として再登録。
// 使用後に旧コードを無効化し新コードを発行する(ローテーション)。
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "しばらく待ってから試してください" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase().replace(/\s/g, "") : "";
  const nickname = typeof body.nickname === "string" && body.nickname.trim()
    ? body.nickname.trim() : "おうちの人";

  if (code.length < 8) {
    return NextResponse.json({ error: "リカバリーコードを入力してください" }, { status: 400 });
  }

  const families = await basePrisma.family.findMany({
    where: { recoveryCodeHash: { not: null } },
    select: { id: true, recoveryCodeHash: true },
  });

  let matchedFamilyId: string | null = null;
  for (const f of families) {
    if (f.recoveryCodeHash && await bcrypt.compare(code, f.recoveryCodeHash)) {
      matchedFamilyId = f.id;
      break;
    }
  }

  if (!matchedFamilyId) {
    return NextResponse.json({ error: "リカバリーコードが正しくありません" }, { status: 400 });
  }

  // コードをローテーション: 旧コードを即無効化し新コードを発行
  const newCode = generateRecoveryCode();
  const newHash = await bcrypt.hash(newCode, 10);
  await basePrisma.family.update({
    where: { id: matchedFamilyId },
    data: { recoveryCodeHash: newHash },
  });

  const store = await cookies();
  const oldToken = store.get(MEMBER_COOKIE)?.value;

  const token = randomBytes(32).toString("hex");
  const member = await basePrisma.familyMember.create({
    data: { familyId: matchedFamilyId, role: "PARENT", nickname, token },
  });

  // 復旧通知をフィードに投稿(他の親端末が気づけるよう)
  try {
    await basePrisma.feedItem.create({
      data: {
        familyId: matchedFamilyId,
        title: "🔑 リカバリーコードが使用されました",
        body: `「${nickname}」として新しい親端末が追加されました。心当たりがない場合はすぐに家族設定を確認してください。`,
        category: "ALERT",
        isActive: true,
      },
    });
  } catch { /* フィード通知の失敗はリカバリー自体を妨げない */ }

  store.set(MEMBER_COOKIE, token, COOKIE_OPTS);
  if (oldToken) invalidateMemberCache(oldToken);

  // 新しいリカバリーコードをここで1度だけ返す
  return NextResponse.json({
    ok: true,
    member: { id: member.id, role: member.role, nickname: member.nickname },
    familyId: matchedFamilyId,
    newRecoveryCode: newCode,
  }, { status: 201 });
}
