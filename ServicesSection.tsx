import { useState } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import {
  Monitor, Palette, Package, Banknote, Building, Hammer,
  Shield, UtensilsCrossed, GraduationCap, Leaf, Truck, Handshake,
  ChevronRight, Layers,
} from "lucide-react";

const services = [
  {
    id: "it",
    icon: Monitor,
    title: "Technologies de l'Information",
    color: "#4285F4",
    description: "Solutions numériques complètes pour transformer votre entreprise.",
    items: [
      "Conseil IT", "Développement logiciel", "Applications web",
      "Sites internet", "Applications mobiles", "Installation de systèmes",
      "Maintenance système", "Formation IA", "Automatisation IA",
      "Agents IA", "Solutions Cloud",
    ],
  },
  {
    id: "creative",
    icon: Palette,
    title: "Création & Digital",
    color: "#EA4335",
    description: "Identité visuelle et stratégie digitale pour votre marque.",
    items: [
      "Création de logos", "Design de flyers", "Cartes de visite",
      "Supports marketing", "Animation vidéo", "Publicité vidéo",
      "Marketing vidéo",
    ],
  },
  {
    id: "import",
    icon: Package,
    title: "Import & Export",
    color: "#FBBC05",
    description: "Commerce international de biens et produits entre continents.",
    items: ["Import et export de marchandises et produits"],
  },
  {
    id: "finance",
    icon: Banknote,
    title: "Services Financiers",
    color: "#34A853",
    description: "Transferts d'argent mobile et solutions financières en Afrique.",
    items: [
      "Transferts Mobile Money", "Orange Money",
      "MTN Money", "Moov Money", "Wave", "Djamo",
    ],
  },
  {
    id: "realestate",
    icon: Building,
    title: "Immobilier",
    color: "#4285F4",
    description: "Investissement, gestion et développement immobilier.",
    items: [
      "Vente de terrains", "Vente de propriétés",
      "Gestion immobilière", "Promotion immobilière",
    ],
  },
  {
    id: "construction",
    icon: Hammer,
    title: "Construction & BTP",
    color: "#EA4335",
    description: "Réalisation de projets de construction et d'infrastructure.",
    items: [
      "Construction de bâtiments", "Travaux publics",
      "Développement d'infrastructures", "Entretien immobilier",
    ],
  },
  {
    id: "security",
    icon: Shield,
    title: "Sécurité",
    color: "#FBBC05",
    description: "Services de sécurité professionnels et gestion du personnel.",
    items: ["Services d'agence de sécurité", "Gestion du personnel de sécurité"],
  },
  {
    id: "hospitality",
    icon: UtensilsCrossed,
    title: "Hôtellerie & Restauration",
    color: "#34A853",
    description: "Expériences d'accueil d'exception pour vos clients.",
    items: ["Hôtels", "Restaurants", "Services de traiteur"],
  },
  {
    id: "education",
    icon: GraduationCap,
    title: "Éducation & Formation",
    color: "#4285F4",
    description: "Programmes de formation professionnelle et académique.",
    items: ["Formation professionnelle", "Programmes éducatifs", "Formation d'entreprise"],
  },
  {
    id: "agriculture",
    icon: Leaf,
    title: "Agriculture & Élevage",
    color: "#34A853",
    description: "Projets agro-pastoraux et développement agricole.",
    items: ["Agriculture", "Élevage", "Projets agro-pastoraux"],
  },
  {
    id: "transport",
    icon: Truck,
    title: "Transport & Logistique",
    color: "#EA4335",
    description: "Solutions de transport routier et logistique intégrée.",
    items: ["Transport routier", "Services logistiques"],
  },
  {
    id: "commercial",
    icon: Handshake,
    title: "Représentation Commerciale",
    color: "#FBBC05",
    description: "Intermédiation et courtage commercial à l'international.",
    items: [
      "Représentation commerciale", "Intermédiation commerciale",
      "Courtage d'affaires",
    ],
  },
];

function ServiceCard({
  service,
  isActive,
  onClick,
}: {
  service: (typeof services)[0];
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = service.icon;
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-5 rounded-2xl transition-all duration-200 group border ${
        isActive ? "shadow-premium" : "hover:shadow-md"
      }`}
      style={{
        background: isActive
          ? `linear-gradient(135deg, ${service.color}12, ${service.color}06)`
          : "white",
        borderColor: isActive ? `${service.color}40` : "transparent",
        boxShadow: isActive ? `0 0 0 2px ${service.color}20` : undefined,
      }}
    >
      <div className="flex items-start gap-4">
        <div
          className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
          style={{
            background: isActive ? service.color : `${service.color}15`,
          }}
        >
          <Icon
            size={20}
            style={{ color: isActive ? "white" : service.color }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3
            className="font-display font-bold text-sm leading-tight mb-1"
            style={{ color: isActive ? service.color : "#1a1a2e" }}
          >
            {service.title}
          </h3>
          <p className="text-xs text-gray-400 leading-snug line-clamp-2">
            {service.description}
          </p>
        </div>
        <ChevronRight
          size={16}
          className={`flex-shrink-0 mt-1 transition-transform duration-200 ${
            isActive ? "rotate-90" : "group-hover:translate-x-1"
          }`}
          style={{ color: isActive ? service.color : "#9ca3af" }}
        />
      </div>
    </button>
  );
}

export default function ServicesSection() {
  const [activeId, setActiveId] = useState("it");
  const active = services.find((s) => s.id === activeId) ?? services[0];
  const ActiveIcon = active.icon;

  const [headerRef, headerVisible] = useScrollReveal<HTMLDivElement>({ threshold: 0.2 });
  const [listRef, listVisible] = useScrollReveal<HTMLDivElement>({ threshold: 0.05 });
  const [panelRef, panelVisible] = useScrollReveal<HTMLDivElement>({ threshold: 0.1 });

  return (
    <section
      id="services"
      className="section-padding relative overflow-hidden"
      style={{ background: "var(--color-smoke)" }}
    >
      {/* Decoration */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent, var(--color-gold), transparent)",
        }}
      />

      <div className="container relative">
        {/* Section header */}
        <div
          ref={headerRef}
          className={`text-center mb-16 reveal ${headerVisible ? "is-visible" : ""}`}
        >
          <div className="inline-flex items-center gap-2 mb-4">
            <Layers size={14} style={{ color: "var(--color-gold)" }} />
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: "var(--color-gold-dark)" }}
            >
              Nos domaines
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-gray-900 mb-4">
            Nos services
          </h2>
          <div className="divider-gold mx-auto mb-6" />
          <p className="text-gray-500 max-w-2xl mx-auto text-lg leading-relaxed">
            Thunderfam Group Limited intervient dans{" "}
            <strong className="text-gray-700">12 secteurs stratégiques</strong>, offrant
            une gamme complète de services adaptés aux besoins des entreprises et des
            particuliers en Europe et en Afrique.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Left: service list */}
          <div
            ref={listRef}
            className={`lg:col-span-2 flex flex-col gap-2 reveal reveal-left ${listVisible ? "is-visible" : ""}`}
          >
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                isActive={activeId === service.id}
                onClick={() => setActiveId(service.id)}
              />
            ))}
          </div>

          {/* Right: detail panel */}
          <div
            ref={panelRef}
            className={`lg:col-span-3 lg:sticky lg:top-28 self-start reveal reveal-right reveal-delay-2 ${panelVisible ? "is-visible" : ""}`}
          >
            <div
              key={activeId}
              className="rounded-3xl overflow-hidden shadow-premium animate-fade-in"
            >
              {/* Panel header */}
              <div
                className="p-8 relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${active.color} 0%, ${active.color}cc 100%)`,
                }}
              >
                <div
                  className="absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-20"
                  style={{ background: "white" }}
                />
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mb-4 backdrop-blur-sm">
                    <ActiveIcon size={28} className="text-white" />
                  </div>
                  <h3 className="text-2xl font-display font-bold text-white mb-2">
                    {active.title}
                  </h3>
                  <p className="text-white/80 text-sm leading-relaxed">
                    {active.description}
                  </p>
                </div>
              </div>

              {/* Panel body */}
              <div className="bg-white p-8">
                <p
                  className="text-xs font-bold uppercase tracking-widest mb-5"
                  style={{ color: active.color }}
                >
                  Prestations incluses
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {active.items.map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-gray-50"
                    >
                      <div
                        className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: `${active.color}20` }}
                      >
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: active.color }}
                        />
                      </div>
                      <span className="text-sm text-gray-700 font-medium">{item}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <button
                    onClick={() =>
                      document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })
                    }
                    className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      background: `linear-gradient(135deg, ${active.color}dd, ${active.color})`,
                    }}
                  >
                    Demander un devis pour ce service
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
