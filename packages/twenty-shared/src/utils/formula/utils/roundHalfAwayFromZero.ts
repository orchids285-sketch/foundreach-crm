// Mirrors Postgres ROUND(numeric) which rounds half away from zero,
// unlike Math.round which rounds half toward positive infinity.
export const roundHalfAwayFromZero = ({
  value,
  decimalCount,
}: {
  value: number;
  decimalCount: number;
}): number => {
  const factor = 10 ** Math.trunc(decimalCount);

  return (Math.sign(value) * Math.round(Math.abs(value) * factor)) / factor;
};
