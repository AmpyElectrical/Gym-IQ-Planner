import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const BODY_PARTS = ["chest", "back", "shoulders", "arms", "legs", "core"];

const e1RM = (w: number, r: number) =>
  r === 1 ? w : Math.round(w * (1 + r / 30) * 10) / 10;

export async function GET(req: NextRequest) {
  const userId = req.cookies.get("gymiq-user")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [users, exercises] = await Promise.all([
    prisma.user.findMany({
      include: {
        personalBests: true,
        profile: { select: { name: true } },
      },
    }),
    prisma.exercise.findMany({ select: { name: true, bodyPart: true } }),
  ]);

  const bodyPartOf: Record<string, string> = Object.fromEntries(
    exercises.map((e) => [e.name, e.bodyPart])
  );

  const stats = users.map((user) => {
    const pbs = user.personalBests;
    const displayName = user.profile?.name?.trim() || user.username;

    // Best e1RM per exercise (all time)
    const bestByExercise: Record<string, number> = {};
    for (const pb of pbs) {
      const est = e1RM(pb.weight, pb.reps);
      if (!bestByExercise[pb.exerciseName] || est > bestByExercise[pb.exerciseName]) {
        bestByExercise[pb.exerciseName] = est;
      }
    }

    // Best e1RM per body part
    const bestByBodyPart: Record<string, number> = {};
    for (const [name, est] of Object.entries(bestByExercise)) {
      const bp = bodyPartOf[name];
      if (!bp || !BODY_PARTS.includes(bp)) continue;
      if (!bestByBodyPart[bp] || est > bestByBodyPart[bp]) {
        bestByBodyPart[bp] = est;
      }
    }

    const overall =
      Math.round(Object.values(bestByBodyPart).reduce((s, v) => s + v, 0) * 10) / 10;

    return { userId: user.id, displayName, bestByBodyPart, overall, pbs };
  });

  // Overall ranking
  const overall = stats
    .filter((u) => u.overall > 0)
    .sort((a, b) => b.overall - a.overall)
    .map((u, i) => ({ userId: u.userId, username: u.displayName, score: u.overall, rank: i + 1 }));

  // Per-body-part rankings
  const bodyParts: Record<string, Array<{ userId: string; username: string; bestE1RM: number; rank: number }>> = {};
  for (const bp of BODY_PARTS) {
    bodyParts[bp] = stats
      .filter((u) => (u.bestByBodyPart[bp] ?? 0) > 0)
      .sort((a, b) => (b.bestByBodyPart[bp] ?? 0) - (a.bestByBodyPart[bp] ?? 0))
      .map((u, i) => ({
        userId: u.userId,
        username: u.displayName,
        bestE1RM: u.bestByBodyPart[bp],
        rank: i + 1,
      }));
  }

  // Most improved
  function calcImproved(windowMs: number) {
    const cutoff = new Date(Date.now() - windowMs);
    return stats
      .map((user) => {
        const byExercise: Record<string, typeof user.pbs> = {};
        for (const pb of user.pbs) {
          if (!byExercise[pb.exerciseName]) byExercise[pb.exerciseName] = [];
          byExercise[pb.exerciseName].push(pb);
        }

        let bestPct = 0;
        let bestExercise = "";

        for (const [name, entries] of Object.entries(byExercise)) {
          const inWindow = entries.filter((e) => e.date >= cutoff);
          const before = entries.filter((e) => e.date < cutoff);
          if (!inWindow.length || !before.length) continue;
          const newBest = Math.max(...inWindow.map((e) => e.weight));
          const oldBest = Math.max(...before.map((e) => e.weight));
          if (oldBest <= 0) continue;
          const pct = Math.round(((newBest - oldBest) / oldBest) * 1000) / 10;
          if (pct > bestPct) { bestPct = pct; bestExercise = name; }
        }

        return {
          userId: user.userId,
          username: user.displayName,
          exerciseName: bestExercise,
          improvementPct: bestPct,
        };
      })
      .filter((u) => u.improvementPct > 0)
      .sort((a, b) => b.improvementPct - a.improvementPct)
      .map((u, i) => ({ ...u, rank: i + 1 }));
  }

  return NextResponse.json({
    overall,
    bodyParts,
    improved: {
      last7: calcImproved(7 * 24 * 60 * 60 * 1000),
      last14: calcImproved(14 * 24 * 60 * 60 * 1000),
    },
  });
}
