import { es, type Translations } from "./es";
import { en } from "./en";

export type { Translations };
export type Locale = "es" | "en";
const translations: Record<Locale, Translations> = { es, en };

export function getTranslations(locale: Locale): Translations {
  return translations[locale] || es;
}
