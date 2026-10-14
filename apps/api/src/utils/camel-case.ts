export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

export function keysToCamelCase<T>(obj: T): T {
  if (Array.isArray(obj)) return obj.map(keysToCamelCase) as unknown as T;
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [toCamelCase(k), keysToCamelCase(v)])
    ) as T;
  }
  return obj;
}
