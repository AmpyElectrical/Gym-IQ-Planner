import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const userId = req.cookies.get("gymiq-user")?.value;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const exercises = await prisma.exercise.findMany({
    orderBy: [{ bodyPart: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ exercises });
}

export async function POST(req: NextRequest) {
  const userId = req.cookies.get("gymiq-user")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, bodyPart, equipment, difficulty, description } = await req.json();
  if (!name || !bodyPart || !equipment) {
    return NextResponse.json({ error: "name, bodyPart, and equipment are required" }, { status: 400 });
  }

  const exercise = await prisma.exercise.create({
    data: { name, bodyPart, equipment, difficulty: difficulty || "Intermediate", description: description || "", isCustom: true, createdBy: userId },
  });

  return NextResponse.json({ exercise });
}
