// Minimal className utility — joins truthy strings, no external deps required.
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
