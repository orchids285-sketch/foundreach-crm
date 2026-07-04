export const transpileFormulaSwitchToPostgresSql = (
  argumentsSql: string[],
): string => {
  const [expressionSql, ...caseAndValueSql] = argumentsSql;
  const hasDefaultValue = caseAndValueSql.length % 2 === 1;
  const defaultSql = hasDefaultValue
    ? caseAndValueSql[caseAndValueSql.length - 1]
    : 'NULL';
  const pairSql = hasDefaultValue
    ? caseAndValueSql.slice(0, -1)
    : caseAndValueSql;

  const whenClauses: string[] = [];

  for (let pairIndex = 0; pairIndex < pairSql.length; pairIndex += 2) {
    whenClauses.push(
      `WHEN ${pairSql[pairIndex]} THEN ${pairSql[pairIndex + 1]}`,
    );
  }

  return `CASE ${expressionSql} ${whenClauses.join(' ')} ELSE ${defaultSql} END`;
};
