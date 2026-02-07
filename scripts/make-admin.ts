import { db } from "../packages/db/src";
import { user } from "../packages/db/src/schema";
import { eq } from "drizzle-orm";

const email = process.argv[2];

if (!email) {
  console.error("Please provide an email address.");
  process.exit(1);
}

const main = async () => {
  console.log(`Making ${email} an admin...`);

  const [updatedUser] = await db
    .update(user)
    .set({ role: "admin" })
    .where(eq(user.email, email))
    .returning();

  if (updatedUser) {
    console.log(`User ${email} is now an ADMIN.`);
  } else {
    console.error(`User ${email} not found.`);
    console.log("Available users:");
    const allUsers = await db.select().from(user).limit(10);
    allUsers.forEach((u) => console.log(`- ${u.email} (${u.role})`));
  }

  process.exit(0);
};

main();
