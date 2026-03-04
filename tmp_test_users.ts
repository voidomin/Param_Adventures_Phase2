import { PrismaClient } from "@prisma/client";
export {};

const prisma = new PrismaClient();

const users = await prisma.user.findMany({
  where: {
    status: "ACTIVE",
  },
  select: {
    id: true,
    name: true,
    email: true,
    status: true,
  },
});

const allUsers = await prisma.user.findMany();
console.log("Active users:", users.length);
console.log("All users:", allUsers.length);
console.log(
  allUsers.map((u) => ({ id: u.id, name: u.name, status: u.status })),
);

await prisma.$disconnect();
