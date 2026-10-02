import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "./db/index.js";
import { users } from "./db/schema.js";
import { hashPassword } from "./utils/password.js";

async function seed() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    console.error("Faltan SEED_ADMIN_EMAIL y/o SEED_ADMIN_PASSWORD en el .env");
    process.exit(1);
  }

  const [existing] = await db.select().from(users).where(eq(users.email, email));

  if (existing) {
    console.log(`El usuario ${email} ya existe, no se crea de nuevo.`);
    process.exit(0);
  }

  const passwordHash = await hashPassword(password);

  await db.insert(users).values({
    email,
    passwordHash,
    role: "admin",
  });

  console.log(`Admin creado: ${email}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Error en el seed:", err);
  process.exit(1);
});