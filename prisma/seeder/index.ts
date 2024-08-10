import { PrismaClient } from "@prisma/client";
import userSeeder from "./UserSeeder";

const prisma = new PrismaClient();

const main = () => {
    return Promise.all([userSeeder(prisma)]);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
