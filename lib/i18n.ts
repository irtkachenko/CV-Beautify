import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

const resources = {
  en: {
    translation: {
      common: {
        authenticating: "Authenticating...",
        loading: "Loading...",
        error: "Error",
        success: "Success",
      },
      landing: {
        title: "AI-Powered Resume Builder",
        subtitle: "Transform your DOCX into a beautiful, professional CV in seconds",
        cta: "Get Started",
      },
    },
  },
  uk: {
    translation: {
      common: {
        authenticating: "Автентифікація...",
        loading: "Завантаження...",
        error: "Помилка",
        success: "Успішно",
      },
      landing: {
        title: "AI-Резюме Білдер",
        subtitle: "Перетворіть ваш DOCX в красиве професійне CV за секунди",
        cta: "Почати",
      },
    },
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    lng: "en",
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
