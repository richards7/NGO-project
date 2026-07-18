import { getDb, initDb } from "./src/config/database";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const uuidv4 = () => crypto.randomUUID();

async function seed() {
  await initDb("sqlite");
  const db = getDb();
  console.log("Seeding roles and users...");

  const roles = ["admin", "registration", "medical_assistant", "doctor", "pharmacy"];
  for (const roleName of roles) {
    let role = await db.role.findUnique({ where: { name: roleName } });
    if (!role) {
      role = await db.role.create({
        data: {
          id: uuidv4(),
          name: roleName,
          description: `${roleName} role`,
        }
      });
    }
  }

  const hash = await bcrypt.hash("demo1234", 12);
  const demoUsers = [
    { name: "Dr. Ananya Rao", email: "admin@arogya.ngo", role: "admin" },
    { name: "Priya Sharma", email: "registration@arogya.ngo", role: "registration" },
    { name: "Dr. Vikram Iyer", email: "vikram@arogya.ngo", role: "doctor" },
    { name: "Suresh Kumar", email: "pharmacy@arogya.ngo", role: "pharmacy" },
  ];

  for (const u of demoUsers) {
    const role = await db.role.findUnique({ where: { name: u.role } });
    if (role) {
      let user = await db.user.findUnique({ where: { email: u.email } });
      if (!user) {
        await db.user.create({
          data: {
            id: uuidv4(),
            email: u.email,
            name: u.name,
            passwordHash: hash,
            roleId: role.id,
          }
        });
        console.log(`Created user ${u.email}`);
      } else {
        await db.user.update({
          where: { id: user.id },
          data: { passwordHash: hash }
        });
        console.log(`Updated user ${u.email}`);
      }
    }
  }

  console.log("Done seeding.");
}

seed().catch(console.error);
