import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
// In a real app with many files, you might want to use a backend loader.
// For now, importing them statically ensures they are bundled.
import en from './locales/en/translation.json';
import fr from './locales/fr/translation.json';
import es from './locales/es/translation.json';
import ar from './locales/ar/translation.json';
import ja from './locales/ja/translation.json';
import zh from './locales/zh/translation.json';
import de from './locales/de/translation.json';
import ru from './locales/ru/translation.json';
import pt from './locales/pt/translation.json';
import uk from './locales/uk/translation.json';
import tr from './locales/tr/translation.json';
import it from './locales/it/translation.json';

i18n
    // detect user language
    // learn more: https://github.com/i18next/i18next-browser-languageDetector
    .use(LanguageDetector)
    // pass the i18n instance to react-i18next.
    .use(initReactI18next)
    // init i18next
    // for all options read: https://www.i18next.com/overview/configuration-options
    .init({
        debug: true,
        fallbackLng: 'en',
        detection: {
            order: ['querystring', 'localStorage'], // Allow URL override for SEO/Sitemap
            lookupQuerystring: 'lng',
            caches: ['localStorage'],
        },
        interpolation: {
            escapeValue: false, // not needed for react as it escapes by default
        },
        resources: {
            en: { translation: en },
            fr: { translation: fr },
            es: { translation: es },
            ar: { translation: ar },
            ja: { translation: ja },
            zh: { translation: zh },
            de: { translation: de },
            ru: { translation: ru },
            pt: { translation: pt },
            uk: { translation: uk },
            tr: { translation: tr },
            it: { translation: it },
        }
    });

export default i18n;
