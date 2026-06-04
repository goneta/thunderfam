import { useState } from "react";
import { Mail, MapPin, Phone, Send, CheckCircle, MessageSquare } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { trpc } from "@/lib/trpc";

function ContactCard({
  flag,
  country,
  entity,
  address,
  phones,
  accentColor,
}: {
  flag: string;
  country: string;
  entity: string;
  address: string;
  phones: string[];
  accentColor: string;
}) {
  return (
    <div
      className="rounded-2xl p-6 border transition-shadow duration-300 hover:shadow-premium"
      style={{
        background: `${accentColor}06`,
        borderColor: `${accentColor}25`,
      }}
    >
      <div className="flex items-center gap-3 mb-5">
        <span className="text-2xl">{flag}</span>
        <div>
          <p className="font-display font-bold text-gray-900 text-sm leading-tight">{entity}</p>
          <p className="text-xs text-gray-400">{country}</p>
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div
            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5"
            style={{ background: `${accentColor}15` }}
          >
            <MapPin size={13} style={{ color: accentColor }} />
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">{address}</p>
        </div>
        {phones.map((phone, i) => (
          <div key={i} className="flex items-center gap-3">
            <div
              className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: `${accentColor}15` }}
            >
              <Phone size={13} style={{ color: accentColor }} />
            </div>
            <a
              href={`tel:${phone.replace(/\s/g, "")}`}
              className="text-xs text-gray-700 font-medium hover:underline transition-colors"
              style={{ color: accentColor }}
            >
              {phone}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ContactSection() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errors, setErrors] = useState<Partial<typeof form>>({});

  const sendContact = trpc.contact.send.useMutation({
    onSuccess: () => {
      setStatus("sent");
      setForm({ name: "", email: "", message: "" });
    },
    onError: () => setStatus("error"),
  });

  const validate = () => {
    const e: Partial<typeof form> = {};
    if (!form.name.trim()) e.name = "Le nom est requis.";
    if (!form.email.trim()) e.email = "L'email est requis.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Adresse email invalide.";
    if (!form.message.trim() || form.message.trim().length < 10)
      e.message = "Le message doit comporter au moins 10 caractères.";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setStatus("sending");
    sendContact.mutate({ name: form.name, email: form.email, message: form.message });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const [headerRef, headerVisible] = useScrollReveal<HTMLDivElement>({ threshold: 0.2 });
  const [infoRef, infoVisible] = useScrollReveal<HTMLDivElement>({ threshold: 0.1 });
  const [formRef, formVisible] = useScrollReveal<HTMLDivElement>({ threshold: 0.1 });

  return (
    <section
      id="contact"
      className="section-padding relative overflow-hidden"
      style={{
        background: "linear-gradient(180deg, white 0%, var(--color-smoke) 100%)",
      }}
    >
      {/* Top decoration */}
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
            <MessageSquare size={14} style={{ color: "var(--color-gold)" }} />
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: "var(--color-gold-dark)" }}
            >
              Échangeons
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-gray-900 mb-4">
            Nous contacter
          </h2>
          <div className="divider-gold mx-auto mb-6" />
          <p className="text-gray-500 max-w-xl mx-auto text-lg leading-relaxed">
            Notre équipe est disponible pour répondre à toutes vos questions et vous
            accompagner dans vos projets.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-12 items-start">
          {/* Left: contact info */}
          <div
            ref={infoRef}
            className={`lg:col-span-2 flex flex-col gap-6 reveal reveal-left ${infoVisible ? "is-visible" : ""}`}
          >
            <div>
              <h3 className="font-display font-bold text-gray-900 text-lg mb-2">
                Nos bureaux
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Thunderfam Group Limited est présent sur deux continents pour vous
                servir au mieux.
              </p>
            </div>

            <ContactCard
              flag="🇬🇧"
              country="Royaume-Uni"
              entity="Thunderfam Group Ltd UK"
              address="152 Tower Road, Tividale, Oldbury, West Midlands, United Kingdom, B69 1PE"
              phones={["+44 736 270 3933"]}
              accentColor="#4285F4"
            />
            <ContactCard
              flag="🇨🇮"
              country="Côte d'Ivoire"
              entity="Thunderfam Group Limited Côte d'Ivoire"
              address="Abidjan Cocody, Boulevard de l'Université, 166 Logement, Bloc F3 Appartement, non loin de la RTI"
              phones={["+225 05 00 78 23 04", "+225 07 08 53 47 84"]}
              accentColor="#34A853"
            />

            {/* Email */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-100">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "var(--color-gold)20" }}
              >
                <Mail size={15} style={{ color: "var(--color-gold-dark)" }} />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Email général</p>
                <p className="text-sm font-semibold text-gray-800">
                  contact@thunderfamgroup.com
                </p>
              </div>
            </div>
          </div>

          {/* Right: form */}
          <div
            ref={formRef}
            className={`lg:col-span-3 reveal reveal-right reveal-delay-2 ${formVisible ? "is-visible" : ""}`}
          >
            <div className="glass-card rounded-3xl p-8 md:p-10 shadow-premium">
              {status === "sent" ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
                    style={{ background: "#34A85320" }}
                  >
                    <CheckCircle size={32} style={{ color: "#34A853" }} />
                  </div>
                  <h3 className="font-display font-bold text-gray-900 text-xl mb-2">
                    Message envoyé !
                  </h3>
                  <p className="text-gray-500 text-sm max-w-xs leading-relaxed mb-6">
                    Merci pour votre message. Notre équipe vous répondra dans les
                    plus brefs délais.
                  </p>
                  <button
                    onClick={() => setStatus("idle")}
                    className="px-6 py-2.5 text-sm font-semibold rounded-xl text-white"
                    style={{
                      background: "linear-gradient(135deg, var(--color-gold-dark), var(--color-gold))",
                    }}
                  >
                    Envoyer un autre message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
                  <div>
                    <h3 className="font-display font-bold text-gray-900 text-xl mb-1">
                      Envoyez-nous un message
                    </h3>
                    <p className="text-sm text-gray-400">
                      Remplissez le formulaire ci-dessous, nous vous répondrons rapidement.
                    </p>
                  </div>

                  {/* Name */}
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2"
                    >
                      Nom complet <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Votre nom et prénom"
                      className={`w-full px-4 py-3.5 rounded-xl text-sm border transition-all duration-200 outline-none bg-white/80 ${
                        errors.name
                          ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                          : "border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-50"
                      }`}
                      style={{ fontFamily: "var(--font-sans)" }}
                    />
                    {errors.name && (
                      <p className="mt-1.5 text-xs text-red-500">{errors.name}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2"
                    >
                      Adresse email <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="votre@email.com"
                      className={`w-full px-4 py-3.5 rounded-xl text-sm border transition-all duration-200 outline-none bg-white/80 ${
                        errors.email
                          ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                          : "border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-50"
                      }`}
                      style={{ fontFamily: "var(--font-sans)" }}
                    />
                    {errors.email && (
                      <p className="mt-1.5 text-xs text-red-500">{errors.email}</p>
                    )}
                  </div>

                  {/* Message */}
                  <div>
                    <label
                      htmlFor="message"
                      className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2"
                    >
                      Message <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={5}
                      value={form.message}
                      onChange={handleChange}
                      placeholder="Décrivez votre projet ou votre demande..."
                      className={`w-full px-4 py-3.5 rounded-xl text-sm border transition-all duration-200 outline-none resize-none bg-white/80 ${
                        errors.message
                          ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                          : "border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-50"
                      }`}
                      style={{ fontFamily: "var(--font-sans)" }}
                    />
                    {errors.message && (
                      <p className="mt-1.5 text-xs text-red-500">{errors.message}</p>
                    )}
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={status === "sending"}
                    className="flex items-center justify-center gap-2 w-full py-4 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                    style={{
                      background: "linear-gradient(135deg, var(--color-gold-dark), var(--color-gold))",
                    }}
                  >
                    {status === "sending" ? (
                      <>
                        <span
                          className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                        />
                        Envoi en cours…
                      </>
                    ) : (
                      <>
                        <Send size={15} />
                        Envoyer le message
                      </>
                    )}
                  </button>

                  <p className="text-xs text-gray-400 text-center">
                    En soumettant ce formulaire, vous acceptez que vos données soient
                    utilisées pour traiter votre demande.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
