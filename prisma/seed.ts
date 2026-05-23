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

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
