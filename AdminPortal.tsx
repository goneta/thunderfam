import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  CreditCard,
  Briefcase,
  LifeBuoy,
  BarChart3,
  Settings,
  Menu,
  X,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// ─── Status helpers ───────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-300",
    in_progress: "bg-blue-500/20 text-blue-300",
    review: "bg-purple-500/20 text-purple-300",
    completed: "bg-green-500/20 text-green-300",
    cancelled: "bg-red-500/20 text-red-300",
    open: "bg-yellow-500/20 text-yellow-300",
    resolved: "bg-green-500/20 text-green-300",
    closed: "bg-gray-500/20 text-gray-300",
    paid: "bg-green-500/20 text-green-300",
    sent: "bg-blue-500/20 text-blue-300",
    overdue: "bg-red-500/20 text-red-300",
    draft: "bg-gray-500/20 text-gray-300",
    admin: "bg-red-500/20 text-red-300",
    manager: "bg-purple-500/20 text-purple-300",
    user: "bg-gray-500/20 text-gray-300",
    active: "bg-green-500/20 text-green-300",
    inactive: "bg-red-500/20 text-red-300",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? "bg-gray-500/20 text-gray-300"}`}>
      {status}
    </span>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────
const navItems = [
  { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { id: "users", label: "Utilisateurs", icon: Users },
  { id: "projects", label: "Projets", icon: FolderOpen },
  { id: "payments", label: "Paiements", icon: CreditCard },
  { id: "services", label: "Services", icon: Briefcase },
  { id: "tickets", label: "Tickets", icon: LifeBuoy },
  { id: "reports", label: "Rapports", icon: BarChart3 },
];

function AdminSidebar({
  active,
  setActive,
  onClose,
}: {
  active: string;
  setActive: (id: string) => void;
  onClose?: () => void;
}) {
  const { logout } = useAuth();
  return (
    <aside
      className="flex flex-col h-full"
      style={{ background: "#070712", borderRight: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/8">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} style={{ color: "#c4a050" }} />
          <span className="text-sm font-semibold text-white">Admin Panel</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-white/40 hover:text-white lg:hidden">
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setActive(id); onClose?.(); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
              active === id ? "" : "text-white/50 hover:text-white/80 hover:bg-white/5"
            }`}
            style={
              active === id
                ? { background: "rgba(196,160,80,0.15)", color: "#c4a050" }
                : {}
            }
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-white/8">
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

// ─── Dashboard Stats ──────────────────────────────────────────────
function AdminDashboard() {
  const { data: stats } = trpc.admin.stats.useQuery();

  const cards = [
    { label: "Utilisateurs", value: stats?.totalUsers ?? 0, color: "#3b82f6" },
    { label: "Projets", value: stats?.totalProjects ?? 0, color: "#c4a050" },
    { label: "Tickets ouverts", value: stats?.openTickets ?? 0, color: "#f59e0b" },
    { label: "Paiements en attente", value: stats?.pendingPayments ?? 0, color: "#ef4444" },
    { label: "Revenus totaux", value: `${Number(stats?.totalRevenue ?? 0).toLocaleString()} €`, color: "#10b981", wide: true },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold text-white">Tableau de bord Admin</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.filter((c) => !c.wide).map(({ label, value, color }) => (
          <div
            key={label}
            className="rounded-2xl p-4"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <p className="text-xs text-white/50 mb-2">{label}</p>
            <p className="text-3xl font-bold text-white">{value}</p>
            <div className="h-0.5 mt-3 rounded-full" style={{ background: `${color}40` }} />
          </div>
        ))}
      </div>
      {cards.filter((c) => c.wide).map(({ label, value, color }) => (
        <div
          key={label}
          className="rounded-2xl p-5"
          style={{ background: `${color}10`, border: `1px solid ${color}30` }}
        >
          <p className="text-sm text-white/60 mb-1">{label}</p>
          <p className="text-4xl font-bold" style={{ color }}>{value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Users Management ─────────────────────────────────────────────
function UsersManagement() {
  const { data: users = [], refetch } = trpc.admin.listUsers.useQuery();
  const updateRole = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => { toast.success("Rôle mis à jour"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const toggleActive = trpc.admin.toggleUserActive.useMutation({
    onSuccess: () => { toast.success("Statut mis à jour"); refetch(); },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold text-white">Gestion des utilisateurs</h1>
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {["Nom", "Email", "Rôle", "Statut", "Inscrit le", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <td className="px-4 py-3 text-white font-medium">{u.name ?? "–"}</td>
                  <td className="px-4 py-3 text-white/60">{u.email ?? "–"}</td>
                  <td className="px-4 py-3">
                    <select
                      className="rounded-lg px-2 py-1 text-xs text-white"
                      style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
                      value={u.role}
                      onChange={(e) => updateRole.mutate({ userId: u.id, role: e.target.value as "user" | "admin" | "manager" })}
                    >
                      <option value="user">user</option>
                      <option value="manager">manager</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={u.isActive ? "active" : "inactive"} />
                  </td>
                  <td className="px-4 py-3 text-white/40 text-xs">
                    {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive.mutate({ userId: u.id, isActive: !u.isActive })}
                      className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                        u.isActive
                          ? "text-red-400 hover:bg-red-500/10"
                          : "text-green-400 hover:bg-green-500/10"
                      }`}
                    >
                      {u.isActive ? "Désactiver" : "Activer"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <p className="text-center py-8 text-white/40 text-sm">Aucun utilisateur.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Projects Management ──────────────────────────────────────────
function ProjectsManagement() {
  const { data: projects = [], refetch } = trpc.admin.listProjects.useQuery();
  const updateProject = trpc.admin.updateProject.useMutation({
    onSuccess: () => { toast.success("Projet mis à jour"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const addMilestone = trpc.admin.addMilestone.useMutation({
    onSuccess: () => { toast.success("Jalon ajouté"); refetch(); },
  });
  const [expanded, setExpanded] = useState<number | null>(null);
  const [milestoneForm, setMilestoneForm] = useState({ title: "", projectId: 0 });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold text-white">Gestion des projets</h1>

      {projects.length === 0 ? (
        <p className="text-white/40 text-sm text-center py-16">Aucun projet.</p>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl overflow-hidden"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div
                className="flex items-center justify-between p-4 cursor-pointer"
                onClick={() => setExpanded(expanded === p.id ? null : p.id)}
              >
                <div>
                  <p className="text-sm font-semibold text-white">{p.title}</p>
                  <p className="text-xs text-white/40">{p.projectNumber} • Client #{p.clientId}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={p.status} />
                  <span className="text-xs text-white/40">{p.progressPercent ?? 0}%</span>
                  {expanded === p.id ? <ChevronUp size={14} className="text-white/30" /> : <ChevronDown size={14} className="text-white/30" />}
                </div>
              </div>

              {expanded === p.id && (
                <div className="px-4 pb-4 border-t border-white/8 pt-4 space-y-4">
                  {/* Status & Progress */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-white/50 mb-1 block">Statut</label>
                      <select
                        className="w-full rounded-xl px-3 py-2 text-sm text-white"
                        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
                        value={p.status}
                        onChange={(e) => updateProject.mutate({ id: p.id, status: e.target.value as "pending" | "in_progress" | "review" | "completed" | "cancelled" })}
                      >
                        <option value="pending">En attente</option>
                        <option value="in_progress">En cours</option>
                        <option value="review">En révision</option>
                        <option value="completed">Terminé</option>
                        <option value="cancelled">Annulé</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-white/50 mb-1 block">Progression (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        className="w-full rounded-xl px-3 py-2 text-sm text-white"
                        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
                        defaultValue={p.progressPercent ?? 0}
                        onBlur={(e) => updateProject.mutate({ id: p.id, progressPercent: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  {/* Add milestone */}
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Ajouter un jalon</label>
                    <div className="flex gap-2">
                      <input
                        className="flex-1 rounded-xl px-3 py-2 text-sm text-white"
                        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
                        placeholder="Titre du jalon"
                        value={milestoneForm.projectId === p.id ? milestoneForm.title : ""}
                        onChange={(e) => setMilestoneForm({ title: e.target.value, projectId: p.id })}
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          if (milestoneForm.title && milestoneForm.projectId === p.id) {
                            addMilestone.mutate({ projectId: p.id, title: milestoneForm.title });
                            setMilestoneForm({ title: "", projectId: 0 });
                          }
                        }}
                        style={{ background: "linear-gradient(135deg, #8b6914, #c4a050)", color: "#fff", border: "none" }}
                      >
                        <Plus size={14} />
                      </Button>
                    </div>
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

// ─── Payments Management ──────────────────────────────────────────
function PaymentsManagement() {
  const { data: payments = [], refetch } = trpc.admin.listPayments.useQuery();
  const updateStatus = trpc.admin.updatePaymentStatus.useMutation({
    onSuccess: () => { toast.success("Statut mis à jour"); refetch(); },
  });
  const createInvoice = trpc.admin.createInvoice.useMutation({
    onSuccess: (d) => { toast.success(`Facture ${d.invoiceNumber} créée`); setShowInvoiceForm(false); },
    onError: (e) => toast.error(e.message),
  });
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [invForm, setInvForm] = useState({ userId: "", title: "", amount: "", currency: "EUR", notes: "" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-white">Paiements & Factures</h1>
        <Button
          size="sm"
          onClick={() => setShowInvoiceForm(true)}
          style={{ background: "linear-gradient(135deg, #8b6914, #c4a050)", color: "#fff", border: "none" }}
          className="gap-2"
        >
          <Plus size={14} /> Créer facture
        </Button>
      </div>

      {showInvoiceForm && (
        <div
          className="rounded-2xl p-5"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(196,160,80,0.3)" }}
        >
          <h2 className="text-base font-semibold text-white mb-4">Nouvelle facture</h2>
          <div className="grid grid-cols-2 gap-3">
            <input
              className="rounded-xl px-3 py-2.5 text-sm text-white"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
              placeholder="ID utilisateur *"
              value={invForm.userId}
              onChange={(e) => setInvForm((f) => ({ ...f, userId: e.target.value }))}
            />
            <input
              className="rounded-xl px-3 py-2.5 text-sm text-white"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
              placeholder="Titre *"
              value={invForm.title}
              onChange={(e) => setInvForm((f) => ({ ...f, title: e.target.value }))}
            />
            <input
              type="number"
              className="rounded-xl px-3 py-2.5 text-sm text-white"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
              placeholder="Montant *"
              value={invForm.amount}
              onChange={(e) => setInvForm((f) => ({ ...f, amount: e.target.value }))}
            />
            <select
              className="rounded-xl px-3 py-2.5 text-sm text-white"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
              value={invForm.currency}
              onChange={(e) => setInvForm((f) => ({ ...f, currency: e.target.value }))}
            >
              <option value="EUR">EUR</option>
              <option value="XOF">XOF</option>
              <option value="GBP">GBP</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <div className="flex gap-3 mt-4">
            <Button
              size="sm"
              onClick={() => {
                const amount = Number(invForm.amount);
                createInvoice.mutate({
                  userId: Number(invForm.userId),
                  title: invForm.title,
                  items: [{ name: invForm.title, qty: 1, unitPrice: amount, total: amount }],
                  subtotal: amount,
                  tax: 0,
                  total: amount,
                  currency: invForm.currency,
                });
              }}
              disabled={!invForm.userId || !invForm.title || !invForm.amount || createInvoice.isPending}
              style={{ background: "linear-gradient(135deg, #8b6914, #c4a050)", color: "#fff", border: "none" }}
            >
              {createInvoice.isPending ? "Création..." : "Créer"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowInvoiceForm(false)}>Annuler</Button>
          </div>
        </div>
      )}

      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {["Client", "Méthode", "Montant", "Statut", "Date", "Action"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <td className="px-4 py-3 text-white/70">#{p.userId}</td>
                  <td className="px-4 py-3 text-white/70 capitalize">{p.method.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-white font-semibold">{Number(p.amount).toLocaleString()} {p.currency}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-white/40 text-xs">{new Date(p.createdAt).toLocaleDateString("fr-FR")}</td>
                  <td className="px-4 py-3">
                    {p.status === "pending" && (
                      <button
                        onClick={() => updateStatus.mutate({ id: p.id, status: "completed" })}
                        className="text-xs text-green-400 hover:bg-green-500/10 px-2 py-1 rounded-lg transition-colors"
                      >
                        Confirmer
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {payments.length === 0 && (
            <p className="text-center py-8 text-white/40 text-sm">Aucun paiement.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Services Management ──────────────────────────────────────────
function ServicesManagement() {
  const { data: services = [], refetch } = trpc.services.list.useQuery();
  const createService = trpc.admin.createService.useMutation({
    onSuccess: () => { toast.success("Service créé"); refetch(); setShowForm(false); },
    onError: (e) => toast.error(e.message),
  });
  const updateService = trpc.admin.updateService.useMutation({
    onSuccess: () => { toast.success("Service mis à jour"); refetch(); },
  });
  const deleteService = trpc.admin.deleteService.useMutation({
    onSuccess: () => { toast.success("Service supprimé"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: "", name: "", descriptionFr: "", basePrice: "", currency: "EUR" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-white">Catalogue de services</h1>
        <Button
          size="sm"
          onClick={() => setShowForm(true)}
          style={{ background: "linear-gradient(135deg, #8b6914, #c4a050)", color: "#fff", border: "none" }}
          className="gap-2"
        >
          <Plus size={14} /> Nouveau service
        </Button>
      </div>

      {showForm && (
        <div
          className="rounded-2xl p-5"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(196,160,80,0.3)" }}
        >
          <h2 className="text-base font-semibold text-white mb-4">Créer un service</h2>
          <div className="grid grid-cols-2 gap-3">
            <input
              className="rounded-xl px-3 py-2.5 text-sm text-white"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
              placeholder="Catégorie *"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            />
            <input
              className="rounded-xl px-3 py-2.5 text-sm text-white"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
              placeholder="Nom du service *"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <input
              type="number"
              className="rounded-xl px-3 py-2.5 text-sm text-white"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
              placeholder="Prix de base"
              value={form.basePrice}
              onChange={(e) => setForm((f) => ({ ...f, basePrice: e.target.value }))}
            />
            <select
              className="rounded-xl px-3 py-2.5 text-sm text-white"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
              value={form.currency}
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
            >
              <option value="EUR">EUR</option>
              <option value="XOF">XOF</option>
              <option value="GBP">GBP</option>
            </select>
            <textarea
              rows={2}
              className="col-span-2 rounded-xl px-3 py-2.5 text-sm text-white resize-none"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
              placeholder="Description (FR)"
              value={form.descriptionFr}
              onChange={(e) => setForm((f) => ({ ...f, descriptionFr: e.target.value }))}
            />
          </div>
          <div className="flex gap-3 mt-4">
            <Button
              size="sm"
              onClick={() =>
                createService.mutate({
                  category: form.category,
                  name: form.name,
                  descriptionFr: form.descriptionFr,
                  basePrice: form.basePrice ? Number(form.basePrice) : undefined,
                  currency: form.currency,
                })
              }
              disabled={!form.category || !form.name || createService.isPending}
              style={{ background: "linear-gradient(135deg, #8b6914, #c4a050)", color: "#fff", border: "none" }}
            >
              {createService.isPending ? "Création..." : "Créer"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((s) => (
          <div
            key={s.id}
            className="rounded-2xl p-4"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-xs text-white/40 uppercase tracking-wider">{s.category}</p>
                <p className="text-sm font-semibold text-white mt-0.5">{s.name}</p>
              </div>
              <StatusBadge status={s.isActive ? "active" : "inactive"} />
            </div>
            {s.basePrice && (
              <p className="text-lg font-bold mt-2" style={{ color: "#c4a050" }}>
                {Number(s.basePrice).toLocaleString()} {s.currency}
              </p>
            )}
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => updateService.mutate({ id: s.id, isActive: !s.isActive })}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                  s.isActive ? "text-red-400 hover:bg-red-500/10" : "text-green-400 hover:bg-green-500/10"
                }`}
              >
                {s.isActive ? "Désactiver" : "Activer"}
              </button>
              <button
                onClick={() => {
                  if (window.confirm(`Supprimer le service "${s.name}" ?`)) {
                    deleteService.mutate({ id: s.id });
                  }
                }}
                className="text-xs px-3 py-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tickets Management ───────────────────────────────────────────
function TicketsManagement() {
  const { data: tickets = [], refetch } = trpc.admin.listTickets.useQuery();
  const updateTicket = trpc.admin.updateTicket.useMutation({
    onSuccess: () => { toast.success("Ticket mis à jour"); refetch(); },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold text-white">Tickets de support</h1>
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {["N°", "Sujet", "Client", "Priorité", "Statut", "Date", "Action"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <td className="px-4 py-3 text-white/40 text-xs">{t.ticketNumber}</td>
                  <td className="px-4 py-3 text-white font-medium max-w-[200px] truncate">{t.subject}</td>
                  <td className="px-4 py-3 text-white/60">#{t.userId}</td>
                  <td className="px-4 py-3"><StatusBadge status={t.priority} /></td>
                  <td className="px-4 py-3">
                    <select
                      className="rounded-lg px-2 py-1 text-xs text-white"
                      style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
                      value={t.status}
                      onChange={(e) => updateTicket.mutate({ id: t.id, status: e.target.value as "open" | "in_progress" | "resolved" | "closed" })}
                    >
                      <option value="open">Ouvert</option>
                      <option value="in_progress">En cours</option>
                      <option value="resolved">Résolu</option>
                      <option value="closed">Fermé</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-white/40 text-xs">{new Date(t.createdAt).toLocaleDateString("fr-FR")}</td>
                  <td className="px-4 py-3 text-white/40 text-xs">{t.category}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {tickets.length === 0 && (
            <p className="text-center py-8 text-white/40 text-sm">Aucun ticket.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Reports ──────────────────────────────────────────────────────
function ReportsView() {
  const { data: stats } = trpc.admin.stats.useQuery();
  const { data: payments = [] } = trpc.admin.listPayments.useQuery();

  const completedPayments = payments.filter((p) => p.status === "completed");
  const pendingPayments = payments.filter((p) => p.status === "pending");
  const failedPayments = payments.filter((p) => p.status === "failed");

  const revenueByMethod: Record<string, number> = {};
  completedPayments.forEach((p) => {
    const method = p.method.replace(/_/g, " ");
    revenueByMethod[method] = (revenueByMethod[method] ?? 0) + Number(p.amount);
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold text-white">Rapports & Analytiques</h1>

      {/* Payment summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Paiements réussis", count: completedPayments.length, color: "#10b981" },
          { label: "Paiements en attente", count: pendingPayments.length, color: "#f59e0b" },
          { label: "Paiements échoués", count: failedPayments.length, color: "#ef4444" },
        ].map(({ label, count, color }) => (
          <div
            key={label}
            className="rounded-2xl p-4 text-center"
            style={{ background: `${color}10`, border: `1px solid ${color}30` }}
          >
            <p className="text-3xl font-bold" style={{ color }}>{count}</p>
            <p className="text-xs text-white/50 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Revenue by method */}
      <div
        className="rounded-2xl p-5"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <h2 className="text-base font-semibold text-white mb-4">Revenus par méthode de paiement</h2>
        {Object.keys(revenueByMethod).length === 0 ? (
          <p className="text-white/40 text-sm text-center py-6">Aucun paiement complété.</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(revenueByMethod)
              .sort(([, a], [, b]) => b - a)
              .map(([method, amount]) => {
                const max = Math.max(...Object.values(revenueByMethod));
                const pct = (amount / max) * 100;
                return (
                  <div key={method}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-white/70 capitalize">{method}</span>
                      <span className="text-white font-semibold">{amount.toLocaleString()}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: "linear-gradient(90deg, #8b6914, #c4a050)" }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Global stats */}
      <div
        className="rounded-2xl p-5"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <h2 className="text-base font-semibold text-white mb-4">Résumé global</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-white/40">Total utilisateurs</p>
            <p className="text-2xl font-bold text-white">{stats?.totalUsers ?? 0}</p>
          </div>
          <div>
            <p className="text-white/40">Total projets</p>
            <p className="text-2xl font-bold text-white">{stats?.totalProjects ?? 0}</p>
          </div>
          <div>
            <p className="text-white/40">Revenus totaux</p>
            <p className="text-2xl font-bold" style={{ color: "#c4a050" }}>
              {Number(stats?.totalRevenue ?? 0).toLocaleString()} €
            </p>
          </div>
          <div>
            <p className="text-white/40">Tickets ouverts</p>
            <p className="text-2xl font-bold text-white">{stats?.openTickets ?? 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Admin Portal ────────────────────────────────────────────
export default function AdminPortal() {
  const { user, loading, isAuthenticated } = useAuth();
  const [active, setActive] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#070712" }}>
        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || (user?.role !== "admin" && user?.role !== "manager")) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#070712" }}>
        <div className="text-center">
          <ShieldCheck size={40} className="mx-auto mb-4 text-white/20" />
          <p className="text-white/60 mb-2">Accès réservé aux administrateurs.</p>
          <p className="text-white/30 text-sm">Connectez-vous avec un compte admin.</p>
        </div>
      </div>
    );
  }

  const views: Record<string, React.ReactNode> = {
    dashboard: <AdminDashboard />,
    users: <UsersManagement />,
    projects: <ProjectsManagement />,
    payments: <PaymentsManagement />,
    services: <ServicesManagement />,
    tickets: <TicketsManagement />,
    reports: <ReportsView />,
  };

  return (
    <div className="min-h-screen flex" style={{ background: "#050510" }}>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex w-60 flex-shrink-0">
        <div className="fixed top-0 left-0 w-60 h-screen">
          <AdminSidebar active={active} setActive={setActive} />
        </div>
      </div>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setSidebarOpen(false)} />
          <div className="relative w-60 h-full">
            <AdminSidebar active={active} setActive={setActive} onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1">
        {/* Mobile header */}
        <div
          className="lg:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-40"
          style={{ background: "#070712", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
        >
          <button onClick={() => setSidebarOpen(true)} className="text-white/60 hover:text-white">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} style={{ color: "#c4a050" }} />
            <span className="text-sm font-semibold text-white">Admin</span>
          </div>
          <span className="text-xs text-white/40">{user?.name}</span>
        </div>

        <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
          <div className="hidden lg:flex items-center justify-between mb-8">
            <p className="text-white/40 text-sm">
              Admin : <span className="text-white font-medium">{user?.name}</span>
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(196,160,80,0.15)", color: "#c4a050" }}>
                {user?.role}
              </span>
            </p>
          </div>

          {views[active] ?? <AdminDashboard />}
        </div>
      </div>
    </div>
  );
}
