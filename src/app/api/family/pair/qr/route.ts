import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import QRCode from "qrcode";
import { basePrisma, MEMBER_COOKIE } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET ?code=123456 → SVG文字列 を返す
export async function GET(req: Request) {
  const store = await cookies();
  const token = store.get(MEMBER_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const member = await basePrisma.familyMember.findUnique({ where: { token } });
  if (!member || member.role !== "PARENT") {
    return NextResponse.json({ error: "親のみ" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code") ?? "";
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "コードが無効" }, { status: 400 });
  }

  // ペアリングコードが現在の家族かつ有効であることを確認
  const pairing = await basePrisma.pairingCode.findUnique({ where: { code } });
  if (!pairing || pairing.familyId !== member.familyId || pairing.usedAt !== null || pairing.expiresAt < new Date()) {
    return NextResponse.json({ error: "コードが無効または期限切れ" }, { status: 400 });
  }

  const origin = req.headers.get("origin") ?? req.headers.get("x-forwarded-proto")
    ? `${req.headers.get("x-forwarded-proto")}://${req.headers.get("host")}`
    : "http://localhost:3000";
  const joinUrl = `${origin}/family/join?code=${code}`;

  const svg = await QRCode.toString(joinUrl, {
    type: "svg",
    margin: 2,
    color: { dark: "#1d4ed8", light: "#ffffff" },
  });

  return new NextResponse(svg, {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "no-store" },
  });
}
