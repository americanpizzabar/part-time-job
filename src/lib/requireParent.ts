import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { basePrisma, MEMBER_COOKIE } from "@/lib/prisma";

export interface ParentContext {
  familyId: string;
  memberId: string;
}

// Returns null when the caller is a PARENT, or a 401/403 NextResponse when not.
// Usage:
//   const deny = await requireParent();
//   if (deny) return deny;
export async function requireParent(): Promise<NextResponse | null> {
  const store = await cookies();
  const token = store.get(MEMBER_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const member = await basePrisma.familyMember.findUnique({
    where: { token },
    select: { role: true },
  });
  if (!member) return NextResponse.json({ error: "未認証" }, { status: 401 });
  if (member.role !== "PARENT") {
    return NextResponse.json({ error: "親のみ操作できます" }, { status: 403 });
  }
  return null;
}
