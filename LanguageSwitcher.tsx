import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, type SupportedLang } from "@/i18n";
import { Globe } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export default function LanguageSwitcher({ dark = false }: { dark?: boolean }) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language)
    ?? SUPPORTED_LANGUAGES[0];

  const changeLanguage = (code: SupportedLang) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const textColor = dark ? "text-white/80 hover:text-white" : "text-gray-700 hover:text-gray-900";
  const dropdownBg = dark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200";
  const dropdownItem = dark
    ? "text-white/80 hover:bg-white/10 hover:text-white"
    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 text-sm font-medium transition-colors duration-150 px-2 py-1 rounded-lg ${textColor}`}
        aria-label="Change language"
      >
        <Globe size={15} className="flex-shrink-0" />
        <span>{current.flag}</span>
        <span className="hidden sm:inline">{current.code.toUpperCase()}</span>
      </button>

      {open && (
        <div
          className={`absolute right-0 mt-2 w-40 rounded-xl border shadow-lg overflow-hidden z-50 ${dropdownBg}`}
          style={{ animation: "fadeInUp 0.15s ease both" }}
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code as SupportedLang)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-100 ${dropdownItem} ${
                lang.code === i18n.language ? "font-semibold" : ""
              }`}
            >
              <span className="text-base">{lang.flag}</span>
              <span>{lang.label}</span>
              {lang.code === i18n.language && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-current opacity-60" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
