export const STAGE_LABELS: Record<string, string> = {
  POOL: "Pool Play",
  ROUND_OF_16: "Round of 16",
  QUARTERFINAL: "Quarterfinal",
  SEMIFINAL: "Semifinal",
  FINAL: "Final",
};

export const STAGE_ORDER: Record<string, number> = {
  POOL: 0,
  ROUND_OF_16: 1,
  QUARTERFINAL: 2,
  SEMIFINAL: 3,
  FINAL: 4,
};

export function roundTabLabel(stage: string, round: number): string {
  if (stage === "POOL") return `Round ${round}`;
  return STAGE_LABELS[stage] ?? `${stage} ${round}`;
}
