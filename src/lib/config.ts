// Configuration et règles métier centralisées.

// Fuseau horaire du bureau : sert à déterminer "le jour" et à afficher les heures.
export const OFFICE_TZ = "Europe/Paris";

// Nom du retardataire suivi (affiché partout).
export function targetName(): string {
  return process.env.TARGET_NAME?.trim() || "Le retardataire";
}

// ----- Barème de score -----
// Présent bien deviné : BASE - écart_en_minutes (plancher 0) + BONUS si pile.
// Absent bien deviné : ABSENT_CORRECT (forfait, moins impactant).
// Mauvaise prédiction de présence : 0.
export const SCORE = {
  BASE: 100,
  PENALTY_PER_MIN: 1,
  EXACT_BONUS: 50,
  ABSENT_CORRECT: 25,
};

export type BetInput = { predictedMin: number | null; predictedAbsent: boolean };
export type Outcome = { actualMin: number | null; actualAbsent: boolean };

export function scoreBet(bet: BetInput, outcome: Outcome): number {
  // Résultat : absent
  if (outcome.actualAbsent) {
    return bet.predictedAbsent ? SCORE.ABSENT_CORRECT : 0;
  }
  // Résultat : présent — un pari "absent" ou sans heure ne marque rien
  if (bet.predictedAbsent || bet.predictedMin === null || outcome.actualMin === null) {
    return 0;
  }
  const diff = Math.abs(bet.predictedMin - outcome.actualMin);
  const base = Math.max(0, SCORE.BASE - diff * SCORE.PENALTY_PER_MIN);
  return base + (diff === 0 ? SCORE.EXACT_BONUS : 0);
}

// ----- Helpers de temps (minutes depuis minuit) -----

export function minutesToHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Convertit "HH:mm" en minutes depuis minuit. Renvoie null si invalide.
export function hhmmToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

// Date du jour "YYYY-MM-DD" dans le fuseau du bureau.
export function todayDateString(date = new Date()): string {
  // en-CA donne le format YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: OFFICE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

// Affichage lisible d'une date "YYYY-MM-DD" (ex: "mar. 3 juin").
export function formatDateLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
}

// ----- Admin -----

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase());
}
