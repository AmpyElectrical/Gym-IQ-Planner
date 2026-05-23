import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DAY_MAP = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export async function GET(req: NextRequest) {
  const userId = req.cookies.get("gymiq-user")?.value;

  if (!userId) {
    return NextResponse.json({ plan: null }, { status: 401 });
  }

  const today = DAY_MAP[new Date().getDay()];

  const plan = await prisma.workoutPlan.findFirst({
    where: { userId, day: today, week: "1" },
  });

  return NextResponse.json({ plan });
}
