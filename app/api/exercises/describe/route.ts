import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  console.log("[exercises/describe] ANTHROPIC_API_KEY defined:", !!apiKey);
  console.log("[exercises/describe] ANTHROPIC_API_KEY first 10 chars:", apiKey ? apiKey.slice(0, 10) : "undefined");

  const userId = req.cookies.get("gymiq-user")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, bodyPart, equipment } = await req.json();
  if (!name || !bodyPart || !equipment) {
    return NextResponse.json({ error: "name, bodyPart, and equipment are required" }, { status: 400 });
  }

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      messages: [{
        role: "user",
        content: `Write a concise gym exercise description for "${name}" targeting ${bodyPart} using ${equipment}.
Include: how to perform it (3-5 steps), primary muscles worked, and one common mistake to avoid.
Plain text only, no markdown, under 120 words.`,
      }],
    });

    const description = message.content[0].type === "text" ? message.content[0].text.trim() : "";
    return NextResponse.json({ description });
  } catch (error) {
    console.error("[exercises/describe] Anthropic error message:", (error as Error)?.message);
    console.error("[exercises/describe] Anthropic error full object:", error);
    return NextResponse.json({ error: "Failed to generate description" }, { status: 500 });
  }
}
