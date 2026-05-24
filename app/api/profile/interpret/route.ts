import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  console.log("[profile/interpret] ANTHROPIC_API_KEY defined:", !!apiKey);
  console.log("[profile/interpret] ANTHROPIC_API_KEY first 10 chars:", apiKey ? apiKey.slice(0, 10) : "undefined");

  const userId = req.cookies.get("gymiq-user")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { transcript } = await req.json();
  if (!transcript?.trim()) return NextResponse.json({ error: "No transcript provided" }, { status: 400 });

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `Extract gym profile information from this spoken transcript. Be thorough — extract every field that can be inferred, even if the speaker doesn't use exact terminology.

Return ONLY valid JSON with any of these fields that are mentioned or can be inferred (omit fields not mentioned):
- name: full name
- age: number as string
- weight: body weight in kg as number
- experience: exactly one of "Beginner", "Intermediate", "Advanced"
- occupation: job title (e.g. "Electrician", "Nurse", "Teacher")
- physicalDemand: exactly one of "Desk/office", "Light physical", "Moderate physical (trades)", "Heavy physical (labour)", "Mixed"
- workHours: work hours as a range string (e.g. "7am-4pm")
- wakeTime: wake-up time in "HH:MM" 24hr format (e.g. "05:30")
- sleepTime: sleep time in "HH:MM" 24hr format (e.g. "22:00")
- gymTime: gym time in "HH:MM" 24hr format (e.g. "06:00")
- injuries: description of injuries or physical limitations
- goals: array of training goal strings
- weakPoints: array, only values from: "Chest", "Back", "Shoulders", "Arms", "Legs", "Core"

Examples of what to listen for:
- "I wake up at 5:30" → wakeTime: "05:30"
- "I train at 6am" or "I get to the gym at 6" → gymTime: "06:00"
- "I go to bed around 10" → sleepTime: "22:00"
- "I work 7 to 4" or "7am to 4pm" → workHours: "7am-4pm"
- "I'm an electrician" → occupation: "Electrician", physicalDemand: "Moderate physical (trades)"
- "I'm a nurse" → occupation: "Nurse", physicalDemand: "Light physical"
- "I sit at a desk all day" → physicalDemand: "Desk/office"
- "I do heavy labour" or "I'm a labourer" → physicalDemand: "Heavy physical (labour)"
- "my legs are lagging" or "I need to work on my legs" → weakPoints: ["Legs"]
- "I want to build size and get stronger" → goals: ["Build size", "Increase strength"]
- "I have a bad shoulder" or "left shoulder impingement" → injuries: "Left shoulder impingement"
- "I'm intermediate" → experience: "Intermediate"
- "I weigh 85 kilos" → weight: 85
- "I'm 28 years old" → age: "28"

Transcript: "${transcript}"

Return ONLY the JSON object. Do not include fields not mentioned. No markdown, no explanation.`,
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
  } catch (error) {
    console.error("[profile/interpret] Anthropic error message:", (error as Error)?.message);
    console.error("[profile/interpret] Anthropic error full object:", error);
    return NextResponse.json({ fields: {} });
  }
}
