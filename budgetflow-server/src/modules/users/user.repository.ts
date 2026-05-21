import { prisma } from "../../lib/prisma";
import type { DbUser } from "../../types/user";
import { DEFAULT_CATEGORIES } from "../categories/category.defaults";

interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string;
}

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  return prisma.user.findUnique({
    where: { email }
  });
}

export async function findUserById(id: string): Promise<DbUser | null> {
  return prisma.user.findUnique({
    where: { id }
  });
}

export async function createUser(data: CreateUserInput): Promise<DbUser> {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data
    });

    await tx.category.createMany({
      data: DEFAULT_CATEGORIES.map((category) => ({
        userId: user.id,
        ...category
      })),
      skipDuplicates: true
    });

    return user;
  });
}
