import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import {
  LayoutDashboard,
  FolderOpen,
  CreditCard,
  FileText,
  LifeBuoy,
  Bell,
  LogOut,
  ChevronRight,
  Plus,
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Menu,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import logoUrl from "./thunderfam_logo_dark.jpg";

// ─── Status helpers ───────────────────────────────────────────────
const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "En attente", color: "bg-yellow-500/20 text-yellow-300", icon: <Clock size={12} /> },
  in_progress: { label: "En cours", color: "bg-blue-500/20 text-blue-300", icon: <AlertCircle size={12} /> },
  review: { label: "En révision", color: "bg-purple-500/20 text-purple-300", icon: <AlertCircle size={12} /> },
  completed: { label: "Terminé", color: "bg-green-500/20 text-green-300", icon: <CheckCircle2 size={12} /> },
  cancelled: { label: "Annulé", color: "bg-red-500/20 text-red-300", icon: <XCircle size={12} /> },
  open: { label: "Ouvert", color: "bg-yellow-500/20 text-yellow-300", icon: <Clock size={12} /> },
  resolved: { label: "Résolu", color: "bg-green-500/20 text-green-300", icon: <CheckCircle2 size={12} /> },
  closed: { label: "Fermé", color: "bg-gray-500/20 text-gray-300", icon: <XCircle size={12} /> },
  paid: { label: "Payé", color: "bg-green-500/20 text-green-300", icon: <CheckCircle2 size={12} /> },
  sent: { label: "Envoyée", color: "bg-blue-500/20 text-blue-300", icon: <Clock size={12} /> },
  overdue: { label: "En retard", color: "bg-red-500/20 text-red-300", icon: <AlertCircle size={12} /> },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? { label: status, color: "bg-gray-500/20 text-gray-300", icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────
const navItems = [
  { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { id: "projects", label: "Mes projets", icon: FolderOpen },
  { id: "payments", label: "Paiements", icon: CreditCard },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "tickets", label: "Support", icon: LifeBuoy },
];

function Sidebar({
  active,
  setActive,
  unread,
  onClose,
}: {
  active: string;
  setActive: (id: string) => void;
  unread: number;
  onClose?: () => void;
}) {
  const { logout } = useAuth();
  return (
    <aside
      className="flex flex-col h-full"
      style={{ background: "#0a0a1a", borderRight: "1px solid rgba(255,255,255,0.08)" }}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/8">
        <img
          src={logoUrl}
          alt="Thunderfam"
          className="h-8 w-auto object-contain"
        />
        {onClose && (
          <button onClick={onClose} className="text-white/40 hover:text-white lg:hidden">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setActive(id); onClose?.(); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
              active === id
                ? "text-white"
                : "text-white/50 hover:text-white/80 hover:bg-white/5"
            }`}
            style={
              active === id
                ? { background: "linear-gradient(135deg, rgba(196,160,80,0.2), rgba(196,160,80,0.1))", color: "#c4a050" }
                : {}
            }
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-white/8 space-y-1">
        <button
          onClick={() => setActive("notifications")}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white/80 hover:bg-white/5 transition-all"
        >
          <Bell size={16} />
          Notifications
          {unread > 0 && (
            <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
              {unread}
            </span>
          )}
        </button>
        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut size={16} />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}

// ─── Dashboard Overview ───────────────────────────────────────────
function DashboardView() {
  const { data: projects = [] } = trpc.projects.list.useQuery();
  const { data: invoices = [] } = trpc.payments.listInvoices.useQuery();
  const { data: tickets = [] } = trpc.tickets.list.useQuery();
  const { data: notifications = [] } = trpc.notifications.list.useQuery();

  const activeProjects = projects.filter((p) => p.status === "in_progress").length;
  const completedProjects = projects.filter((p) => p.status === "completed").length;
  const pendingInvoices = invoices.filter((i) => i.status === "sent" || i.status === "overdue").length;
  const openTickets = tickets.filter((t) => t.status === "open").length;
  const unreadNotifs = notifications.filter((n) => !n.isRead).length;

  const stats = [
    { label: "Projets actifs", value: activeProjects, icon: FolderOpen, color: "#c4a050" },
    { label: "Projets terminés", value: completedProjects, icon: CheckCircle2, color: "#10b981" },
    { label: "Factures en attente", value: pendingInvoices, icon: CreditCard, color: "#3b82f6" },
    { label: "Tickets ouverts", value: openTickets, icon: LifeBuoy, color: "#f59e0b" },
    { label: "Notifications", value: unreadNotifs, icon: Bell, color: "#8b5cf6" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold text-white">Tableau de bord</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-2xl p-4"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/50 text-xs font-medium">{label}</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
                <Icon size={14} style={{ color }} />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Recent projects */}
      <div
        className="rounded-2xl p-5"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <h2 className="text-base font-semibold text-white mb-4">Projets récents</h2>
        {projects.length === 0 ? (
          <p className="text-white/40 text-sm text-center py-6">Aucun projet pour le moment.</p>
        ) : (
          <div className="space-y-3">
            {projects.slice(0, 5).map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
              >
                <div>
                  <p className="text-sm text-white font-medium">{p.title}</p>
                  <p className="text-xs text-white/40">{p.projectNumber}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden sm:block">
                    <div className="w-24 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${p.progressPercent ?? 0}%`, background: "#c4a050" }}
                      />
                    </div>
                    <p className="text-xs text-white/30 text-right mt-0.5">{p.progressPercent ?? 0}%</p>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent notifications */}
      <div
        className="rounded-2xl p-5"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <h2 className="text-base font-semibold text-white mb-4">Notifications récentes</h2>
        {notifications.length === 0 ? (
          <p className="text-white/40 text-sm text-center py-6">Aucune notification.</p>
        ) : (
          <div className="space-y-3">
            {notifications.slice(0, 5).map((n) => (
              <div
                key={n.id}
                className={`flex gap-3 py-2 border-b border-white/5 last:border-0 ${!n.isRead ? "opacity-100" : "opacity-60"}`}
              >
                <div
                  className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                  style={{ background: n.isRead ? "rgba(255,255,255,0.2)" : "#c4a050" }}
                />
                <div>
                  <p className="text-sm text-white font-medium">{n.title}</p>
                  <p className="text-xs text-white/50">{n.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Projects View ────────────────────────────────────────────────
function ProjectsView() {
  const { data: projects = [], refetch } = trpc.projects.list.useQuery();
  const { data: services = [] } = trpc.services.list.useQuery();
  const requestService = trpc.projects.requestService.useMutation({
    onSuccess: () => { toast.success("Demande envoyée !"); refetch(); setShowForm(false); },
    onError: (e) => toast.error(e.message),
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", serviceId: "" });
  const [selected, setSelected] = useState<number | null>(null);

  const selectedProject = projects.find((p) => p.id === selected);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-white">Mes projets</h1>
        <Button
          onClick={() => setShowForm(true)}
          size="sm"
          className="gap-2"
          style={{ background: "linear-gradient(135deg, #8b6914, #c4a050)", color: "#fff", border: "none" }}
        >
          <Plus size={14} /> Nouveau projet
        </Button>
      </div>

      {/* New project form */}
      {showForm && (
        <div
          className="rounded-2xl p-5"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(196,160,80,0.3)" }}
        >
          <h2 className="text-base font-semibold text-white mb-4">Demander un service</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-white/60 mb-1 block">Service</label>
              <select
                className="w-full rounded-xl px-3 py-2.5 text-sm text-white"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
                value={form.serviceId}
                onChange={(e) => setForm((f) => ({ ...f, serviceId: e.target.value }))}
              >
                <option value="">Sélectionner un service</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.category} – {s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/60 mb-1 block">Titre du projet *</label>
              <input
                className="w-full rounded-xl px-3 py-2.5 text-sm text-white"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
                placeholder="Ex: Création de site web pour mon entreprise"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-white/60 mb-1 block">Description</label>
              <textarea
                rows={3}
                className="w-full rounded-xl px-3 py-2.5 text-sm text-white resize-none"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
                placeholder="Décrivez votre besoin..."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="flex gap-3">
              <Button
                size="sm"
                onClick={() =>
                  requestService.mutate({
                    title: form.title,
                    description: form.description,
                    serviceId: form.serviceId ? Number(form.serviceId) : undefined,
                  })
                }
                disabled={!form.title || requestService.isPending}
                style={{ background: "linear-gradient(135deg, #8b6914, #c4a050)", color: "#fff", border: "none" }}
              >
                {requestService.isPending ? "Envoi..." : "Envoyer la demande"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Projects list */}
      {projects.length === 0 ? (
        <div className="text-center py-16 text-white/40">
          <FolderOpen size={40} className="mx-auto mb-3 opacity-30" />
          <p>Aucun projet. Cliquez sur "Nouveau projet" pour commencer.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl p-4 cursor-pointer transition-all hover:border-white/20"
              style={{
                background: selected === p.id ? "rgba(196,160,80,0.08)" : "rgba(255,255,255,0.04)",
                border: selected === p.id ? "1px solid rgba(196,160,80,0.3)" : "1px solid rgba(255,255,255,0.08)",
              }}
              onClick={() => setSelected(selected === p.id ? null : p.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{p.title}</p>
                  <p className="text-xs text-white/40 mt-0.5">{p.projectNumber}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={p.status} />
                  <ChevronRight
                    size={14}
                    className={`text-white/30 transition-transform ${selected === p.id ? "rotate-90" : ""}`}
                  />
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="flex justify-between text-xs text-white/40 mb-1">
                  <span>Progression</span>
                  <span>{p.progressPercent ?? 0}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${p.progressPercent ?? 0}%`, background: "#c4a050" }}
                  />
                </div>
              </div>

              {/* Expanded details */}
              {selected === p.id && (
                <div className="mt-4 pt-4 border-t border-white/8">
                  {p.description && (
                    <p className="text-sm text-white/60 mb-3">{p.description}</p>
                  )}
                  <div className="grid grid-cols-2 gap-3 text-xs text-white/50">
                    {p.startDate && (
                      <div>
                        <span className="block text-white/30">Début</span>
                        <span>{new Date(p.startDate).toLocaleDateString("fr-FR")}</span>
                      </div>
                    )}
                    {p.dueDate && (
                      <div>
                        <span className="block text-white/30">Échéance</span>
                        <span>{new Date(p.dueDate).toLocaleDateString("fr-FR")}</span>
                      </div>
                    )}
                    {p.budget && (
                      <div>
                        <span className="block text-white/30">Budget</span>
                        <span>{Number(p.budget).toLocaleString()} {p.currency}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Payments View ────────────────────────────────────────────────
function PaymentsView() {
  const { data: invoices = [] } = trpc.payments.listInvoices.useQuery();
  const { data: payments = [] } = trpc.payments.list.useQuery();
  const initiateMM = trpc.payments.initiateMobileMoney.useMutation({
    onSuccess: (d) => toast.success(d.message),
    onError: (e) => toast.error(e.message),
  });
  const [payModal, setPayModal] = useState<{ invoiceId: number; total: string; currency: string } | null>(null);
  const [payForm, setPayForm] = useState({ method: "orange_money", phone: "", type: "full" });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold text-white">Paiements & Factures</h1>

      {/* Invoices */}
      <div
        className="rounded-2xl p-5"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <h2 className="text-base font-semibold text-white mb-4">Mes factures</h2>
        {invoices.length === 0 ? (
          <p className="text-white/40 text-sm text-center py-6">Aucune facture.</p>
        ) : (
          <div className="space-y-3">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between py-3 border-b border-white/5 last:border-0"
              >
                <div>
                  <p className="text-sm text-white font-medium">{inv.title}</p>
                  <p className="text-xs text-white/40">{inv.invoiceNumber}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-white">
                    {Number(inv.total).toLocaleString()} {inv.currency}
                  </span>
                  <StatusBadge status={inv.status} />
                  {(inv.status === "sent" || inv.status === "overdue") && (
                    <Button
                      size="sm"
                      onClick={() => setPayModal({ invoiceId: inv.id, total: inv.total, currency: inv.currency ?? "EUR" })}
                      style={{ background: "linear-gradient(135deg, #8b6914, #c4a050)", color: "#fff", border: "none", fontSize: "11px", padding: "4px 10px" }}
                    >
                      Payer
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment history */}
      <div
        className="rounded-2xl p-5"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <h2 className="text-base font-semibold text-white mb-4">Historique des paiements</h2>
        {payments.length === 0 ? (
          <p className="text-white/40 text-sm text-center py-6">Aucun paiement.</p>
        ) : (
          <div className="space-y-3">
            {payments.map((pay) => (
              <div
                key={pay.id}
                className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
              >
                <div>
                  <p className="text-sm text-white font-medium capitalize">{pay.method.replace(/_/g, " ")}</p>
                  <p className="text-xs text-white/40">{new Date(pay.createdAt).toLocaleDateString("fr-FR")}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-white">
                    {Number(pay.amount).toLocaleString()} {pay.currency}
                  </span>
                  <StatusBadge status={pay.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment modal */}
      {payModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: "#0d1b3e", border: "1px solid rgba(255,255,255,0.12)" }}>
            <h3 className="text-lg font-bold text-white mb-1">Effectuer un paiement</h3>
            <p className="text-sm text-white/50 mb-5">
              Montant : <strong className="text-white">{Number(payModal.total).toLocaleString()} {payModal.currency}</strong>
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/60 mb-1 block">Mode de paiement</label>
                <select
                  className="w-full rounded-xl px-3 py-2.5 text-sm text-white"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
                  value={payForm.method}
                  onChange={(e) => setPayForm((f) => ({ ...f, method: e.target.value }))}
                >
                  <option value="orange_money">Orange Money</option>
                  <option value="mtn_money">MTN Mobile Money</option>
                  <option value="moov_money">Moov Money</option>
                  <option value="wave">Wave</option>
                  <option value="djamo">Djamo</option>
                  <option value="stripe">Carte bancaire (Stripe)</option>
                </select>
              </div>

              {payForm.method !== "stripe" && (
                <div>
                  <label className="text-xs text-white/60 mb-1 block">Numéro de téléphone</label>
                  <input
                    className="w-full rounded-xl px-3 py-2.5 text-sm text-white"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
                    placeholder="+225 XX XX XX XX XX"
                    value={payForm.phone}
                    onChange={(e) => setPayForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </div>
              )}

              <div>
                <label className="text-xs text-white/60 mb-1 block">Type de paiement</label>
                <select
                  className="w-full rounded-xl px-3 py-2.5 text-sm text-white"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
                  value={payForm.type}
                  onChange={(e) => setPayForm((f) => ({ ...f, type: e.target.value }))}
                >
                  <option value="full">Paiement intégral</option>
                  <option value="installment">Paiement échelonné (3x)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                className="flex-1"
                onClick={() => {
                  if (payForm.method === "stripe") {
                    toast.info("Stripe sera disponible prochainement. Veuillez utiliser Mobile Money.");
                    return;
                  }
                  initiateMM.mutate({
                    invoiceId: payModal.invoiceId,
                    amount: Number(payModal.total),
                    currency: payModal.currency === "EUR" ? "XOF" : payModal.currency,
                    method: payForm.method as "orange_money" | "mtn_money" | "moov_money" | "wave" | "djamo",
                    phoneNumber: payForm.phone,
                    type: payForm.type as "full" | "installment",
                    totalInstallments: payForm.type === "installment" ? 3 : 1,
                  });
                  setPayModal(null);
                }}
                disabled={initiateMM.isPending}
                style={{ background: "linear-gradient(135deg, #8b6914, #c4a050)", color: "#fff", border: "none" }}
              >
                Confirmer le paiement
              </Button>
              <Button variant="outline" onClick={() => setPayModal(null)}>Annuler</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Documents View ───────────────────────────────────────────────
function DocumentsView() {
  const { data: docs = [], refetch } = trpc.documents.list.useQuery({});
  const uploadDoc = trpc.documents.upload.useMutation({
    onSuccess: () => { toast.success("Document uploadé !"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteDoc = trpc.documents.delete.useMutation({
    onSuccess: () => { toast.success("Document supprimé."); refetch(); },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 16 * 1024 * 1024) { toast.error("Fichier trop volumineux (max 16MB)"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadDoc.mutate({
        filename: file.name,
        mimeType: file.type,
        fileSize: file.size,
        base64Data: base64,
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-white">Documents</h1>
        <label
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all hover:scale-[1.02]"
          style={{ background: "linear-gradient(135deg, #8b6914, #c4a050)", color: "#fff" }}
        >
          <Upload size={14} />
          Uploader
          <input type="file" className="hidden" onChange={handleFileChange} disabled={uploadDoc.isPending} />
        </label>
      </div>

      {docs.length === 0 ? (
        <div className="text-center py-16 text-white/40">
          <FileText size={40} className="mx-auto mb-3 opacity-30" />
          <p>Aucun document. Uploadez votre premier fichier.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="rounded-2xl p-4"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div className="flex items-start justify-between mb-2">
                <FileText size={20} className="text-white/40 flex-shrink-0 mt-0.5" />
                <button
                  onClick={() => deleteDoc.mutate({ id: doc.id })}
                  className="text-white/20 hover:text-red-400 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
              <p className="text-sm text-white font-medium truncate">{doc.originalName}</p>
              <p className="text-xs text-white/40 mt-1">
                {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : "–"} •{" "}
                {new Date(doc.createdAt).toLocaleDateString("fr-FR")}
              </p>
              <a
                href={doc.storageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 block text-center text-xs py-1.5 rounded-lg transition-colors"
                style={{ background: "rgba(196,160,80,0.15)", color: "#c4a050" }}
              >
                Télécharger
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tickets View ─────────────────────────────────────────────────
function TicketsView() {
  const { data: tickets = [], refetch } = trpc.tickets.list.useQuery();
  const createTicket = trpc.tickets.create.useMutation({
    onSuccess: () => { toast.success("Ticket créé !"); refetch(); setShowForm(false); },
    onError: (e) => toast.error(e.message),
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subject: "", description: "", priority: "medium", category: "general" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-white">Support</h1>
        <Button
          onClick={() => setShowForm(true)}
          size="sm"
          className="gap-2"
          style={{ background: "linear-gradient(135deg, #8b6914, #c4a050)", color: "#fff", border: "none" }}
        >
          <Plus size={14} /> Nouveau ticket
        </Button>
      </div>

      {showForm && (
        <div
          className="rounded-2xl p-5"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(196,160,80,0.3)" }}
        >
          <h2 className="text-base font-semibold text-white mb-4">Créer un ticket de support</h2>
          <div className="space-y-3">
            <input
              className="w-full rounded-xl px-3 py-2.5 text-sm text-white"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
              placeholder="Sujet *"
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            />
            <textarea
              rows={4}
              className="w-full rounded-xl px-3 py-2.5 text-sm text-white resize-none"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
              placeholder="Description du problème *"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                className="rounded-xl px-3 py-2.5 text-sm text-white"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              >
                <option value="low">Priorité basse</option>
                <option value="medium">Priorité moyenne</option>
                <option value="high">Priorité haute</option>
                <option value="urgent">Urgent</option>
              </select>
              <select
                className="rounded-xl px-3 py-2.5 text-sm text-white"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                <option value="general">Général</option>
                <option value="billing">Facturation</option>
                <option value="technical">Technique</option>
                <option value="project">Projet</option>
              </select>
            </div>
            <div className="flex gap-3">
              <Button
                size="sm"
                onClick={() => createTicket.mutate({ subject: form.subject, description: form.description, priority: form.priority as "low" | "medium" | "high" | "urgent", category: form.category })}
                disabled={!form.subject || !form.description || createTicket.isPending}
                style={{ background: "linear-gradient(135deg, #8b6914, #c4a050)", color: "#fff", border: "none" }}
              >
                {createTicket.isPending ? "Envoi..." : "Créer le ticket"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
            </div>
          </div>
        </div>
      )}

      {tickets.length === 0 ? (
        <div className="text-center py-16 text-white/40">
          <LifeBuoy size={40} className="mx-auto mb-3 opacity-30" />
          <p>Aucun ticket. Cliquez sur "Nouveau ticket" si vous avez besoin d'aide.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl p-4"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold text-white">{t.subject}</p>
                <StatusBadge status={t.status} />
              </div>
              <p className="text-xs text-white/40">{t.ticketNumber} • {new Date(t.createdAt).toLocaleDateString("fr-FR")}</p>
              <p className="text-sm text-white/60 mt-2 line-clamp-2">{t.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Notifications View ───────────────────────────────────────────
function NotificationsView() {
  const { data: notifications = [], refetch } = trpc.notifications.list.useQuery();
  const markRead = trpc.notifications.markRead.useMutation({ onSuccess: () => refetch() });
  const markAll = trpc.notifications.markAllRead.useMutation({ onSuccess: () => refetch() });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-white">Notifications</h1>
        {notifications.some((n) => !n.isRead) && (
          <Button size="sm" variant="outline" onClick={() => markAll.mutate()}>
            Tout marquer comme lu
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16 text-white/40">
          <Bell size={40} className="mx-auto mb-3 opacity-30" />
          <p>Aucune notification.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`rounded-2xl p-4 cursor-pointer transition-all ${!n.isRead ? "border-l-2" : ""}`}
              style={{
                background: n.isRead ? "rgba(255,255,255,0.03)" : "rgba(196,160,80,0.06)",
                border: n.isRead ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(196,160,80,0.2)",
                borderLeftColor: n.isRead ? undefined : "#c4a050",
              }}
              onClick={() => !n.isRead && markRead.mutate({ id: n.id })}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={`text-sm font-semibold ${n.isRead ? "text-white/60" : "text-white"}`}>{n.title}</p>
                  <p className="text-xs text-white/50 mt-1">{n.content}</p>
                  <p className="text-xs text-white/30 mt-2">{new Date(n.createdAt).toLocaleString("fr-FR")}</p>
                </div>
                {!n.isRead && (
                  <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: "#c4a050" }} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Portal ──────────────────────────────────────────────────
export default function ClientPortal() {
  const { user, loading, isAuthenticated } = useAuth();
  const [active, setActive] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: unread = 0 } = trpc.notifications.unreadCount.useQuery();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a1a" }}>
        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#0a0a1a" }}
      >
        <div className="text-center">
          <p className="text-white/60 mb-4">Vous devez être connecté pour accéder à votre espace client.</p>
          <Button
            onClick={() => (window.location.href = getLoginUrl())}
            style={{ background: "linear-gradient(135deg, #8b6914, #c4a050)", color: "#fff", border: "none" }}
          >
            Se connecter
          </Button>
        </div>
      </div>
    );
  }

  const views: Record<string, React.ReactNode> = {
    dashboard: <DashboardView />,
    projects: <ProjectsView />,
    payments: <PaymentsView />,
    documents: <DocumentsView />,
    tickets: <TicketsView />,
    notifications: <NotificationsView />,
  };

  return (
    <div className="min-h-screen flex" style={{ background: "#050510" }}>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex w-64 flex-shrink-0">
        <div className="fixed top-0 left-0 w-64 h-screen">
          <Sidebar active={active} setActive={setActive} unread={unread} />
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.6)" }}
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative w-64 h-full">
            <Sidebar active={active} setActive={setActive} unread={unread} onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-0">
        {/* Mobile header */}
        <div
          className="lg:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-40"
          style={{ background: "#0a0a1a", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
        >
          <button onClick={() => setSidebarOpen(true)} className="text-white/60 hover:text-white">
            <Menu size={20} />
          </button>
          <img
            src="/manus-storage/thunderfam_logo_dark_e8f49927.jpg"
            alt="Thunderfam"
            className="h-7 w-auto object-contain"
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/50">{user?.name ?? "Client"}</span>
            {unread > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                {unread}
              </span>
            )}
          </div>
        </div>

        {/* Page content */}
        <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
          {/* Desktop user greeting */}
          <div className="hidden lg:flex items-center justify-between mb-8">
            <p className="text-white/40 text-sm">
              Bonjour, <span className="text-white font-medium">{user?.name ?? "Client"}</span>
            </p>
            {unread > 0 && (
              <button
                onClick={() => setActive("notifications")}
                className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
              >
                <Bell size={15} />
                <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{unread}</span>
              </button>
            )}
          </div>

          {views[active] ?? <DashboardView />}
        </div>
      </div>
    </div>
  );
}
