import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const userId = req.cookies.get("gymiq-user")?.value;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const plan = await prisma.workoutPlan.findMany({
    where: { userId },
    orderBy: [{ week: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ plan });
}

export async function POST(req: NextRequest) {
  const userId = req.cookies.get("gymiq-user")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { day, week, typeId } = await req.json();
  if (!day || !week || !typeId) {
    return NextResponse.json({ error: "day, week, and typeId are required" }, { status: 400 });
  }

  const existing = await prisma.workoutPlan.findFirst({ where: { userId, day, week } });

  const plan = existing
    ? await prisma.workoutPlan.update({ where: { id: existing.id }, data: { typeId } })
    : await prisma.workoutPlan.create({ data: { userId, day, week, typeId, exercises: [] } });

  return NextResponse.json({ plan });
}

export async function PUT(req: NextRequest) {
  const userId = req.cookies.get("gymiq-user")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { day, week, typeId, exercises } = await req.json();
  if (!day || !week || !typeId) {
    return NextResponse.json({ error: "day, week, and typeId are required" }, { status: 400 });
  }

  const existing = await prisma.workoutPlan.findFirst({ where: { userId, day, week } });

  const plan = existing
    ? await prisma.workoutPlan.update({ where: { id: existing.id }, data: { typeId, exercises: exercises ?? [] } })
    : await prisma.workoutPlan.create({ data: { userId, day, week, typeId, exercises: exercises ?? [] } });

  return NextResponse.json({ plan });
}
