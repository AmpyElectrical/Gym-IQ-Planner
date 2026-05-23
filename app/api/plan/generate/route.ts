import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const anthropic = new Anthropic();

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const VALID_TYPES = ["push", "pull", "legs", "upper", "lower", "arms", "core", "cardio", "stretch", "rest"];

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  console.log("[plan/generate] ANTHROPIC_API_KEY defined:", !!apiKey);
  console.log("[plan/generate] ANTHROPIC_API_KEY first 10 chars:", apiKey ? apiKey.slice(0, 10) : "undefined");

  const userId = req.cookies.get("gymiq-user")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const additionalInstructions: string = body.additionalInstructions ?? "";

  const profile = await prisma.profile.findUnique({ where: { userId } });

  const profileText = profile
    ? `Experience: ${profile.experience}. Goals: ${JSON.stringify(profile.goals)}. Occupation: ${profile.occupation} (${profile.physicalDemand}). Work hours: ${profile.workHours}. Gym time: ${profile.gymTime}. Injuries/limitations: ${profile.injuries || "none"}. Weak points: ${JSON.stringify(profile.weakPoints)}.`
    : "No profile set — assume intermediate, general fitness goals, desk job, no injuries.";

  let raw: string;
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: `You are an expert strength and conditioning coach. You create personalised 2-week rotating gym programs.
Session types you may assign: push, pull, legs, upper, lower, arms, core, cardio, stretch, rest.
You MUST respond with ONLY valid JSON — no prose, no markdown, no code fences.
The JSON must have exactly this shape:
{
  "week1": { "Mon": "push", "Tue": "pull", "Wed": "rest", "Thu": "legs", "Fri": "push", "Sat": "cardio", "Sun": "rest" },
  "week2": { "Mon": "pull", "Tue": "push", "Wed": "legs", "Thu": "rest", "Fri": "upper", "Sat": "stretch", "Sun": "rest" },
  "reasoning": "One sentence explaining the structure."
}`,
      messages: [{
        role: "user",
        content: `Build a 2-week rotating plan for this athlete. ${profileText}${additionalInstructions ? ` Additional instructions from the athlete: ${additionalInstructions}` : ""}`,
      }],
    });
    raw = message.content[0].type === "text" ? message.content[0].text.trim() : "{}";
  } catch (error) {
    console.error("[plan/generate] Anthropic error message:", (error as Error)?.message);
    console.error("[plan/generate] Anthropic error full object:", error);
    return NextResponse.json({ error: "AI unavailable" }, { status: 500 });
  }

  let parsed: { week1?: Record<string, string>; week2?: Record<string, string>; reasoning?: string };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "AI returned invalid JSON", raw }, { status: 500 });
  }

  const upserts: Promise<unknown>[] = [];

  for (const week of ["1", "2"] as const) {
    const weekData = week === "1" ? parsed.week1 : parsed.week2;
    if (!weekData) continue;
    for (const day of DAYS) {
      const typeId = weekData[day];
      if (!typeId || !VALID_TYPES.includes(typeId)) continue;
      const existing = await prisma.workoutPlan.findFirst({ where: { userId, day, week } });
      const upsert = existing
        ? prisma.workoutPlan.update({ where: { id: existing.id }, data: { typeId } })
        : prisma.workoutPlan.create({ data: { userId, day, week, typeId, exercises: [] } });
      upserts.push(upsert);
    }
  }

  await Promise.all(upserts);

  const plan = await prisma.workoutPlan.findMany({ where: { userId }, orderBy: [{ week: "asc" }, { createdAt: "asc" }] });

  return NextResponse.json({ plan, reasoning: parsed.reasoning ?? "" });
}
