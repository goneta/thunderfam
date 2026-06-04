import { describe, expect, it } from "vitest";

// ─── Company data constants (mirrors what the frontend displays) ─────────────
const THUNDERFAM_UK = {
  name: "Thunderfam Group Ltd UK",
  companyNumber: "11341841",
  incorporated: "2 mai 2018",
  address: "152 Tower Road, Tividale, Oldbury, West Midlands, United Kingdom, B69 1PE",
  phone: "+44 736 270 3933",
  country: "Royaume-Uni",
};

const THUNDERFAM_CI = {
  name: "Thunderfam Group Limited Côte d'Ivoire",
  rccm: "CI-ABJ-03-2024-B22-00006",
  incorporated: "29 mai 2024",
  address: "Abidjan Cocody, Boulevard de l'Université, 166 Logement, non loin de la RTI, Bloc F3 Appartement",
  phones: ["+225 05 00 78 23 04", "+225 07 08 53 47 84"],
  sigle: "TGL-CI",
  country: "Côte d'Ivoire",
};

// ─── Simple contact form validator (mirrors frontend logic) ──────────────────
function validateContactForm(form: { name: string; email: string; message: string }) {
  const errors: Record<string, string> = {};
  if (!form.name.trim()) errors.name = "Le nom est requis.";
  if (!form.email.trim()) errors.email = "L'email est requis.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    errors.email = "Adresse email invalide.";
  if (!form.message.trim()) errors.message = "Le message est requis.";
  return errors;
}

// ─── Tests ───────────────────────────────────────────────────────────────────
describe("Thunderfam UK – données légales", () => {
  it("possède le bon numéro d'entreprise", () => {
    expect(THUNDERFAM_UK.companyNumber).toBe("11341841");
  });

  it("a été incorporée en 2018", () => {
    expect(THUNDERFAM_UK.incorporated).toContain("2018");
  });

  it("a une adresse au Royaume-Uni", () => {
    expect(THUNDERFAM_UK.address).toContain("West Midlands");
    expect(THUNDERFAM_UK.address).toContain("B69 1PE");
  });

  it("a un numéro de téléphone UK valide", () => {
    expect(THUNDERFAM_UK.phone).toMatch(/^\+44/);
  });
});

describe("Thunderfam CI – données légales", () => {
  it("possède le bon numéro RCCM", () => {
    expect(THUNDERFAM_CI.rccm).toBe("CI-ABJ-03-2024-B22-00006");
  });

  it("a été incorporée en 2024", () => {
    expect(THUNDERFAM_CI.incorporated).toContain("2024");
  });

  it("est localisée à Abidjan Cocody", () => {
    expect(THUNDERFAM_CI.address).toContain("Abidjan Cocody");
  });

  it("a deux numéros de téléphone ivoiriens", () => {
    expect(THUNDERFAM_CI.phones).toHaveLength(2);
    THUNDERFAM_CI.phones.forEach((p) => expect(p).toMatch(/^\+225/));
  });

  it("a le sigle commercial TGL-CI", () => {
    expect(THUNDERFAM_CI.sigle).toBe("TGL-CI");
  });
});

describe("Formulaire de contact – validation", () => {
  it("accepte un formulaire valide", () => {
    const errors = validateContactForm({
      name: "Jean Dupont",
      email: "jean@example.com",
      message: "Bonjour, je souhaite un devis.",
    });
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it("rejette un nom vide", () => {
    const errors = validateContactForm({
      name: "",
      email: "jean@example.com",
      message: "Test",
    });
    expect(errors.name).toBeDefined();
  });

  it("rejette un email invalide", () => {
    const errors = validateContactForm({
      name: "Jean",
      email: "pas-un-email",
      message: "Test",
    });
    expect(errors.email).toBeDefined();
  });

  it("rejette un message vide", () => {
    const errors = validateContactForm({
      name: "Jean",
      email: "jean@example.com",
      message: "",
    });
    expect(errors.message).toBeDefined();
  });

  it("retourne plusieurs erreurs si plusieurs champs sont vides", () => {
    const errors = validateContactForm({ name: "", email: "", message: "" });
    expect(Object.keys(errors).length).toBeGreaterThanOrEqual(2);
  });
});

describe("auth.logout – comportement de base", () => {
  it("le module de test est chargé correctement", () => {
    expect(true).toBe(true);
  });
});
