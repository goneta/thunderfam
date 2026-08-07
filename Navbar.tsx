import { useState, useEffect } from "react";
import { Menu, X, ShieldCheck, User, FileText, Receipt } from "lucide-react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";
import logoUrl from "./thunderfam_logo_dark.jpg";
import { hasPermission, type Role } from "@shared/permissions";

export default function Navbar() {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("accueil");

  // On réutilise la matrice RBAC partagée plutôt que de tester le rôle
  // à la main : afficher un lien que le serveur refusera ensuite serait
  // une incohérence entre ce qu'on montre et ce qui est permis.
  const canManageDocuments = hasPermission(
    (user?.role ?? null) as Role | null,
    "quotes:create"
  );

  const navLinks = [
    { labelKey: "nav.home", href: "#accueil", id: "accueil" },
    { labelKey: "nav.about", href: "#apropos", id: "apropos" },
    { labelKey: "nav.services", href: "#services", id: "services" },
    { labelKey: "nav.contact", href: "#contact", id: "contact" },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
      const sections = navLinks.map((l) => l.id);
      for (const id of [...sections].reverse()) {
        const el = document.getElementById(id);
        if (el && window.scrollY >= el.offsetTop - 120) {
          setActiveSection(id);
          break;
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setIsOpen(false);
    const id = href.replace("#", "");
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-shadow duration-300"
      style={{
        background: "#000000",
        boxShadow: scrolled
          ? "0 2px 20px rgba(0,0,0,0.5)"
          : "0 1px 0 rgba(255,255,255,0.08)",
      }}
    >
      <div className="container">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <button
            onClick={() => handleNavClick("#accueil")}
            className="flex items-center group"
            aria-label="Thunderfam Group Limited – Accueil"
          >
            <img
              src={logoUrl}
              alt="Thunderfam Group Limited"
              className="h-11 w-auto object-contain block"
              style={{ maxWidth: "185px" }}
            />
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = activeSection === link.id;
              return (
                <button
                  key={link.href}
                  onClick={() => handleNavClick(link.href)}
                  className="relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200"
                  style={{ color: isActive ? "#fff" : "rgba(255,255,255,0.65)" }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.color = "#fff")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.color = isActive
                      ? "#fff"
                      : "rgba(255,255,255,0.65)")
                  }
                >
                  {t(link.labelKey)}
                  {isActive && (
                    <span
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                      style={{ background: "var(--color-gold)" }}
                    />
                  )}
                </button>
              );
            })}

            {/* Language switcher */}
            <div className="ml-2">
              <LanguageSwitcher dark />
            </div>

            {/* Auth / Portal buttons */}
            {isAuthenticated ? (
              <div className="ml-2 flex items-center gap-2">
                <Link
                  href="/portal"
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl text-white transition-all duration-200 hover:scale-105 active:scale-95"
                  style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.18)" }}
                >
                  <User size={13} />
                  Mon espace
                </Link>
                {canManageDocuments && (
                  <>
                    <Link
                      href="/devis"
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl text-white transition-all duration-200 hover:scale-105 active:scale-95"
                      style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.18)" }}
                    >
                      <FileText size={13} />
                      Devis
                    </Link>
                    <Link
                      href="/factures"
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl text-white transition-all duration-200 hover:scale-105 active:scale-95"
                      style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.18)" }}
                    >
                      <Receipt size={13} />
                      Factures
                    </Link>
                  </>
                )}
                {(user?.role === "admin" || user?.role === "manager") && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                    style={{ background: "rgba(196,160,80,0.15)", border: "1px solid rgba(196,160,80,0.3)", color: "#c4a050" }}
                  >
                    <ShieldCheck size={13} />
                    Admin
                  </Link>
                )}
              </div>
            ) : (
              <button
                onClick={() => window.location.href = getLoginUrl()}
                className="ml-2 px-5 py-2.5 text-sm font-semibold rounded-xl text-white transition-all duration-200 hover:scale-105 active:scale-95"
                style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.18)" }}
              >
                Se connecter
              </button>
            )}

            <button
              onClick={() => handleNavClick("#contact")}
              className="ml-2 px-5 py-2.5 text-sm font-semibold rounded-xl text-white transition-all duration-200 hover:scale-105 active:scale-95 shadow-gold"
              style={{
                background: "linear-gradient(135deg, var(--color-gold-dark), var(--color-gold))",
              }}
            >
              {t("nav.contactUs")}
            </button>
          </nav>

          {/* Mobile: language + hamburger */}
          <div className="md:hidden flex items-center gap-2">
            <LanguageSwitcher dark />
            <button
              className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
              aria-expanded={isOpen}
            >
              {isOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ${
          isOpen ? "max-h-[28rem] opacity-100" : "max-h-0 opacity-0"
        }`}
        style={{
          background: "#111111",
          borderTop: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <nav className="container py-4 flex flex-col gap-1">
          {navLinks.map((link) => {
            const isActive = activeSection === link.id;
            return (
              <button
                key={link.href}
                onClick={() => handleNavClick(link.href)}
                className="text-left px-4 py-3 text-sm font-medium rounded-xl transition-colors"
                style={{
                  color: isActive ? "#fff" : "rgba(255,255,255,0.6)",
                  background: isActive ? "rgba(255,255,255,0.06)" : "transparent",
                }}
              >
                {isActive && (
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full mr-2 mb-0.5"
                    style={{ background: "var(--color-gold)" }}
                  />
                )}
                {t(link.labelKey)}
              </button>
            );
          })}
          {isAuthenticated ? (
            <>
              <Link
                href="/portal"
                className="flex items-center gap-2 text-left px-4 py-3 text-sm font-medium rounded-xl text-white/70 hover:text-white transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <User size={14} /> Mon espace client
              </Link>
              {canManageDocuments && (
                <>
                  <Link
                    href="/devis"
                    className="flex items-center gap-2 text-left px-4 py-3 text-sm font-medium rounded-xl text-white/70 hover:text-white transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <FileText size={14} /> Devis
                  </Link>
                  <Link
                    href="/factures"
                    className="flex items-center gap-2 text-left px-4 py-3 text-sm font-medium rounded-xl text-white/70 hover:text-white transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <Receipt size={14} /> Factures
                  </Link>
                </>
              )}
              {(user?.role === "admin" || user?.role === "manager") && (
                <Link
                  href="/admin"
                  className="flex items-center gap-2 text-left px-4 py-3 text-sm font-medium rounded-xl transition-colors"
                  style={{ color: "#c4a050" }}
                  onClick={() => setIsOpen(false)}
                >
                  <ShieldCheck size={14} /> Administration
                </Link>
              )}
            </>
          ) : (
            <button
              onClick={() => { setIsOpen(false); window.location.href = getLoginUrl(); }}
              className="text-left px-4 py-3 text-sm font-medium rounded-xl text-white/70 hover:text-white transition-colors"
            >
              Se connecter
            </button>
          )}
          <button
            onClick={() => handleNavClick("#contact")}
            className="mt-2 px-4 py-3 text-sm font-semibold rounded-xl text-white text-center shadow-gold"
            style={{
              background: "linear-gradient(135deg, var(--color-gold-dark), var(--color-gold))",
            }}
          >
            {t("nav.contactUs")}
          </button>
        </nav>
      </div>
    </header>
  );
}
