import {
  bigint,
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  json,
} from "drizzle-orm/mysql-core";

// ─────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "manager"]).default("user").notNull(),
  phone: varchar("phone", { length: 32 }),
  country: varchar("country", { length: 64 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─────────────────────────────────────────────
// SERVICES CATALOGUE
// ─────────────────────────────────────────────
export const services = mysqlTable("services", {
  id: int("id").autoincrement().primaryKey(),
  category: varchar("category", { length: 128 }).notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  descriptionFr: text("descriptionFr"),
  descriptionEn: text("descriptionEn"),
  descriptionEs: text("descriptionEs"),
  basePrice: decimal("basePrice", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 8 }).default("EUR"),
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Service = typeof services.$inferSelect;
export type InsertService = typeof services.$inferInsert;

// ─────────────────────────────────────────────
// QUOTES (DEVIS)
// ─────────────────────────────────────────────
export const quotes = mysqlTable("quotes", {
  id: int("id").autoincrement().primaryKey(),
  quoteNumber: varchar("quoteNumber", { length: 32 }).notNull().unique(),
  userId: int("userId").notNull(),
  serviceId: int("serviceId"),
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description"),
  items: json("items"), // [{name, qty, unitPrice, total}]
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  tax: decimal("tax", { precision: 10, scale: 2 }).default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 8 }).default("EUR"),
  status: mysqlEnum("status", ["draft", "sent", "accepted", "rejected", "expired"]).default("draft").notNull(),
  validUntil: timestamp("validUntil"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = typeof quotes.$inferInsert;

// ─────────────────────────────────────────────
// PROJECTS
// ─────────────────────────────────────────────
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  projectNumber: varchar("projectNumber", { length: 32 }).notNull().unique(),
  clientId: int("clientId").notNull(),
  managerId: int("managerId"),
  serviceId: int("serviceId"),
  quoteId: int("quoteId"),
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["pending", "in_progress", "review", "completed", "cancelled"]).default("pending").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
  progressPercent: int("progressPercent").default(0),
  startDate: timestamp("startDate"),
  dueDate: timestamp("dueDate"),
  completedAt: timestamp("completedAt"),
  budget: decimal("budget", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 8 }).default("EUR"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

// ─────────────────────────────────────────────
// PROJECT MILESTONES
// ─────────────────────────────────────────────
export const projectMilestones = mysqlTable("project_milestones", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["pending", "in_progress", "completed"]).default("pending").notNull(),
  dueDate: timestamp("dueDate"),
  completedAt: timestamp("completedAt"),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProjectMilestone = typeof projectMilestones.$inferSelect;

// ─────────────────────────────────────────────
// PROJECT COMMENTS
// ─────────────────────────────────────────────
export const projectComments = mysqlTable("project_comments", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  content: text("content").notNull(),
  type: mysqlEnum("type", ["comment", "task_request", "recommendation", "approval", "rejection"]).default("comment").notNull(),
  parentId: int("parentId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProjectComment = typeof projectComments.$inferSelect;

// ─────────────────────────────────────────────
// DOCUMENTS
// ─────────────────────────────────────────────
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId"),
  userId: int("userId").notNull(),
  filename: varchar("filename", { length: 512 }).notNull(),
  originalName: varchar("originalName", { length: 512 }).notNull(),
  mimeType: varchar("mimeType", { length: 128 }).notNull(),
  fileSize: bigint("fileSize", { mode: "number" }),
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  storageUrl: varchar("storageUrl", { length: 1024 }).notNull(),
  category: varchar("category", { length: 64 }).default("general"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

// ─────────────────────────────────────────────
// INVOICES (FACTURES)
// ─────────────────────────────────────────────
export const invoices = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  invoiceNumber: varchar("invoiceNumber", { length: 32 }).notNull().unique(),
  userId: int("userId").notNull(),
  projectId: int("projectId"),
  quoteId: int("quoteId"),
  title: varchar("title", { length: 256 }).notNull(),
  items: json("items"), // [{name, qty, unitPrice, total}]
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  tax: decimal("tax", { precision: 10, scale: 2 }).default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 8 }).default("EUR"),
  status: mysqlEnum("status", ["draft", "sent", "paid", "overdue", "cancelled"]).default("draft").notNull(),
  dueDate: timestamp("dueDate"),
  paidAt: timestamp("paidAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

// ─────────────────────────────────────────────
// PAYMENTS
// ─────────────────────────────────────────────
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  invoiceId: int("invoiceId"),
  userId: int("userId").notNull(),
  projectId: int("projectId"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 8 }).default("EUR"),
  method: mysqlEnum("method", ["stripe", "orange_money", "mtn_money", "moov_money", "wave", "djamo", "bank_transfer"]).notNull(),
  type: mysqlEnum("type", ["full", "installment"]).default("full").notNull(),
  installmentNumber: int("installmentNumber").default(1),
  totalInstallments: int("totalInstallments").default(1),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed", "refunded"]).default("pending").notNull(),
  transactionId: varchar("transactionId", { length: 256 }),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 256 }),
  phoneNumber: varchar("phoneNumber", { length: 32 }),
  notes: text("notes"),
  paidAt: timestamp("paidAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

// ─────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  content: text("content").notNull(),
  type: mysqlEnum("type", ["project_update", "task_completed", "document_uploaded", "payment_due", "payment_received", "info", "warning"]).default("info").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  relatedProjectId: int("relatedProjectId"),
  relatedPaymentId: int("relatedPaymentId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ─────────────────────────────────────────────
// SUPPORT TICKETS
// ─────────────────────────────────────────────
export const tickets = mysqlTable("tickets", {
  id: int("id").autoincrement().primaryKey(),
  ticketNumber: varchar("ticketNumber", { length: 32 }).notNull().unique(),
  userId: int("userId").notNull(),
  assignedTo: int("assignedTo"),
  projectId: int("projectId"),
  subject: varchar("subject", { length: 256 }).notNull(),
  description: text("description").notNull(),
  status: mysqlEnum("status", ["open", "in_progress", "resolved", "closed"]).default("open").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
  category: varchar("category", { length: 64 }).default("general"),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = typeof tickets.$inferInsert;

// ─────────────────────────────────────────────
// TICKET MESSAGES
// ─────────────────────────────────────────────
export const ticketMessages = mysqlTable("ticket_messages", {
  id: int("id").autoincrement().primaryKey(),
  ticketId: int("ticketId").notNull(),
  userId: int("userId").notNull(),
  content: text("content").notNull(),
  isStaff: boolean("isStaff").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TicketMessage = typeof ticketMessages.$inferSelect;

// ─────────────────────────────────────────────
// REVIEWS
// ─────────────────────────────────────────────
export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  projectId: int("projectId"),
  serviceId: int("serviceId"),
  rating: int("rating").notNull(), // 1-5
  title: varchar("title", { length: 256 }),
  content: text("content"),
  isPublished: boolean("isPublished").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

// ─────────────────────────────────────────────
// AUDIT LOGS
// ─────────────────────────────────────────────
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  action: varchar("action", { length: 128 }).notNull(),
  entity: varchar("entity", { length: 64 }).notNull(),
  entityId: int("entityId"),
  details: json("details"),
  ipAddress: varchar("ipAddress", { length: 64 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;

// ─────────────────────────────────────────────
// CHAT MESSAGES (Live Support)
// ─────────────────────────────────────────────
export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 128 }).notNull(),
  userId: int("userId"),
  senderName: varchar("senderName", { length: 128 }),
  content: text("content").notNull(),
  isStaff: boolean("isStaff").default(false).notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
