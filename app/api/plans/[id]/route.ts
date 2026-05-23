import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = req.cookies.get("gymiq-user")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const plan = await prisma.trainingPlan.findFirst({ where: { id: params.id, userId } });
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.trainingPlan.update({ where: { id: params.id }, data: { name: name.trim() } });
  return NextResponse.json({ plan: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = req.cookies.get("gymiq-user")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plan = await prisma.trainingPlan.findFirst({ where: { id: params.id, userId } });
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.trainingPlan.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
