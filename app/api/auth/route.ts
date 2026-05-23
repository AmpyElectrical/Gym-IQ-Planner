import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { username } = await req.json();

  if (!username || typeof username !== "string" || !username.trim()) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }

  const normalized = username.trim().toLowerCase();

  let user = await prisma.user.findUnique({ where: { username: normalized } });

  if (!user) {
    user = await prisma.user.create({
      data: {
        username: normalized,
        profile: {
          create: {
            name: "",
            age: "",
            weight: 0,
            experience: "",
            occupation: "",
            physicalDemand: "",
            workHours: "",
            wakeTime: "",
            sleepTime: "",
            gymTime: "",
            injuries: "",
            goals: [],
            weakPoints: [],
          },
        },
      },
    });
  }

  const res = NextResponse.json({ user });
  res.cookies.set("gymiq-user", user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return res;
}
