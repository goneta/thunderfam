import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import fr from "./fr";
import en from "./en";
import es from "./es";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
      es: { translation: es },
    },
    fallbackLng: "fr",
    defaultNS: "translation",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "thunderfam_lang",
    },
  });

export default i18n;
export const SUPPORTED_LANGUAGES = [
  { code: "fr", label: "Francais", flag: "FR" },
  { code: "en", label: "English", flag: "GB" },
  { code: "es", label: "Espanol", flag: "ES" },
] as const;

export type SupportedLang = "fr" | "en" | "es";
