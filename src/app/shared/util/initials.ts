/** Neutral placeholder initials, shared by every "missing photo" block per ui-specifications.md. */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
