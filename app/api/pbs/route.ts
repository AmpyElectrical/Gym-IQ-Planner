import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const BUCKETS = [
  { id: "1",    range: [1, 1]   },
  { id: "2-3",  range: [2, 3]   },
  { id: "3-5",  range: [3, 5]   },
  { id: "5-8",  range: [5, 8]   },
  { id: "8-12", range: [8, 12]  },
  { id: "12+",  range: [12, 999]},
];

function getBucketId(reps: number): string {
  return BUCKETS.find((b) => reps >= b.range[0] && reps <= b.range[1])?.id ?? "12+";
}

export async function GET(req: NextRequest) {
  const userId = req.cookies.get("gymiq-user")?.value;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pbs = await prisma.personalBest.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  // Group by exerciseName
  const grouped: Record<string, typeof pbs> = {};
  for (const pb of pbs) {
    if (!grouped[pb.exerciseName]) grouped[pb.exerciseName] = [];
    grouped[pb.exerciseName].push(pb);
  }

  return NextResponse.json({ grouped });
}

export async function POST(req: NextRequest) {
  const userId = req.cookies.get("gymiq-user")?.value;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { exerciseName, weight, reps } = await req.json();

  if (!exerciseName || typeof weight !== "number" || typeof reps !== "number") {
    return NextResponse.json({ error: "exerciseName, weight, and reps are required" }, { status: 400 });
  }

  const bucketId = getBucketId(reps);

  // Check if this beats the current best for this bucket
  const currentBest = await prisma.personalBest.findFirst({
    where: { userId, exerciseName, bucketId },
    orderBy: { weight: "desc" },
  });

  const isPB = !currentBest || weight > currentBest.weight;

  const pb = await prisma.personalBest.create({
    data: {
      userId,
      exerciseName,
      bucketId,
      weight,
      reps,
      date: new Date(),
    },
  });

  return NextResponse.json({ pb, isPB, bucketId });
}
