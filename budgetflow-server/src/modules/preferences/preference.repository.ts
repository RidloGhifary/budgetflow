import { prisma } from "../../lib/prisma";

export function findUserPreferences(userId: string) {
  return prisma.userPreference.findUnique({
    where: { userId }
  });
}

export function createUserPreferences(userId: string) {
  return prisma.userPreference.create({
    data: { userId }
  });
}

export function upsertPrivacyMode(userId: string, privacyModeEnabled: boolean) {
  return prisma.userPreference.upsert({
    where: { userId },
    update: { privacyModeEnabled },
    create: {
      userId,
      privacyModeEnabled
    }
  });
}
