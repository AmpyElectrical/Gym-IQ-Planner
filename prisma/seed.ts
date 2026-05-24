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

  const STRETCH_EXERCISES = [
    { name: "Hip Flexor Stretch",         description: "🎯 Targets: Hip flexors and quads.\n📋 How to do it: Kneel on one knee with the other foot forward. Push your hips forward and hold, keeping your torso upright.\n💡 Key tip: Squeeze the glute of the kneeling leg to deepen the stretch." },
    { name: "Hamstring Stretch",          description: "🎯 Targets: Hamstrings and lower back.\n📋 How to do it: Sit on the floor with legs straight. Hinge at the hips and reach towards your feet, keeping your back flat.\n💡 Key tip: Lead with your chest, not your shoulders, to get a true hamstring stretch." },
    { name: "Quad Stretch",               description: "🎯 Targets: Quadriceps.\n📋 How to do it: Stand on one foot and pull the opposite heel to your glute. Hold onto a wall for balance if needed.\n💡 Key tip: Keep knees together and stand tall — don't let the hip flare out." },
    { name: "Standing Calf Stretch",      description: "🎯 Targets: Calves and Achilles tendon.\n📋 How to do it: Face a wall, place one foot back with the heel flat on the ground. Lean into the wall until you feel a stretch in the calf.\n💡 Key tip: Slightly bend the back knee for a deeper stretch into the soleus." },
    { name: "Chest Opener",               description: "🎯 Targets: Chest and front shoulders.\n📋 How to do it: Clasp your hands behind your back, squeeze your shoulder blades together, and lift your chest towards the ceiling.\n💡 Key tip: Focus on squeezing the shoulder blades rather than just lifting the arms." },
    { name: "Lat Stretch",                description: "🎯 Targets: Lats and side body.\n📋 How to do it: Raise one arm overhead, grab a fixed object or simply reach as far as possible, and lean away to the opposite side.\n💡 Key tip: Keep your core braced to isolate the lat rather than bending at the waist." },
    { name: "Thoracic Rotation",          description: "🎯 Targets: Thoracic spine and obliques.\n📋 How to do it: Lie on your side with knees bent at 90 degrees. Keep the lower body still and rotate the top arm open, reaching towards the floor behind you.\n💡 Key tip: Let your breath guide the rotation — exhale as you open up." },
    { name: "Pigeon Pose",                description: "🎯 Targets: Glutes, hip flexors, and piriformis.\n📋 How to do it: From a plank, bring one knee forward to the same-side wrist and extend the back leg. Sink your hips toward the floor and rest on your forearms or forehead.\n💡 Key tip: If hips don't reach the floor, place a folded towel under the front hip." },
    { name: "Child's Pose",               description: "🎯 Targets: Lower back, glutes, and hips.\n📋 How to do it: Sit back onto your heels, extend your arms forward on the floor, and rest your forehead down. Breathe deeply and let the back relax.\n💡 Key tip: Walk your hands to one side to add a lat stretch." },
    { name: "Seated Forward Fold",        description: "🎯 Targets: Hamstrings, lower back, and calves.\n📋 How to do it: Sit with legs straight, flex your feet, hinge at the hips, and fold forward reaching for your feet.\n💡 Key tip: Use a strap or towel around your feet if you can't reach — keep the spine long." },
    { name: "Lying Glute Stretch",        description: "🎯 Targets: Glutes and piriformis.\n📋 How to do it: Lie on your back, cross one ankle over the opposite knee, flex the foot, then pull both legs toward your chest.\n💡 Key tip: Push the crossed knee away with your elbow to deepen the stretch." },
    { name: "Doorway Chest Stretch",      description: "🎯 Targets: Chest, front shoulders, and biceps.\n📋 How to do it: Stand in a doorway with forearms on each side of the frame. Step one foot through and lean your body forward until you feel a stretch across the chest.\n💡 Key tip: Try different arm heights to target different parts of the chest." },
    { name: "Cross Body Shoulder Stretch",description: "🎯 Targets: Rear deltoid and rotator cuff.\n📋 How to do it: Pull one arm horizontally across your chest with the opposite hand just above the elbow. Hold and switch sides.\n💡 Key tip: Keep your shoulder down — don't let it shrug up towards your ear." },
    { name: "Tricep Overhead Stretch",    description: "🎯 Targets: Triceps and lats.\n📋 How to do it: Raise one arm overhead, bend it at the elbow so the hand reaches down your back. Use the opposite hand to gently press the elbow back and down.\n💡 Key tip: Keep your head neutral — don't let it push forward." },
    { name: "Bicep Wall Stretch",         description: "🎯 Targets: Biceps and forearm flexors.\n📋 How to do it: Place your palm flat against a wall with fingers pointing down. Slowly rotate your body away from the wall until you feel a stretch in the bicep.\n💡 Key tip: Start with a gentle rotation — this stretch is more intense than it looks." },
    { name: "Neck Rolls",                 description: "🎯 Targets: Neck and upper traps.\n📋 How to do it: Slowly drop your chin to your chest, then roll your ear to one shoulder, pause, return to centre, and repeat to the other side.\n💡 Key tip: Never roll the head fully backwards — keep movement to the front and sides only." },
    { name: "Cat Cow",                    description: "🎯 Targets: Spine, core, and neck.\n📋 How to do it: On all fours, alternate between arching your back and dropping your belly (cow) and rounding your spine toward the ceiling (cat). Breathe with each movement.\n💡 Key tip: Move slowly and let your breath drive the motion for maximum spinal mobility." },
    { name: "World's Greatest Stretch",   description: "🎯 Targets: Hips, thoracic spine, hamstrings, and groin.\n📋 How to do it: Step into a deep lunge, place the same-side hand beside your foot, then rotate the opposite arm to the ceiling. Hold, then switch sides.\n💡 Key tip: Try to keep the back leg as straight as possible while reaching up." },
    { name: "Couch Stretch",              description: "🎯 Targets: Quad and hip flexor.\n📋 How to do it: Kneel with one shin resting against a wall or couch behind you. Bring the same-side thigh to vertical and hold upright, squeezing the glute.\n💡 Key tip: The closer your shin is to vertical on the wall, the more intense the stretch." },
    { name: "Figure Four Stretch",        description: "🎯 Targets: Glutes and piriformis.\n📋 How to do it: Lie on your back, cross one ankle over the opposite thigh, flex the foot, and pull both legs toward your chest.\n💡 Key tip: The more you pull the legs in, the deeper the glute stretch." },
    { name: "Supine Spinal Twist",        description: "🎯 Targets: Lower back, glutes, and thoracic spine.\n📋 How to do it: Lie on your back, pull one knee to your chest then guide it across your body with the opposite hand. Extend the same-side arm out and look away.\n💡 Key tip: Both shoulder blades should stay as flat to the floor as possible." },
    { name: "Downward Dog",               description: "🎯 Targets: Hamstrings, calves, shoulders, and spine.\n📋 How to do it: From all fours, tuck your toes and push your hips up and back, straightening your legs and pressing your heels toward the floor.\n💡 Key tip: Pedal the feet alternately to warm up tight calves before holding the full position." },
    { name: "Cobra Stretch",              description: "🎯 Targets: Abdominals, hip flexors, and thoracic spine.\n📋 How to do it: Lie face down, place palms under your shoulders, and press your chest up while keeping your hips on the floor.\n💡 Key tip: Engage your glutes lightly to protect the lower back as you lift." },
    { name: "Thread the Needle",          description: "🎯 Targets: Thoracic spine, shoulders, and upper back.\n📋 How to do it: On all fours, slide one arm under your body across the floor and let that shoulder drop toward the ground. Hold, then switch.\n💡 Key tip: Keep the hips square and high — the rotation all comes from the upper back." },
  ];

  console.log(`Seeding ${STRETCH_EXERCISES.length} stretch exercises...`);
  for (const ex of STRETCH_EXERCISES) {
    await prisma.exercise.upsert({
      where: { name: ex.name },
      update: { bodyPart: "stretch", equipment: "Bodyweight", description: ex.description },
      create: { name: ex.name, bodyPart: "stretch", equipment: "Bodyweight", difficulty: "beginner", description: ex.description, isCustom: false },
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
