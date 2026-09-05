export function toSelectItems<T extends { id: string; name: string }>(
  options: readonly T[] | undefined,
): Record<string, string> {
  return Object.fromEntries((options ?? []).map((option) => [option.id, option.name]));
}
