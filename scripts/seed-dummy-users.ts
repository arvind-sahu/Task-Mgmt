/**
 * Idempotent seed: dummy users for Tasker + Example projects.
 * Run: npm run db:seed:dummy
 */
import bcrypt from "bcryptjs";
import { PrismaClient, ProjectRole } from "@prisma/client";

const db = new PrismaClient();

const TASKER_NAMES = [
  "Purna",
  "Prem",
  "Pranay",
  "Raju",
  "Manish",
  "Ashish",
  "Ambuj",
] as const;

const TASKER_PASSWORD = "Ram@123";

type SeedUser = {
  name: string;
  email: string;
  password: string;
  companyName: string;
};

function taskerUsers(): SeedUser[] {
  return TASKER_NAMES.map((first) => ({
    name: `${first} Kumar`,
    email: `${first.toLowerCase()}@gmail.com`,
    password: `${first.charAt(0).toUpperCase()}${first.slice(1)}@123`,
    companyName: "Tasker",
  }));
}

function exampleUsers(): SeedUser[] {
  return TASKER_NAMES.map((first) => ({
    name: `${first}1`,
    email: `${first.toLowerCase()}1@gmail.com`,
    password: `${first.charAt(0).toUpperCase()}${first.slice(1)}@123`,
    companyName: "Example",
  }));
}

async function upsertUser(user: SeedUser) {
  const passwordHash = await bcrypt.hash(user.password, 10);
  return db.user.upsert({
    where: { email: user.email },
    create: {
      name: user.name,
      email: user.email,
      password: passwordHash,
      companyName: user.companyName,
      emailVerified: new Date(),
    },
    update: {
      name: user.name,
      password: passwordHash,
      companyName: user.companyName,
    },
    select: { id: true, email: true, name: true },
  });
}

async function ensureProject(input: {
  name: string;
  ownerId: string;
  memberIds: string[];
  color: string;
}) {
  let project = await db.project.findFirst({
    where: { name: input.name, ownerId: input.ownerId },
  });

  if (!project) {
    project = await db.project.create({
      data: {
        name: input.name,
        description: `Demo project for ${input.name}`,
        color: input.color,
        ownerId: input.ownerId,
      },
    });
    console.log(`Created project "${input.name}" (${project.id})`);
  } else {
    console.log(`Project "${input.name}" already exists (${project.id})`);
  }

  for (const userId of input.memberIds) {
    await db.projectMember.upsert({
      where: {
        userId_projectId: { userId, projectId: project.id },
      },
      create: {
        userId,
        projectId: project.id,
        role: userId === input.ownerId ? ProjectRole.OWNER : ProjectRole.MEMBER,
      },
      update: {},
    });
  }

  return project;
}

async function main() {
  const tasker = taskerUsers();
  const example = exampleUsers();

  console.log("Upserting Tasker company users…");
  const taskerRecords = [];
  for (const user of tasker) {
    const record = await upsertUser(user);
    taskerRecords.push(record);
    console.log(`  ✓ ${record.email} (${record.name})`);
  }

  console.log("\nUpserting Example company users…");
  const exampleRecords = [];
  for (const user of example) {
    const record = await upsertUser(user);
    exampleRecords.push(record);
    console.log(`  ✓ ${record.email} (${record.name})`);
  }

  const taskerOwner = taskerRecords[0]!;
  const exampleOwner = exampleRecords[0]!;

  console.log("\nEnsuring projects and memberships…");
  await ensureProject({
    name: "Tasker",
    ownerId: taskerOwner.id,
    memberIds: taskerRecords.map((u) => u.id),
    color: "#6366F1",
  });

  await ensureProject({
    name: "Example",
    ownerId: exampleOwner.id,
    memberIds: exampleRecords.map((u) => u.id),
    color: "#059669",
  });

  console.log("\nDone.");
  console.log("\nTasker project — all passwords: Ram@123");
  for (const user of tasker) {
    console.log(`  ${user.email}`);
  }
  console.log("\nExample project — passwords: Name@123 (e.g. Purna@123, Ambuj@123)");
  for (const user of example) {
    console.log(`  ${user.email} → ${user.password}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
