import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = req.cookies.get("gymiq-user")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;

  const plan = await prisma.trainingPlan.findFirst({ where: { id, userId } });
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.trainingPlan.updateMany({ where: { userId }, data: { isActive: false } });
  const activated = await prisma.trainingPlan.update({ where: { id }, data: { isActive: true } });

  return NextResponse.json({ plan: activated });
}
