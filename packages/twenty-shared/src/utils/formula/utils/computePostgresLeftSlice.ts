// Mirrors Postgres LEFT(text, n): negative n drops the last |n| characters.
export const computePostgresLeftSlice = ({
  text,
  characterCount,
}: {
  text: string;
  characterCount: number;
}): string => {
  const truncatedCount = Math.trunc(characterCount);

  return truncatedCount === 0 ? '' : text.slice(0, truncatedCount);
};
