import { z } from "zod/v4";
import { TRPCError } from "@trpc/server";
import { eq, and, isNull, desc } from "drizzle-orm";
import { getDb } from "../db";
import { users, authSessions, authAuditLog } from "../../drizzle/schema";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { permissionProcedure } from "./rbac";
import {
  hashPassword, verifyPassword, validatePasswordStrength,
  signAccessToken, createSession, rotateSession, revokeSession, revokeAllSessions,
  isLocked, registerFailedAttempt, resetFailedAttempts,
  issueToken, consumeToken, logAuthEvent, localOpenId,
  type AccessTokenPayload,
} from "./authService";
import { sendVerificationEmail, sendPasswordResetEmail, sendPasswordChangedEmail, isAuthEmailConfigured } from "./authEmails";
import type { Role } from "@shared/permissions";

// ============================================================
// Routeur d'authentification intégré.
//
// Principe de non-divulgation : aucune réponse ne permet de savoir
// si une adresse e-mail correspond à un compte existant. Les
// procédures « mot de passe oublié » et « connexion » renvoient donc
// des messages identiques quel que soit le cas.
//
// Le refresh token voyage dans un cookie httpOnly (inaccessible au
// JavaScript, donc non exfiltrable par une faille XSS). L'access
// token, lui, est renvoyé dans le corps de la réponse et reste en
// mémoire côté client.
// ============================================================

const REFRESH_COOKIE = "thunderfam_refresh";
const REFRESH_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

function refreshCookieOptions(req: any) {
  const isHttps = req?.protocol === "https" || req?.headers?.["x-forwarded-proto"] === "https";
  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax" as const,
    path: "/",
    maxAge: REFRESH_MAX_AGE,
  };
}

function clientMeta(ctx: any) {
  return {
    ipAddress:
      ctx?.req?.headers?.["x-forwarded-for"]?.toString().split(",")[0]?.trim() ||
      ctx?.req?.ip ||
      null,
    userAgent: ctx?.req?.headers?.["user-agent"] ?? null,
  };
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de données indisponible." });
  return db;
}

/** Message unique pour tous les échecs de connexion (non-divulgation). */
const GENERIC_LOGIN_ERROR = "Adresse e-mail ou mot de passe incorrect.";

export const authRouter = router({
  // ---------- Inscription ----------
  register: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(150),
        email: z.string().email().max(320),
        password: z.string().min(10).max(200),
        phone: z.string().max(32).optional(),
        country: z.string().max(64).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const meta = clientMeta(ctx);

      const weak = validatePasswordStrength(input.password);
      if (weak) throw new TRPCError({ code: "BAD_REQUEST", message: weak });

      const email = input.email.toLowerCase().trim();
      const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);

      if (existing.length) {
        // On ne révèle pas que l'adresse est déjà utilisée : un
        // attaquant pourrait ainsi énumérer les comptes. L'utilisateur
        // légitime reçoit un e-mail lui rappelant qu'il a déjà un compte.
        await logAuthEvent({ email, event: "register", detail: "Adresse déjà utilisée", ...meta });
        return { success: true, emailSent: isAuthEmailConfigured() };
      }

      const passwordHash = await hashPassword(input.password);
      const [result]: any = await db.insert(users).values({
        openId: localOpenId(),
        name: input.name,
        email,
        loginMethod: "password",
        passwordHash,
        role: "user",
        phone: input.phone ?? null,
        country: input.country ?? null,
        emailVerified: false,
      });

      const userId = Number(result?.insertId ?? result?.[0]?.insertId);
      await logAuthEvent({ userId, email, event: "register", ...meta });

      if (isAuthEmailConfigured()) {
        const token = await issueToken(userId, "email_verification");
        await sendVerificationEmail(email, token, input.name);
      }

      return { success: true, emailSent: isAuthEmailConfigured() };
    }),

  // ---------- Connexion ----------
  login: publicProcedure
    .input(z.object({ email: z.string().email().max(320), password: z.string().max(200) }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const meta = clientMeta(ctx);
      const email = input.email.toLowerCase().trim();

      const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
      const user = rows[0];

      if (!user || !user.passwordHash) {
        await logAuthEvent({ email, event: "login_failed", detail: "Compte inexistant ou sans mot de passe", ...meta });
        throw new TRPCError({ code: "UNAUTHORIZED", message: GENERIC_LOGIN_ERROR });
      }

      if (!user.isActive) {
        await logAuthEvent({ userId: user.id, email, event: "login_failed", detail: "Compte désactivé", ...meta });
        throw new TRPCError({ code: "UNAUTHORIZED", message: GENERIC_LOGIN_ERROR });
      }

      if (isLocked(user)) {
        await logAuthEvent({ userId: user.id, email, event: "login_failed", detail: "Compte verrouillé", ...meta });
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Trop de tentatives. Réessayez dans quelques minutes.",
        });
      }

      const ok = await verifyPassword(input.password, user.passwordHash);
      if (!ok) {
        const locked = await registerFailedAttempt(user.id, user.failedLoginAttempts ?? 0);
        await logAuthEvent({
          userId: user.id, email,
          event: locked ? "account_locked" : "login_failed",
          detail: locked ? "Verrouillage après échecs répétés" : "Mot de passe incorrect",
          ...meta,
        });
        throw new TRPCError({ code: "UNAUTHORIZED", message: GENERIC_LOGIN_ERROR });
      }

      await resetFailedAttempts(user.id);
      const { refreshToken } = await createSession(user.id, meta);
      ctx.res?.cookie?.(REFRESH_COOKIE, refreshToken, refreshCookieOptions(ctx.req));

      await logAuthEvent({ userId: user.id, email, event: "login_success", ...meta });

      const payload: AccessTokenPayload = {
        sub: user.id,
        email: user.email,
        role: user.role as Role,
        name: typeof user.name === "string" ? user.name : null,
      };
      return { accessToken: signAccessToken(payload), user: payload, emailVerified: user.emailVerified };
    }),

  // ---------- Rafraîchissement ----------
  refresh: publicProcedure.mutation(async ({ ctx }) => {
    const token = ctx.req?.cookies?.[REFRESH_COOKIE];
    if (!token) throw new TRPCError({ code: "UNAUTHORIZED", message: "Session expirée." });

    const rotated = await rotateSession(token, clientMeta(ctx));
    if (!rotated) {
      ctx.res?.clearCookie?.(REFRESH_COOKIE, { path: "/" });
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Session expirée." });
    }

    ctx.res?.cookie?.(REFRESH_COOKIE, rotated.refreshToken, refreshCookieOptions(ctx.req));
    return { accessToken: rotated.accessToken, user: rotated.user };
  }),

  // ---------- Déconnexion ----------
  logout: publicProcedure.mutation(async ({ ctx }) => {
    const token = ctx.req?.cookies?.[REFRESH_COOKIE];
    if (token) await revokeSession(token);
    ctx.res?.clearCookie?.(REFRESH_COOKIE, { path: "/" });
    await logAuthEvent({ userId: ctx.user?.id ?? null, event: "logout", ...clientMeta(ctx) });
    return { success: true };
  }),

  // ---------- Mot de passe oublié ----------
  forgotPassword: publicProcedure
    .input(z.object({ email: z.string().email().max(320) }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const email = input.email.toLowerCase().trim();
      const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
      const user = rows[0];

      // Réponse volontairement identique qu'un compte existe ou non,
      // et même durée d'exécution perçue : sinon la procédure devient
      // un oracle permettant d'énumérer les adresses enregistrées.
      if (user && user.isActive && isAuthEmailConfigured()) {
        const token = await issueToken(user.id, "password_reset");
        await sendPasswordResetEmail(email, token, typeof user.name === "string" ? user.name : null);
        await logAuthEvent({
          userId: user.id, email, event: "password_reset_requested", ...clientMeta(ctx),
        });
      }

      return {
        success: true,
        message: "Si un compte existe pour cette adresse, un e-mail de réinitialisation vient d'être envoyé.",
      };
    }),

  // ---------- Réinitialisation ----------
  resetPassword: publicProcedure
    .input(z.object({ token: z.string().min(16).max(200), password: z.string().min(10).max(200) }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();

      const weak = validatePasswordStrength(input.password);
      if (weak) throw new TRPCError({ code: "BAD_REQUEST", message: weak });

      const userId = await consumeToken(input.token, "password_reset");
      if (!userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Ce lien est invalide ou a expiré. Demandez une nouvelle réinitialisation.",
        });
      }

      const passwordHash = await hashPassword(input.password);
      await db
        .update(users)
        .set({ passwordHash, failedLoginAttempts: 0, lockedUntil: null })
        .where(eq(users.id, userId));

      // Un changement de mot de passe invalide toutes les sessions :
      // si le compte était compromis, l'intrus perd immédiatement l'accès.
      await revokeAllSessions(userId);
      ctx.res?.clearCookie?.(REFRESH_COOKIE, { path: "/" });

      const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      const user = rows[0];
      await logAuthEvent({
        userId, email: user?.email ?? null, event: "password_reset_completed", ...clientMeta(ctx),
      });

      if (user?.email && isAuthEmailConfigured()) {
        await sendPasswordChangedEmail(user.email, typeof user.name === "string" ? user.name : null);
      }

      return { success: true };
    }),

  // ---------- Vérification d'e-mail ----------
  verifyEmail: publicProcedure
    .input(z.object({ token: z.string().min(16).max(200) }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const userId = await consumeToken(input.token, "email_verification");
      if (!userId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Ce lien est invalide ou a expiré." });
      }
      await db.update(users).set({ emailVerified: true }).where(eq(users.id, userId));
      await logAuthEvent({ userId, event: "email_verified", ...clientMeta(ctx) });
      return { success: true };
    }),

  resendVerification: protectedProcedure.mutation(async ({ ctx }) => {
    if (!isAuthEmailConfigured()) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "L'envoi d'e-mail n'est pas configuré." });
    }
    const db = await requireDb();
    const rows = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
    const user = rows[0];
    if (!user?.email) throw new TRPCError({ code: "BAD_REQUEST", message: "Aucune adresse e-mail sur ce compte." });
    if (user.emailVerified) return { success: true, alreadyVerified: true };

    const token = await issueToken(user.id, "email_verification");
    await sendVerificationEmail(user.email, token, typeof user.name === "string" ? user.name : null);
    return { success: true, alreadyVerified: false };
  }),

  // ---------- Changement de mot de passe (connecté) ----------
  changePassword: protectedProcedure
    .input(z.object({ currentPassword: z.string().max(200), newPassword: z.string().min(10).max(200) }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const weak = validatePasswordStrength(input.newPassword);
      if (weak) throw new TRPCError({ code: "BAD_REQUEST", message: weak });

      const rows = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
      const user = rows[0];
      if (!user?.passwordHash) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Ce compte n'utilise pas de mot de passe." });
      }
      if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Mot de passe actuel incorrect." });
      }

      await db
        .update(users)
        .set({ passwordHash: await hashPassword(input.newPassword) })
        .where(eq(users.id, user.id));
      await revokeAllSessions(user.id);
      ctx.res?.clearCookie?.(REFRESH_COOKIE, { path: "/" });

      if (user.email && isAuthEmailConfigured()) {
        await sendPasswordChangedEmail(user.email, typeof user.name === "string" ? user.name : null);
      }
      return { success: true };
    }),

  // ---------- Sessions ----------
  mySessions: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    return db
      .select({
        id: authSessions.id,
        userAgent: authSessions.userAgent,
        ipAddress: authSessions.ipAddress,
        createdAt: authSessions.createdAt,
        expiresAt: authSessions.expiresAt,
      })
      .from(authSessions)
      .where(and(eq(authSessions.userId, ctx.user.id), isNull(authSessions.revokedAt)))
      .orderBy(desc(authSessions.createdAt));
  }),

  revokeAllMySessions: protectedProcedure.mutation(async ({ ctx }) => {
    await revokeAllSessions(ctx.user.id);
    ctx.res?.clearCookie?.(REFRESH_COOKIE, { path: "/" });
    return { success: true };
  }),

  // ---------- Journal d'audit (administration) ----------
  auditLog: permissionProcedure("audit:read")
    .input(z.object({ limit: z.number().int().min(1).max(200).default(100) }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db
        .select()
        .from(authAuditLog)
        .orderBy(desc(authAuditLog.createdAt))
        .limit(input.limit);
    }),
});
