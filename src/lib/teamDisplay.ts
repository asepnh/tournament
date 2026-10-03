export function formatTeamName(
  label: string,
  player1Name?: string | null,
  player2Name?: string | null
): string {
  const names = [player1Name, player2Name].filter(
    (n): n is string => !!n && n.trim().length > 0
  );
  if (names.length === 0) return label;
  return `${label} (${names.join(" & ")})`;
}
