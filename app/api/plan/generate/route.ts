import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const anthropic = new Anthropic();

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const VALID_TYPES = ["push", "pull", "legs", "upper", "lower", "arms", "core", "cardio", "stretch", "core-stretch", "rest"];

type CustomExercise = { name: string; sets: number; reps: string; bodyPart: string };
type DayPlan = { typeId: string; customExercises?: CustomExercise[] };

export async function POST(req: NextRequest) {
  const userId = req.cookies.get("gymiq-user")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const additionalInstructions: string = body.additionalInstructions ?? "";
    const conversationHistory: { role: string; content: string }[] = body.conversationHistory ?? [];
    const dryRun: boolean = body.dryRun ?? false;
    const incomingPlanData: { week1?: Record<string, DayPlan>; week2?: Record<string, DayPlan>; reasoning?: string } | null = body.planData ?? null;

    const [profile, allExercises] = await Promise.all([
      prisma.profile.findUnique({ where: { userId } }),
      prisma.exercise.findMany({ select: { name: true, bodyPart: true }, orderBy: { bodyPart: "asc" } }),
    ]);

    const exercisesByBodyPart: Record<string, string[]> = {};
    for (const ex of allExercises) {
      if (!exercisesByBodyPart[ex.bodyPart]) exercisesByBodyPart[ex.bodyPart] = [];
      exercisesByBodyPart[ex.bodyPart].push(ex.name);
    }
    const exerciseList = Object.entries(exercisesByBodyPart)
      .map(([bp, names]) => `${bp.toUpperCase()}: ${names.join(", ")}`)
      .join(". ");
    console.log("Exercises fetched from DB:", allExercises.length);
    console.log("Sample exercises:", allExercises.slice(0, 5).map((e) => e.name));

    const profileText = profile
      ? [
          `Name: ${profile.name || "unknown"}.`,
          `Age: ${profile.age || "unknown"}.`,
          `Bodyweight: ${profile.weight ? `${profile.weight}kg` : "unknown"}.`,
          `Experience: ${profile.experience || "intermediate"}.`,
          `Goals: ${Array.isArray(profile.goals) && (profile.goals as string[]).length ? (profile.goals as string[]).join(", ") : "general fitness"}.`,
          `Occupation: ${profile.occupation || "unknown"} (${profile.physicalDemand || "unknown physical demand"}).`,
          `Gym time: ${profile.gymTime || "unknown"}.`,
          `Injuries: ${profile.injuries || "none"}.`,
          `Weak points: ${Array.isArray(profile.weakPoints) && (profile.weakPoints as string[]).length ? (profile.weakPoints as string[]).join(", ") : "none"}.`,
        ].join(" ")
      : "Intermediate lifter, general fitness, no injuries.";

    let parsed: { week1?: Record<string, DayPlan>; week2?: Record<string, DayPlan>; reasoning?: string };

    if (incomingPlanData) {
      parsed = incomingPlanData;
    } else {
      let raw: string;
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 55000)
        );
        const message = await Promise.race([
          anthropic.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 8000,
            system: `You are an experienced personal trainer. Build a 2-week gym programme as JSON following every rule below without exception.

LISTENING RULES — NON NEGOTIABLE:
- Read every word the client says before building anything.
- Extract every specific request and list them numbered before building.
- If the client says 5 chest exercises — give exactly 5. Not 4. Not 6. Exactly 5.
- If the client says 2 tricep exercises — give exactly 2.
- If the client says no shoulder isolation — do not include lateral raises, front raises, or any direct shoulder work.
- If the client says more legs — give at least 2 leg days per week.
- Never ignore a specific instruction. Never substitute a request with something similar without explaining why.

EXERCISE PROGRAMMING RULES — NON NEGOTIABLE:
- Never place two exercises with the same primary movement pattern back to back.
- Horizontal press movements (Bench Press, DB Flat Press, Push-ups) must never follow each other directly.
- Incline press and flat press are the same pattern at a different angle — never back to back.
- Squat and Hack Squat are the same pattern — never back to back.
- Deadlift and Romanian Deadlift are both hip hinge — never back to back.
- Always order exercises: heaviest compound first, moderate compound second, isolation exercises last.
- Vary equipment within a session — mix barbell, dumbbell, cable, and machine. Do not use one equipment type for every exercise.
- Vary angles — if you include flat press also include incline or cable work, not another flat press variant.
- Sessions with 5+ exercises for one muscle group must use at least 3 different movement patterns or equipment types.

WEEKLY PROGRAMMING RULES — NON NEGOTIABLE:
- Never schedule two sessions that heavily work the same muscle group on consecutive days.
- Two leg days must have at least one rest, core, or upper body day between them.
- Push and Pull can be consecutive days as they work opposing muscles — this is acceptable.
- Core and stretch sessions are excellent recovery days — place them between heavy sessions.
- Arms sessions work best after push or pull days, never before a heavy push or pull session.
- Ensure adequate recovery — legs need at least one full day before the next leg session.
- Weekly flow must be logical: heavy, moderate, light, repeat.

SESSION STRUCTURE RULES — GENERAL PRINCIPLES:
- PUSH DAY: Chest is the primary muscle. Triceps are secondary. Direct shoulder isolation only if the client requests it.
- PULL DAY: Back is the primary muscle. Biceps are secondary. Direct shoulder work only if requested.
- LEGS DAY: Always train both quads and hamstrings unless the client says otherwise. Include calf work unless told not to.
- ARMS DAY: Balance bicep and tricep volume equally.
- UPPER BODY DAY: Balance chest and back volume. Include shoulders only if requested.
- CORE STRETCH DAY: Mix core strengthening exercises with mobility and stretching tailored to the client's heaviest muscle groups that week.
- ALWAYS: The client's specific requests override these general principles.

WEEK 1 vs WEEK 2 — 14 DAY CYCLE RULES:
- Do not treat Week 1 and Week 2 as two separate identical weeks. Treat all 14 days as one continuous training cycle.
- Sessions do not need to be on the same days in both weeks. Monday Week 1 can be Push. Monday Week 2 can be Legs.
- Distribute sessions across 14 days to maximise recovery between similar muscle groups.
- Example: if programming 3 leg sessions across 14 days place them on days 1, 5, and 11 — not days 1, 5, 8, 12.
- Heavy sessions for the same muscle group should be at least 4-5 days apart across the full 14-day cycle.
- Week 2 can have different session types on different days to Week 1 — this is encouraged not just exercise variation.
- Always ensure the client gets the total number of each session type they requested across the full 14 days combined.

MANDATORY BUILD PROCESS:
- Step 1: Read the entire conversation and note every specific client instruction — do not write them out.
- Step 2: Plan the weekly structure — decide which session type goes on each day before selecting exercises.
- Step 3: For each session select exercises following all programming rules above.
- Step 4: Before finalising, check each session against the client's specific instructions. Adjust if anything is missing or wrong.

Use ONLY the exercises listed below. Choose 4-6 exercises per training session. Rest/stretch days use [].
JSON shape: {"week1":{"Mon":{"typeId":"push","customExercises":[{"name":"ExerciseName","sets":4,"reps":"8-10","bodyPart":"bodypart"}]},...},"week2":{...}}
Valid typeId: push, pull, legs, upper, lower, arms, core, cardio, stretch, core-stretch, rest.

Do not write any explanation. Return ONLY the JSON object starting with { immediately.

EXERCISES — use only these, no others:
${exerciseList}`,
            messages: [{
              role: "user",
              content: `Client profile: ${profileText}\n\n${conversationHistory.length > 0 ? `CONVERSATION:\n${conversationHistory.map((m) => `${m.role === "user" ? "CLIENT" : "COACH"}: ${m.content}`).join("\n")}\n\nBuild a plan that follows every instruction above.` : `Build a standard 2-week plan for this client.${additionalInstructions ? ` ${additionalInstructions}` : ""}`}`,
            }],
          }),
          timeoutPromise,
        ]) as Awaited<ReturnType<typeof anthropic.messages.create>>;
        raw = message.content[0].type === "text" ? message.content[0].text.trim() : "{}";
      } catch (error) {
        const msg = (error as Error)?.message ?? "";
        if (msg === "timeout") {
          console.warn("[plan/generate] AI timed out");
          return NextResponse.json({ error: "Generation took too long — please try again. Try shortening your instructions or breaking them into fewer requests." }, { status: 504 });
        } else {
          console.error("[plan/generate] Anthropic error:", msg);
          return NextResponse.json({ error: msg || "AI unavailable" }, { status: 500 });
        }
      }

      console.log("RAW AI RESPONSE:", raw);
      console.log("Response length:", raw.length, "chars");
      raw = raw.replace(/```json|```/g, "").trim();
      const firstBrace = raw.indexOf("{");
      const lastBrace = raw.lastIndexOf("}");
      if (firstBrace === -1 || lastBrace === -1) {
        console.error("[plan/generate] JSON extraction failed — no braces found. raw:", raw);
        return NextResponse.json({ error: "AI returned invalid JSON — please try again." }, { status: 500 });
      }
      const jsonStr = raw.substring(firstBrace, lastBrace + 1);
      try {
        console.log("[plan/generate] JSON extraction succeeded, parsing", jsonStr.length, "chars");
        parsed = JSON.parse(jsonStr);
      } catch {
        console.error("[plan/generate] JSON.parse failed. jsonStr:", jsonStr);
        return NextResponse.json({ error: "AI returned invalid JSON — please try again." }, { status: 500 });
      }
    }

    for (const day of DAYS) {
      console.log(`${day} week1 exercises:`, parsed.week1?.[day]?.customExercises?.length ?? "MISSING");
    }
    for (const day of DAYS) {
      console.log(`${day} week2 exercises:`, parsed.week2?.[day]?.customExercises?.length ?? "MISSING");
    }

    for (const [weekKey, weekData] of [["week1", parsed.week1], ["week2", parsed.week2]] as [string, Record<string, DayPlan> | undefined][]) {
      if (!weekData) continue;
      for (const [day, dayPlan] of Object.entries(weekData)) {
        if (!dayPlan || ["rest", "stretch"].includes(dayPlan.typeId)) continue;
        if (Array.isArray(dayPlan.customExercises) && dayPlan.customExercises.length > 0) {
          console.log(`[plan/generate] ${weekKey} ${day} (${dayPlan.typeId}) bodyParts:`, dayPlan.customExercises.map((e) => e.bodyPart));
        }
        if (!Array.isArray(dayPlan.customExercises) || dayPlan.customExercises.length === 0) {
          console.error(`[plan/generate] ${weekKey} ${day} (${dayPlan.typeId}) returned no customExercises — AI ignored instructions`);
        }
      }
    }

    if (dryRun) {
      return NextResponse.json({ parsed, reasoning: parsed.reasoning ?? "" });
    }

    let activePlan = await prisma.trainingPlan.findFirst({ where: { userId, isActive: true } });
    if (!activePlan) {
      await prisma.trainingPlan.updateMany({ where: { userId }, data: { isActive: false } });
      activePlan = await prisma.trainingPlan.create({
        data: { userId, name: `AI Plan — ${new Date().toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}`, isActive: true },
      });
    }

    const upserts: Promise<unknown>[] = [];

    for (const week of ["1", "2"] as const) {
      const weekData = week === "1" ? parsed.week1 : parsed.week2;
      if (!weekData) continue;
      for (const day of DAYS) {
        const dayPlan = weekData[day];
        if (!dayPlan) continue;
        const typeId = dayPlan.typeId;
        if (!typeId || !VALID_TYPES.includes(typeId)) continue;
        const exercises = dayPlan.customExercises ?? [];
        const existing = await prisma.workoutPlan.findFirst({ where: { trainingPlanId: activePlan.id, day, week } });
        const upsert = existing
          ? prisma.workoutPlan.update({ where: { id: existing.id }, data: { typeId, exercises } })
          : prisma.workoutPlan.create({ data: { userId, trainingPlanId: activePlan.id, day, week, typeId, exercises } });
        upserts.push(upsert);
      }
    }

    await Promise.all(upserts);
    console.log("Saved to DB:", upserts.length, "sessions with exercises");

    const plan = await prisma.workoutPlan.findMany({ where: { trainingPlanId: activePlan.id }, orderBy: [{ week: "asc" }, { createdAt: "asc" }] });

    return NextResponse.json({ plan, reasoning: parsed.reasoning ?? "", activePlan });
  } catch (error) {
    console.error("[plan/generate] unexpected error:", error);
    return NextResponse.json({ error: "Server error — please try again." }, { status: 500 });
  }
}
