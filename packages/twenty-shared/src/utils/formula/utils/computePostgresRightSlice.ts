// Mirrors Postgres RIGHT(text, n): negative n drops the first |n| characters.
export const computePostgresRightSlice = ({
  text,
  characterCount,
}: {
  text: string;
  characterCount: number;
}): string => {
  const truncatedCount = Math.trunc(characterCount);

  if (truncatedCount === 0) {
    return '';
  }

  return truncatedCount > 0
    ? text.slice(-truncatedCount)
    : text.slice(Math.abs(truncatedCount));
};
