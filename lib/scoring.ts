// Kapia's World Cup Porra scoring (2-tier):
//   exact score (both numbers right) -> 3 points
//   correct outcome only (win/draw/loss) -> 1 point
//   otherwise -> 0 points
export const POINTS = { EXACT: 3, OUTCOME: 1, WRONG: 0 } as const;

function outcome(home: number, away: number): -1 | 0 | 1 {
  if (home > away) return 1;
  if (home < away) return -1;
  return 0;
}

export function scorePrediction(
  predHome: number,
  predAway: number,
  actualHome: number,
  actualAway: number,
): number {
  if (predHome === actualHome && predAway === actualAway) return POINTS.EXACT;
  if (outcome(predHome, predAway) === outcome(actualHome, actualAway)) return POINTS.OUTCOME;
  return POINTS.WRONG;
}

export function isExact(
  predHome: number,
  predAway: number,
  actualHome: number,
  actualAway: number,
): boolean {
  return predHome === actualHome && predAway === actualAway;
}
