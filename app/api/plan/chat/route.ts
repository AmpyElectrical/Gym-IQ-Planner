import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const userId = req.cookies.get("gymiq-user")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const messages: { role: "user" | "ai"; content: string }[] = body.messages ?? [];

    const profile = await prisma.profile.findUnique({ where: { userId } });

    const profileText = profile
      ? [
          `Name: ${profile.name || "unknown"}.`,
          `Age: ${profile.age || "unknown"}.`,
          `Experience: ${profile.experience || "intermediate"}.`,
          `Goals: ${Array.isArray(profile.goals) && (profile.goals as string[]).length ? (profile.goals as string[]).join(", ") : "general fitness"}.`,
          `Occupation: ${profile.occupation || "unknown"} (${profile.physicalDemand || "unknown physical demand"}).`,
          `Injuries: ${profile.injuries || "none"}.`,
          `Weak points: ${Array.isArray(profile.weakPoints) && (profile.weakPoints as string[]).length ? (profile.weakPoints as string[]).join(", ") : "none"}.`,
        ].join(" ")
      : "No profile set.";

    const anthropicMessages = messages
      .filter((m) => m.content.trim())
      .map((m) => ({
        role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
        content: m.content,
      }));

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      system: `You are a strength coach having a quick chat to understand what an athlete wants from their training plan before generating it. Ask focused questions — one or two at a time — to understand their goals, available training days, and any preferences. Keep replies to 2-3 sentences max. Don't generate the plan yourself; just gather information conversationally. Athlete profile: ${profileText}`,
      messages: anthropicMessages,
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    return new NextResponse(text, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error("Plan chat error:", error);
    return new NextResponse("Sorry, something went wrong. Please try again.", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
