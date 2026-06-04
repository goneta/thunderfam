import { ChevronDown, Globe, Award, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";



export default function HeroSection() {
  const { t } = useTranslation();

  const stats = [
    { icon: Globe, value: "2", label: t("hero.stats.countries"), sublabel: t("hero.stats.countriesSub") },
    { icon: Award, value: "2018", label: t("hero.stats.founded"), sublabel: t("hero.stats.foundedSub") },
    { icon: TrendingUp, value: "12+", label: t("hero.stats.sectors"), sublabel: t("hero.stats.sectorsSub") },
  ];

  const handleScroll = () => {
    document.getElementById("apropos")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="accueil"
      className="relative min-h-screen flex items-center overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0a0a1a 0%, #0d1b3e 40%, #0a2240 70%, #0d1b2a 100%)",
      }}
    >
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large gold orb */}
        <div
          className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full opacity-10"
          style={{
            background: "radial-gradient(circle, var(--color-gold) 0%, transparent 70%)",
          }}
        />
        {/* Small gold orb bottom left */}
        <div
          className="absolute bottom-0 -left-24 w-[400px] h-[400px] rounded-full opacity-8"
          style={{
            background: "radial-gradient(circle, var(--color-gold-dark) 0%, transparent 70%)",
          }}
        />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />
        {/* Diagonal gold line */}
        <div
          className="absolute top-0 right-1/4 w-px h-full opacity-20"
          style={{
            background: "linear-gradient(180deg, transparent, var(--color-gold), transparent)",
          }}
        />
      </div>

      {/* Content */}
      <div className="container relative z-10 py-32 md:py-0">
        <div className="max-w-4xl">
          {/* Badge */}
          <div className="animate-fade-in inline-flex items-center gap-2 mb-8">
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold tracking-widest uppercase border"
              style={{
                background: "rgba(255,255,255,0.05)",
                borderColor: "rgba(180,140,60,0.4)",
                color: "var(--color-gold-light)",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: "var(--color-gold)" }}
              />
              {t("hero.badge")}
            </div>
          </div>

          {/* Main heading */}
          <h1 className="animate-fade-in-up delay-100 mb-6">
            <span className="block text-white text-5xl md:text-6xl lg:text-7xl font-display font-bold leading-none mb-2">
              {t("hero.title1")}
            </span>
            <span
              className="block text-4xl md:text-5xl lg:text-6xl font-display font-bold leading-none text-gradient-gold"
            >
              {t("hero.title2")}
            </span>
          </h1>

          {/* Divider */}
          <div className="animate-fade-in-up delay-200 flex items-center gap-4 mb-8">
            <div
              className="h-px flex-1 max-w-24"
              style={{
                background: "linear-gradient(90deg, var(--color-gold), transparent)",
              }}
            />
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: "var(--color-gold)" }}
            />
            <div
              className="h-px flex-1 max-w-24"
              style={{
                background: "linear-gradient(90deg, transparent, var(--color-gold))",
              }}
            />
          </div>

          {/* Tagline */}
          <p className="animate-fade-in-up delay-300 text-lg md:text-xl text-white/70 max-w-2xl leading-relaxed mb-10 font-light">
            {t("hero.tagline")}{" "}
            <span className="text-white font-medium">{t("hero.taglineUK")}</span>{" "}
            {t("hero.taglineAnd")}{" "}
            <span className="text-white font-medium">{t("hero.taglineCI")}</span>
            {t("hero.taglineEnd")}
          </p>

          {/* CTA buttons */}
          <div className="animate-fade-in-up delay-400 flex flex-wrap gap-4 mb-16">
            <button
              onClick={() => document.getElementById("services")?.scrollIntoView({ behavior: "smooth" })}
              className="px-8 py-4 text-sm font-semibold rounded-xl text-white transition-all duration-200 hover:scale-105 active:scale-95 shadow-gold"
              style={{
                background: "linear-gradient(135deg, var(--color-gold-dark), var(--color-gold))",
              }}
            >
              {t("hero.discoverServices")}
            </button>
            <button
              onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
              className="px-8 py-4 text-sm font-semibold rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "white",
              }}
            >
              {t("hero.contactUs")}
            </button>
          </div>

          {/* Stats */}
          <div className="animate-fade-in-up delay-500 grid grid-cols-3 gap-6 max-w-lg">
            {stats.map(({ icon: Icon, value, label, sublabel }) => (
              <div key={label} className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <Icon
                    size={14}
                    style={{ color: "var(--color-gold)" }}
                    className="flex-shrink-0"
                  />
                  <span
                    className="text-2xl font-display font-bold"
                    style={{ color: "var(--color-gold-light)" }}
                  >
                    {value}
                  </span>
                </div>
                <span className="text-xs font-semibold text-white/90 leading-tight">{label}</span>
                <span className="text-xs text-white/40 leading-tight">{sublabel}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <button
        onClick={handleScroll}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/40 hover:text-white/70 transition-colors animate-float"
        aria-label="Défiler vers le bas"
      >
        <span className="text-xs tracking-widest uppercase font-medium">{t("hero.scrollLabel")}</span>
        <ChevronDown size={18} />
      </button>

      {/* Bottom gradient fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{
          background: "linear-gradient(180deg, transparent, var(--color-background))",
        }}
      />
    </section>
  );
}
