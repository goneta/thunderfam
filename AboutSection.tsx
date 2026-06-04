import { Building2, MapPin, Phone, Hash, Calendar, Flag } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

function InfoRow({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <div
        className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5"
        style={{ background: `${color}15` }}
      >
        <Icon size={15} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-sm text-gray-800 font-medium leading-snug">{value}</p>
      </div>
    </div>
  );
}

function EntityCard({
  flag,
  country,
  entity,
  companyNumber,
  rccm,
  incorporated,
  address,
  phones,
  accentColor,
  badge,
  revealClass = "",
  revealDelay = "",
}: {
  flag: string;
  country: string;
  entity: string;
  companyNumber?: string;
  rccm?: string;
  incorporated: string;
  address: string;
  phones: string[];
  accentColor: string;
  badge: string;
  revealClass?: string;
  revealDelay?: string;
}) {
  const [ref, visible] = useScrollReveal<HTMLDivElement>({ threshold: 0.1 });

  return (
    <div
      ref={ref}
      className={`glass-card rounded-2xl overflow-hidden shadow-premium group hover:shadow-gold transition-shadow duration-300 reveal ${revealClass} ${revealDelay} ${visible ? "is-visible" : ""}`}
    >
      {/* Card header */}
      <div
        className="px-6 py-5 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${accentColor}18 0%, ${accentColor}08 100%)`,
          borderBottom: `2px solid ${accentColor}25`,
        }}
      >
        <div
          className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 -translate-y-1/2 translate-x-1/2"
          style={{ background: accentColor }}
        />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{flag}</span>
              <span
                className="text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                style={{
                  background: `${accentColor}20`,
                  color: accentColor,
                  border: `1px solid ${accentColor}30`,
                }}
              >
                {badge}
              </span>
            </div>
            <h3 className="font-display font-bold text-gray-900 text-lg leading-tight">
              {entity}
            </h3>
            <p className="text-sm text-gray-500 mt-1">{country}</p>
          </div>
        </div>
      </div>

      {/* Card body */}
      <div className="px-6 py-4">
        {companyNumber && (
          <InfoRow icon={Hash} label="Numéro d'entreprise" value={companyNumber} color={accentColor} />
        )}
        {rccm && (
          <InfoRow icon={Hash} label="N° RCCM" value={rccm} color={accentColor} />
        )}
        <InfoRow icon={Calendar} label="Date d'incorporation" value={incorporated} color={accentColor} />
        <InfoRow icon={MapPin} label="Adresse" value={address} color={accentColor} />
        {phones.map((phone, i) => (
          <InfoRow
            key={i}
            icon={Phone}
            label={phones.length > 1 ? `Téléphone ${i + 1}` : "Téléphone"}
            value={phone}
            color={accentColor}
          />
        ))}
      </div>
    </div>
  );
}

export default function AboutSection() {
  const [headerRef, headerVisible] = useScrollReveal<HTMLDivElement>({ threshold: 0.2 });
  const [quoteRef, quoteVisible] = useScrollReveal<HTMLDivElement>({ threshold: 0.15 });
  const [badgeRef, badgeVisible] = useScrollReveal<HTMLDivElement>({ threshold: 0.5 });

  return (
    <section id="apropos" className="section-padding bg-white relative overflow-hidden">
      {/* Subtle background decoration */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{
          background: "linear-gradient(90deg, var(--color-g-blue), var(--color-g-red), var(--color-g-yellow), var(--color-g-green))",
        }}
      />
      <div
        className="absolute -right-48 top-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-5 pointer-events-none"
        style={{ background: "var(--color-gold)" }}
      />

      <div className="container relative">
        {/* Section header */}
        <div
          ref={headerRef}
          className={`text-center mb-16 reveal ${headerVisible ? "is-visible" : ""}`}
        >
          <div className="inline-flex items-center gap-2 mb-4">
            <Flag size={14} style={{ color: "var(--color-gold)" }} />
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: "var(--color-gold-dark)" }}
            >
              Notre identité
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-gray-900 mb-4">
            À propos du groupe
          </h2>
          <div className="divider-gold mx-auto mb-6" />
          <p className="text-gray-500 max-w-2xl mx-auto text-lg leading-relaxed">
            Thunderfam Group Limited est un groupe international fondé au Royaume-Uni en 2018,
            avec une présence active en Côte d'Ivoire depuis 2024. Notre ambition : offrir des
            services d'excellence à travers une multitude de secteurs stratégiques.
          </p>
        </div>

        {/* Mission statement */}
        <div
          ref={quoteRef}
          className={`rounded-2xl p-8 md:p-10 mb-16 relative overflow-hidden reveal reveal-scale ${quoteVisible ? "is-visible" : ""}`}
          style={{
            background: "linear-gradient(135deg, #0a0a1a 0%, #0d1b3e 100%)",
          }}
        >
          <div
            className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 -translate-y-1/2 translate-x-1/2"
            style={{ background: "var(--color-gold)" }}
          />
          <div className="relative max-w-3xl">
            <div
              className="w-12 h-1 rounded mb-6"
              style={{ background: "var(--color-gold)" }}
            />
            <blockquote className="font-serif italic text-xl md:text-2xl text-white/90 leading-relaxed mb-6">
              "Bâtir des ponts entre les continents, créer de la valeur pour nos clients
              et contribuer au développement économique des territoires où nous opérons."
            </blockquote>
            <p
              className="text-sm font-semibold tracking-widest uppercase"
              style={{ color: "var(--color-gold)" }}
            >
              — La mission de Thunderfam Group Limited
            </p>
          </div>
        </div>

        {/* Entity cards — glissement depuis les côtés */}
        <div className="grid md:grid-cols-2 gap-8">
          <EntityCard
            flag="🇬🇧"
            country="Royaume-Uni"
            entity="Thunderfam Group Ltd UK"
            companyNumber="11341841"
            incorporated="2 mai 2018"
            address="152 Tower Road, Tividale, Oldbury, West Midlands, United Kingdom, B69 1PE"
            phones={["+44 736 270 3933"]}
            accentColor="#4285F4"
            badge="Siège social"
            revealClass="reveal-left"
          />
          <EntityCard
            flag="🇨🇮"
            country="Côte d'Ivoire"
            entity="Thunderfam Group Limited Côte d'Ivoire"
            rccm="CI-ABJ-03-2024-B22-00006"
            incorporated="29 mai 2024"
            address="Abidjan Cocody, Boulevard de l'Université, 166 Logement, non loin de la RTI, Bloc F3 Appartement"
            phones={["+225 05 00 78 23 04", "+225 07 08 53 47 84"]}
            accentColor="#34A853"
            badge="Succursale"
            revealClass="reveal-right"
            revealDelay="reveal-delay-2"
          />
        </div>

        {/* Commercial name badge */}
        <div
          ref={badgeRef}
          className={`mt-6 flex justify-end reveal reveal-fade ${badgeVisible ? "is-visible" : ""}`}
        >
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold"
            style={{
              background: "#34A85315",
              color: "#34A853",
              border: "1px solid #34A85330",
            }}
          >
            <span className="font-bold">Sigle commercial :</span>
            <span>TGL-CI</span>
          </div>
        </div>
      </div>
    </section>
  );
}
