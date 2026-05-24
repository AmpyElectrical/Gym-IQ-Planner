import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const userId = req.cookies.get("gymiq-user")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const notes = await prisma.profileNote.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ notes });
}

export async function POST(req: NextRequest) {
  const userId = req.cookies.get("gymiq-user")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { content } = await req.json().catch(() => ({}));
  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });
  const note = await prisma.profileNote.create({ data: { userId, content: content.trim() } });
  return NextResponse.json({ note });
}
