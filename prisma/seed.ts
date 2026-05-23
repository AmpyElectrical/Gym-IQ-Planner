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

  // Upsert Cody's account
  const today = new Date();
  const daysToLastMonday = today.getDay() === 0 ? 6 : today.getDay() - 1;
  const lastMonday = new Date(today);
  lastMonday.setDate(today.getDate() - daysToLastMonday);
  lastMonday.setHours(0, 0, 0, 0);

  const cody = await prisma.user.upsert({
    where: { username: "CodNic" },
    update: { password: "1234", firstName: "Cody", lastName: "Nicholas" },
    create: { username: "CodNic", password: "1234", firstName: "Cody", lastName: "Nicholas" },
  });

  await prisma.profile.upsert({
    where: { userId: cody.id },
    update: {
      name: "Cody Nicholas",
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
      userId: cody.id,
      name: "Cody Nicholas",
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
  console.log(`Cody's account upserted (id: ${cody.id}).`);

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
