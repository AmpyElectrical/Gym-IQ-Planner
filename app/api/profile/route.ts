import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const userId = req.cookies.get("gymiq-user")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.profile.findUnique({ where: { userId } });
  return NextResponse.json({ profile });
}

export async function PUT(req: NextRequest) {
  const userId = req.cookies.get("gymiq-user")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const profile = await prisma.profile.upsert({
    where: { userId },
    update: {
      name:             body.name           ?? "",
      age:              body.age            ?? "",
      weight:           typeof body.weight === "number" ? body.weight : parseFloat(body.weight) || 0,
      experience:       body.experience     ?? "",
      occupation:       body.occupation     ?? "",
      physicalDemand:   body.physicalDemand ?? "",
      workHours:        body.workHours      ?? "",
      wakeTime:         body.wakeTime       ?? "",
      sleepTime:        body.sleepTime      ?? "",
      gymTime:          body.gymTime        ?? "",
      programStartDate: body.programStartDate ? new Date(body.programStartDate) : null,
      timezone:         body.timezone        ?? "Australia/Melbourne",
      injuries:         body.injuries       ?? "",
      goals:            Array.isArray(body.goals)      ? body.goals      : [],
      weakPoints:       Array.isArray(body.weakPoints) ? body.weakPoints : [],
    },
    create: {
      userId,
      name:             body.name           ?? "",
      age:              body.age            ?? "",
      weight:           typeof body.weight === "number" ? body.weight : parseFloat(body.weight) || 0,
      experience:       body.experience     ?? "",
      occupation:       body.occupation     ?? "",
      physicalDemand:   body.physicalDemand ?? "",
      workHours:        body.workHours      ?? "",
      wakeTime:         body.wakeTime       ?? "",
      sleepTime:        body.sleepTime      ?? "",
      gymTime:          body.gymTime        ?? "",
      programStartDate: body.programStartDate ? new Date(body.programStartDate) : null,
      timezone:         body.timezone        ?? "Australia/Melbourne",
      injuries:         body.injuries       ?? "",
      goals:            Array.isArray(body.goals)      ? body.goals      : [],
      weakPoints:       Array.isArray(body.weakPoints) ? body.weakPoints : [],
    },
  });

  return NextResponse.json({ profile });
}
