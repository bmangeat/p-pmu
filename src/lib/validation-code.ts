import "server-only";
import { randomInt } from "crypto";
import { prisma } from "@/lib/prisma";

// Code de validation des comptes : à USAGE UNIQUE.
// Stocké en base (ligne unique) et régénéré après chaque validation réussie.

const SINGLETON_ID = "singleton";

function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

// Renvoie le code courant (en crée un si aucun n'existe encore).
export async function getValidationCode(): Promise<string> {
  const existing = await prisma.appSetting.findUnique({ where: { id: SINGLETON_ID } });
  if (existing) return existing.validationCode;
  const created = await prisma.appSetting.create({
    data: { id: SINGLETON_ID, validationCode: generateCode() },
  });
  return created.validationCode;
}

// Génère un nouveau code (invalide l'ancien). Renvoie le nouveau code.
export async function regenerateValidationCode(): Promise<string> {
  const code = generateCode();
  await prisma.appSetting.upsert({
    where: { id: SINGLETON_ID },
    update: { validationCode: code },
    create: { id: SINGLETON_ID, validationCode: code },
  });
  return code;
}

// Vérifie le code et, si correct, valide le compte ET régénère un nouveau code
// (le code est ainsi consommé). Renvoie true si la validation a réussi.
export async function verifyAndConsume(userId: string, input: string): Promise<boolean> {
  const clean = (input || "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(clean)) return false;

  const current = await getValidationCode();
  if (clean !== current) return false;

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { verified: true } }),
    prisma.appSetting.update({
      where: { id: SINGLETON_ID },
      data: { validationCode: generateCode() },
    }),
  ]);
  return true;
}
