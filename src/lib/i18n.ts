export const locales = ['ka','en'] as const;
export type Locale = typeof locales[number];
export function isLocale(v: string): v is Locale {
  return locales.includes(v as any);
}
