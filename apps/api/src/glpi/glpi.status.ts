export const GLPI_STATUS_LABELS: Record<number, string> = {
  1: 'New',
  2: 'Processing',
  3: 'Processing',
  4: 'Pending',
  5: 'Solved',
  6: 'Closed',
  10: 'Approval',
};

export function mapGlpiStatus(code: number): string {
  return GLPI_STATUS_LABELS[code] ?? `Status ${code}`;
}
