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
