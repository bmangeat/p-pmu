import "server-only";
import { prisma } from "@/lib/prisma";
import { getValidationCode } from "@/lib/validation-code";
import { DEFAULT_BET_DEADLINE_MIN, nowMinutesInOffice } from "@/lib/config";

const SINGLETON_ID = "singleton";

// Heure limite des paris (minutes depuis minuit), réglable par l'admin.
export async function getBetDeadlineMin(): Promise<number> {
  const s = await prisma.appSetting.findUnique({ where: { id: SINGLETON_ID } });
  return s?.betDeadlineMin ?? DEFAULT_BET_DEADLINE_MIN;
}

export async function setBetDeadlineMin(min: number): Promise<void> {
  // S'assure que la ligne singleton existe (elle porte aussi le code de validation).
  await getValidationCode();
  await prisma.appSetting.update({
    where: { id: SINGLETON_ID },
    data: { betDeadlineMin: min },
  });
}

// Vrai si l'heure limite des paris est dépassée pour aujourd'hui.
export async function isPastBetDeadlineNow(): Promise<boolean> {
  return nowMinutesInOffice() >= (await getBetDeadlineMin());
}
