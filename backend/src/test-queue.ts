process.env.DATABASE_URL = "sqlite";
process.env.JWT_SECRET = "testsecretkey123456";
process.env.JWT_REFRESH_SECRET = "testsecretkey123456";
import { initDb, getDb } from "./config/database";
import { PatientService } from "./services/patient.service";

async function run() {
  await initDb("sqlite", "camp_data.db");
  const service = new PatientService();
  const queue = await service.getQueue();
  console.log("Queue Length:", queue.length);
  for (const q of queue) {
    console.log(q.id, q.name, q.status, q.queuedAt);
  }
}

run().catch(console.error);
