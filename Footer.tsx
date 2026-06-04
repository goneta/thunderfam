import { useScrollReveal } from "@/hooks/useScrollReveal";
import { MapPin, Phone, Mail, ArrowUp } from "lucide-react";

const quickLinks = [
  { label: "Accueil", href: "#accueil" },
  { label: "À propos", href: "#apropos" },
  { label: "Services", href: "#services" },
  { label: "Contact", href: "#contact" },
];

const services = [
  "Technologies de l'Information",
  "Création & Digital",
  "Import & Export",
  "Services Financiers",
  "Immobilier",
  "Construction & BTP",
  "Transport & Logistique",
];

export default function Footer() {
  const [footerRef, footerVisible] = useScrollReveal<HTMLDivElement>({ threshold: 0.05 });

  const handleNav = (href: string) => {
    const id = href.replace("#", "");
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer
      className="relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #050510 0%, #0a0a1a 50%, #050510 100%)",
      }}
    >
      {/* Top gold line */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent, var(--color-gold), transparent)",
        }}
      />

      {/* Background decoration */}
      <div
        className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-5 pointer-events-none"
        style={{
          background: "radial-gradient(circle, var(--color-gold) 0%, transparent 70%)",
        }}
      />

      {/* Main footer content */}
      <div
        ref={footerRef}
        className={`container relative pt-16 pb-8 reveal ${footerVisible ? "is-visible" : ""}`}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand column */}
          <div className="lg:col-span-1">
            <div className="mb-5">
              <img
                src="/manus-storage/thunderfam_logo_dark_e8f49927.jpg"
                alt="Thunderfam Group Limited"
                className="h-12 w-auto object-contain brightness-100"
                style={{ maxWidth: "200px" }}
              />
            </div>
            <p className="text-sm text-white/50 leading-relaxed mb-6">
              Groupe international présent au Royaume-Uni depuis 2018 et en Côte
              d'Ivoire depuis 2024. Excellence, intégrité et innovation.
            </p>
            {/* Google brand color dots */}
            <div className="flex items-center gap-2">
              {["#4285F4", "#EA4335", "#FBBC05", "#34A853"].map((color) => (
                <div
                  key={color}
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: color }}
                />
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4
              className="text-xs font-bold uppercase tracking-widest mb-5"
              style={{ color: "var(--color-gold)" }}
            >
              Navigation
            </h4>
            <ul className="space-y-2.5">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <button
                    onClick={() => handleNav(link.href)}
                    className="text-sm text-white/50 hover:text-white transition-colors duration-200 link-underline"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4
              className="text-xs font-bold uppercase tracking-widest mb-5"
              style={{ color: "var(--color-gold)" }}
            >
              Nos services
            </h4>
            <ul className="space-y-2.5">
              {services.map((s) => (
                <li key={s}>
                  <button
                    onClick={() => handleNav("#services")}
                    className="text-sm text-white/50 hover:text-white transition-colors duration-200 text-left link-underline"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4
              className="text-xs font-bold uppercase tracking-widest mb-5"
              style={{ color: "var(--color-gold)" }}
            >
              Coordonnées
            </h4>
            <div className="space-y-5">
              {/* UK */}
              <div>
                <p className="text-xs font-semibold text-white/70 mb-2 flex items-center gap-1.5">
                  <span>🇬🇧</span> Royaume-Uni
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-start gap-2">
                    <MapPin size={12} className="flex-shrink-0 mt-0.5" style={{ color: "#4285F4" }} />
                    <p className="text-xs text-white/40 leading-relaxed">
                      152 Tower Road, Tividale, Oldbury, West Midlands, B69 1PE
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={12} className="flex-shrink-0" style={{ color: "#4285F4" }} />
                    <a
                      href="tel:+447362703933"
                      className="text-xs text-white/40 hover:text-white transition-colors"
                    >
                      +44 736 270 3933
                    </a>
                  </div>
                </div>
              </div>

              {/* CI */}
              <div>
                <p className="text-xs font-semibold text-white/70 mb-2 flex items-center gap-1.5">
                  <span>🇨🇮</span> Côte d'Ivoire
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-start gap-2">
                    <MapPin size={12} className="flex-shrink-0 mt-0.5" style={{ color: "#34A853" }} />
                    <p className="text-xs text-white/40 leading-relaxed">
                      Abidjan Cocody, Bvd de l'Université, Bloc F3
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={12} className="flex-shrink-0" style={{ color: "#34A853" }} />
                    <a
                      href="tel:+2250500782304"
                      className="text-xs text-white/40 hover:text-white transition-colors"
                    >
                      +225 05 00 78 23 04
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={12} className="flex-shrink-0" style={{ color: "#34A853" }} />
                    <a
                      href="tel:+2250708534784"
                      className="text-xs text-white/40 hover:text-white transition-colors"
                    >
                      +225 07 08 53 47 84
                    </a>
                  </div>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center gap-2">
                <Mail size={12} className="flex-shrink-0" style={{ color: "var(--color-gold)" }} />
                <a
                  href="mailto:contact@thunderfamgroup.com"
                  className="text-xs text-white/40 hover:text-white transition-colors"
                >
                  contact@thunderfamgroup.com
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div
          className="h-px mb-8"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)",
          }}
        />

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <p className="text-xs text-white/30 leading-relaxed">
              © {new Date().getFullYear()} Thunderfam Group Limited. Tous droits réservés.
            </p>
            <p className="text-xs text-white/20 mt-1 leading-relaxed">
              <span className="font-medium text-white/30">UK :</span> Company No. 11341841 —{" "}
              <span className="font-medium text-white/30">CI :</span> RCCM CI-ABJ-03-2024-B22-00006 · Sigle TGL-CI
            </p>
          </div>

          {/* Back to top */}
          <button
            onClick={scrollTop}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-white/40 hover:text-white transition-all duration-200 hover:bg-white/5"
          >
            <ArrowUp size={14} />
            Haut de page
          </button>
        </div>
      </div>
    </footer>
  );
}
