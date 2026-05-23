import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const userId = req.cookies.get("gymiq-user")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await prisma.user.findMany({
    select: {
      id: true, username: true, nickname: true,
      firstName: true, lastName: true, email: true, password: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ users });
}

function randomPassword() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function POST(req: NextRequest) {
  const userId = req.cookies.get("gymiq-user")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { firstName, lastName, email } = await req.json();

  if (!firstName?.trim() || !lastName?.trim()) {
    return NextResponse.json({ error: "First name and last name are required" }, { status: 400 });
  }

  const base = `${firstName.trim().toLowerCase()}${lastName.trim().toLowerCase()}`.replace(/[^a-z0-9]/g, "");
  let username = base;
  let suffix = 1;
  while (await prisma.user.findUnique({ where: { username } })) {
    username = `${base}${suffix++}`;
  }

  const password = randomPassword();

  const user = await prisma.user.create({
    data: {
      username,
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email?.trim() || null,
      profile: {
        create: {
          name: `${firstName.trim()} ${lastName.trim()}`,
          age: "", weight: 0, experience: "", occupation: "",
          physicalDemand: "", workHours: "", wakeTime: "", sleepTime: "",
          gymTime: "", injuries: "", goals: [], weakPoints: [],
        },
      },
    },
    select: { id: true, username: true, firstName: true, lastName: true, email: true, createdAt: true },
  });

  return NextResponse.json({ user, generatedUsername: username, generatedPassword: password }, { status: 201 });
}
