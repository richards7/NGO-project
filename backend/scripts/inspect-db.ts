import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Patients in Database ===");
  const patients = await prisma.patient.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  console.log(JSON.stringify(patients, null, 2));

  console.log("\n=== Audit Logs in Database ===");
  const logs = await prisma.auditLog.findMany({
    orderBy: { timestamp: "desc" },
    take: 5,
  });
  console.log(JSON.stringify(logs, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
