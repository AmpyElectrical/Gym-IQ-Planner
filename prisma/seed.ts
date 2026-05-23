import { PrismaClient } from "@prisma/client";
import { BUILTIN_EXERCISES } from "../lib/exercises";

const prisma = new PrismaClient();

async function main() {
  console.log(`Seeding ${BUILTIN_EXERCISES.length} exercises...`);

  for (const ex of BUILTIN_EXERCISES) {
    await prisma.exercise.upsert({
      where: { name: ex.name },
      update: {
        bodyPart: ex.bodyPart,
        equipment: ex.equipment,
        difficulty: ex.difficulty,
        description: ex.description,
      },
      create: {
        id: ex.id,
        name: ex.name,
        bodyPart: ex.bodyPart,
        equipment: ex.equipment,
        difficulty: ex.difficulty,
        description: ex.description,
        isCustom: false,
      },
    });
  }

  // Seed test profile for the first user
  const firstUser = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (firstUser) {
    const today = new Date();
    const daysToLastMonday = today.getDay() === 0 ? 6 : today.getDay() - 1;
    const lastMonday = new Date(today);
    lastMonday.setDate(today.getDate() - daysToLastMonday);
    lastMonday.setHours(0, 0, 0, 0);

    await prisma.profile.upsert({
      where: { userId: firstUser.id },
      update: {
        name: "Cody",
        age: "29",
        weight: 84,
        experience: "Intermediate",
        occupation: "Electrician",
        physicalDemand: "Moderate physical (trades)",
        workHours: "7am-4pm",
        wakeTime: "05:30",
        sleepTime: "22:00",
        gymTime: "06:00",
        injuries: "None",
        goals: ["Build size overall", "Increase strength on big 3", "Bring legs up to match upper body"],
        weakPoints: ["Legs"],
        programStartDate: lastMonday,
      },
      create: {
        userId: firstUser.id,
        name: "Cody",
        age: "29",
        weight: 84,
        experience: "Intermediate",
        occupation: "Electrician",
        physicalDemand: "Moderate physical (trades)",
        workHours: "7am-4pm",
        wakeTime: "05:30",
        sleepTime: "22:00",
        gymTime: "06:00",
        injuries: "None",
        goals: ["Build size overall", "Increase strength on big 3", "Bring legs up to match upper body"],
        weakPoints: ["Legs"],
        programStartDate: lastMonday,
      },
    });
    console.log(`Test profile upserted for user ${firstUser.id}`);
  } else {
    console.log("No users found — skipping profile seed.");
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
