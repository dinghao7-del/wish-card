export type SupportedLocale = 'zh-CN' | 'en-US' | 'ja-JP' | 'ko-KR' | 'es-ES' | 'fr-FR';

export type LocaleText = Partial<Record<SupportedLocale, string>> & {
  'zh-CN': string;
  'en-US': string;
};

const SUPPORTED_LOCALES: SupportedLocale[] = ['zh-CN', 'en-US', 'ja-JP', 'ko-KR', 'es-ES', 'fr-FR'];

export function resolveSupportedLocale(language?: string): SupportedLocale {
  const normalized = language || 'zh-CN';
  const exact = SUPPORTED_LOCALES.find(locale => locale.toLowerCase() === normalized.toLowerCase());
  if (exact) return exact;
  const byPrefix = SUPPORTED_LOCALES.find(locale => locale.split('-')[0] === normalized.split('-')[0]);
  return byPrefix || 'zh-CN';
}

export function localeText(language: string | undefined, copy: LocaleText): string {
  const locale = resolveSupportedLocale(language);
  return copy[locale] || copy['en-US'] || copy['zh-CN'];
}

export function localeCountText(language: string | undefined, count: number, copy: LocaleText): string {
  return localeText(language, copy).replace('{{count}}', String(count));
}
