import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const userId = req.cookies.get("gymiq-user")?.value;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const checkIns = await prisma.checkIn.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 10,
  });

  return NextResponse.json({ checkIns });
}

export async function POST(req: NextRequest) {
  const userId = req.cookies.get("gymiq-user")?.value;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { weight, notes, date } = await req.json();

  if (typeof weight !== "number") {
    return NextResponse.json({ error: "weight is required" }, { status: 400 });
  }

  const checkIn = await prisma.checkIn.create({
    data: {
      userId,
      weight,
      energy: 0,
      notes: notes ?? "",
      date: date ? new Date(date) : new Date(),
    },
  });

  return NextResponse.json({ checkIn });
}
