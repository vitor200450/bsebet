import { db } from "../packages/db/src";
import { user } from "../packages/db/src/schema";

const main = async () => {
  const allUsers = await db.select().from(user);
  console.log("Current Users and Roles:");
  allUsers.forEach((u) => console.log(`- ${u.email}: ${u.role}`));
  process.exit(0);
};

main();
