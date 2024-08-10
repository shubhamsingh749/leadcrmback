import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

export default async function userSeeder(prisma: PrismaClient) {
  console.log("Seeding users...")
  const adminUser = await prisma.user.create({
    data: {
      name: "Admin",
      username: "admin",
      password: await bcrypt.hash("admin", 10),
    },
  });

  console.log({ adminUser });
}