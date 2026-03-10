/**
 * Format large numbers (e.g., 2400000 -> "2.4M")
 */
export function formatCount(count: number | bigint): string {
  const num = typeof count === 'bigint' ? Number(count) : count;
  if (num >= 1000000000) {
    return `${(num / 1000000000).toFixed(1)}B`;
  }
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}
