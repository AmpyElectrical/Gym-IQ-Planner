import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  const userId = req.cookies.get("gymiq-user")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const data: { username?: string; password?: string; nickname?: string | null } = {};

  if ("username" in body) {
    const val = String(body.username ?? "").trim().toLowerCase();
    if (!val) return NextResponse.json({ error: "Username cannot be empty" }, { status: 400 });
    data.username = val;
  }

  if ("password" in body) {
    const val = String(body.password ?? "").trim();
    if (!val) return NextResponse.json({ error: "Password cannot be empty" }, { status: 400 });
    data.password = val;
  }

  if ("nickname" in body) {
    data.nickname = String(body.nickname ?? "").trim() || null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, username: true, nickname: true },
    });
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: "Username already taken" }, { status: 409 });
  }
}
