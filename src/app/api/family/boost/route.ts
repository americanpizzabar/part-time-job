import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { basePrisma, MEMBER_COOKIE } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// 一括ブースト: 家族の全きょうだいに同時にご褒美(Gコイン+EXP)を配信する。
// 親の運用手間を減らす「全員に今週のご褒美ブースト!」機能。
// テナントガードはアクティブ子1人にしかスコープしないため、ここでは
// basePrisma で familyId+childProfileId を明示して全子に適用する。
export async function POST(req: Request) {
  const store = await cookies();
  const token = store.get(MEMBER_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "未認証" }, { status: 401 });
  const parent = await basePrisma.familyMember.findUnique({ where: { token } });
  if (!parent || parent.role !== "PARENT") {
    return NextResponse.json({ error: "親のみ操作できます" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const gcoins = Math.max(0, Math.min(100000, Math.round(Number(body.gcoins) || 0)));
  const exp = Math.max(0, Math.min(100000, Math.round(Number(body.exp) || 0)));
  const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : "🎁 ご褒美ブースト";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (gcoins === 0 && exp === 0) {
    return NextResponse.json({ error: "Gコインまたは経験値を指定してください" }, { status: 400 });
  }

  const children = await basePrisma.childProfile.findMany({
    where: { familyId: parent.familyId },
    select: { id: true, name: true },
  });
  if (children.length === 0) {
    return NextResponse.json({ error: "子プロファイルがありません" }, { status: 400 });
  }

  const familyId = parent.familyId;
  for (const child of children) {
    // 各子の OptisState を取得(なければ作成)
    let state = await basePrisma.optisState.findFirst({
      where: { familyId, childProfileId: child.id },
    });
    if (!state) {
      state = await basePrisma.optisState.create({
        data: { familyId, childProfileId: child.id },
      });
    }
    await basePrisma.optisState.update({
      where: { id: state.id },
      data: { gcoins: state.gcoins + gcoins, experience: state.experience + exp },
    });
    // 子のフィードに通知(BOOST)
    await basePrisma.feedItem.create({
      data: {
        familyId, childProfileId: child.id,
        title,
        body: message || `Gコイン+${gcoins} / EXP+${exp} がとどいたよ!`,
        category: "BOOST",
      },
    });
  }

  return NextResponse.json({ ok: true, count: children.length, gcoins, exp });
}
