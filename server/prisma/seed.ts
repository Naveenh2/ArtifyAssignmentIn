import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@peblo.app";
  await prisma.user.deleteMany({ where: { email } });
  const passwordHash = await bcrypt.hash("demo12345", 12);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: "Demo User",
    },
  });

  const work = await prisma.tag.create({ data: { userId: user.id, name: "work" } });
  const ideas = await prisma.tag.create({ data: { userId: user.id, name: "ideas" } });

  const n1 = await prisma.note.create({
    data: {
      userId: user.id,
      title: "Weekly planning",
      content: "## Goals\n- Ship MVP\n- Write docs\n\nFollow up with team on Friday.",
      category: "Planning",
    },
  });
  await prisma.noteTag.createMany({
    data: [
      { noteId: n1.id, tagId: work.id },
      { noteId: n1.id, tagId: ideas.id },
    ],
  });

  const n2 = await prisma.note.create({
    data: {
      userId: user.id,
      title: "Book recommendations",
      content: "Deep Work — Cal Newport\nAtomic Habits",
      category: "Personal",
    },
  });
  await prisma.noteTag.create({ data: { noteId: n2.id, tagId: ideas.id } });

  await prisma.sharedNote.create({
    data: { noteId: n2.id, shareId: "demo-share-1" },
  });

  await prisma.aIUsage.createMany({
    data: [
      { userId: user.id, type: "COMBINED", model: "seed" },
      { userId: user.id, type: "COMBINED", model: "seed" },
    ],
  });

  console.log("Seed complete. Login:", email, "/ demo12345");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
