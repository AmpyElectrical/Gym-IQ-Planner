import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const userId = req.cookies.get("gymiq-user")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { transcript } = await req.json();
  if (!transcript?.trim()) return NextResponse.json({ error: "No transcript provided" }, { status: 400 });

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `Extract gym profile information from this speech transcript. Return ONLY a valid JSON object with any of these fields that are mentioned (omit fields not mentioned):

name, age (string), weight (number in kg), experience (one of: Beginner, Intermediate, Advanced), occupation, physicalDemand (one of: Desk/office, Light physical, Moderate physical (trades), Heavy physical (labour), Mixed), workHours, wakeTime, sleepTime, gymTime, injuries, goals (array of strings), weakPoints (array from: Chest, Back, Shoulders, Arms, Legs, Core)

Transcript: "${transcript}"

Return only the JSON object, no other text.`,
      },
    ],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "{}";

  try {
    const parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, "").trim());
    return NextResponse.json({ fields: parsed });
  } catch {
    return NextResponse.json({ fields: {} });
  }
}
