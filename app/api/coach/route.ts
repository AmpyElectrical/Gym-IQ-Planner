import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const client = new Anthropic();

const e1RM = (w: number, r: number) =>
  r === 1 ? w : Math.round(w * (1 + r / 30) * 10) / 10;

export async function POST(req: NextRequest) {
  const userId = req.cookies.get("gymiq-user")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messages } = await req.json();

  // Gather user context from DB in parallel
  const [user, checkIns, pbs, plan] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, include: { profile: true } }),
    prisma.checkIn.findMany({ where: { userId }, orderBy: { date: "desc" }, take: 5 }),
    prisma.personalBest.findMany({ where: { userId } }),
    prisma.workoutPlan.findMany({ where: { userId }, orderBy: [{ week: "asc" }, { createdAt: "asc" }] }),
  ]);

  const profile = user?.profile;

  // Summarise PBs — best e1RM per exercise
  const bestByExercise: Record<string, number> = {};
  for (const pb of pbs) {
    const est = e1RM(pb.weight, pb.reps);
    if (!bestByExercise[pb.exerciseName] || est > bestByExercise[pb.exerciseName]) {
      bestByExercise[pb.exerciseName] = est;
    }
  }
  const pbSummary = Object.entries(bestByExercise)
    .sort((a, b) => b[1] - a[1])
    .map(([name, est]) => `${name}: ${est} kg e1RM`)
    .join(", ") || "None logged yet";

  // Summarise recent check-ins
  const checkInSummary = checkIns.length
    ? checkIns
        .map((c) => `${new Date(c.date).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}: ${c.weight}kg, energy ${c.energy}/5${c.notes ? `, "${c.notes}"` : ""}`)
        .join(" | ")
    : "No check-ins yet";

  // Summarise workout plan
  const planSummary = plan.length
    ? plan.map((p) => `Week ${p.week} ${p.day}: ${p.typeId}`).join(", ")
    : "No plan set yet";

  const systemPrompt = `You are a no-fluff strength and hypertrophy coach. You give direct, practical advice based on the user's actual data. No motivational filler. No disclaimers. Just clear programming and nutrition guidance.

USER PROFILE:
- Name: ${profile?.name || user?.username || "Unknown"}
- Age: ${profile?.age || "Not set"}
- Bodyweight: ${profile?.weight ? `${profile.weight} kg` : "Not set"}
- Experience: ${profile?.experience || "Not set"}
- Occupation: ${profile?.occupation || "Not set"}
- Physical demand of job: ${profile?.physicalDemand || "Not set"}
- Work hours: ${profile?.workHours || "Not set"}
- Wake time: ${profile?.wakeTime || "Not set"}
- Sleep time: ${profile?.sleepTime || "Not set"}
- Preferred gym time: ${profile?.gymTime || "Not set"}
- Injuries/limitations: ${profile?.injuries || "None reported"}
- Goals: ${Array.isArray(profile?.goals) ? (profile.goals as string[]).join(", ") || "Not set" : "Not set"}
- Weak points: ${Array.isArray(profile?.weakPoints) ? (profile.weakPoints as string[]).join(", ") || "None flagged" : "None flagged"}

PERSONAL BESTS (estimated 1RM):
${pbSummary}

RECENT CHECK-INS (last 5):
${checkInSummary}

CURRENT TRAINING PLAN:
${planSummary}

Give advice specific to this person's data. Reference their actual numbers, schedule constraints, and goals when relevant.`;

  const stream = await client.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    system: systemPrompt,
    messages: messages.map((m: { role: string; content: string }) => ({
      role: m.role,
      content: m.content,
    })),
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }
      controller.close();
    },
  });

  return new NextResponse(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
