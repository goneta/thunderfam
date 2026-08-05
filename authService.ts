import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { getDb } from "../db";
import { users, authSessions, authTokens, authAuditLog } from "../../drizzle/schema";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import type { Role } from "@shared/permissions";

// ============================================================
// Service d'authentification intégré au site.
//
// Choix de conception :
// - Mots de passe hachés avec bcrypt (coût 12).
// - Access token : JWT court (15 min), non persisté.
// - Refresh token : aléatoire 32 octets, seul son SHA-256 est stocké.
//   Une fuite de la base ne permet donc pas de rejouer une session.
// - Rotation du refresh token à chaque rafraîchissement.
// - Verrouillage temporaire du compte après 5 échecs consécutifs.
// ============================================================

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL_DAYS = 30;
const RESET_TOKEN_TTL_MINUTES = 60;
const VERIFY_TOKEN_TTL_HOURS = 48;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    // Refus explicite plutôt qu'un secret par défaut : un secret
    // faible ou deviné compromettrait toutes les sessions.
    throw new Error(
      "JWT_SECRET manquant ou trop court (32 caractères minimum). " +
        "Générez-le avec : openssl rand -base64 48"
    );
  }
  return secret;
}

export interface AccessTokenPayload {
  sub: number;
  email: string | null;
  role: Role;
  name: string | null;
}

// ---------- Mots de passe ----------

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Règles minimales : 10 caractères, au moins une lettre et un chiffre. */
export function validatePasswordStrength(password: string): string | null {
  if (password.length < 10) return "Le mot de passe doit contenir au moins 10 caractères.";
  if (!/[a-zA-Z]/.test(password)) return "Le mot de passe doit contenir au moins une lettre.";
  if (!/[0-9]/.test(password)) return "Le mot de passe doit contenir au moins un chiffre.";
  return null;
}

// ---------- Jetons ----------

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, jwtSecret(), { expiresIn: ACCESS_TOKEN_TTL });
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    return jwt.verify(token, jwtSecret()) as unknown as AccessTokenPayload;
  } catch {
    return null;
  }
}

function randomToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// ---------- Journal d'audit ----------

export async function logAuthEvent(entry: {
  userId?: number | null;
  email?: string | null;
  event:
    | "login_success" | "login_failed" | "logout" | "register"
    | "password_reset_requested" | "password_reset_completed"
    | "email_verified" | "account_locked" | "permission_denied";
  ipAddress?: string | null;
  userAgent?: string | null;
  detail?: string | null;
}): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(authAuditLog).values({
      userId: entry.userId ?? null,
      email: entry.email ?? null,
      event: entry.event,
      ipAddress: entry.ipAddress ?? null,
      userAgent: entry.userAgent?.slice(0, 500) ?? null,
      detail: entry.detail ?? null,
    });
  } catch {
    // L'audit ne doit jamais faire échouer l'authentification elle-même.
  }
}

// ---------- Sessions ----------

export async function createSession(
  userId: number,
  meta: { userAgent?: string | null; ipAddress?: string | null } = {}
): Promise<{ refreshToken: string; expiresAt: Date }> {
  const db = await getDb();
  if (!db) throw new Error("Base de données indisponible");

  const refreshToken = randomToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 86400_000);

  await db.insert(authSessions).values({
    userId,
    refreshTokenHash: hashToken(refreshToken),
    userAgent: meta.userAgent?.slice(0, 500) ?? null,
    ipAddress: meta.ipAddress ?? null,
    expiresAt,
  });

  return { refreshToken, expiresAt };
}

/**
 * Échange un refresh token contre un nouveau couple de jetons.
 * L'ancien est révoqué dans le même mouvement (rotation) : un jeton
 * volé devient inutilisable dès que le titulaire légitime rafraîchit.
 */
export async function rotateSession(
  refreshToken: string,
  meta: { userAgent?: string | null; ipAddress?: string | null } = {}
): Promise<{ accessToken: string; refreshToken: string; user: AccessTokenPayload } | null> {
  const db = await getDb();
  if (!db) return null;

  const hash = hashToken(refreshToken);
  const rows = await db
    .select()
    .from(authSessions)
    .where(
      and(
        eq(authSessions.refreshTokenHash, hash),
        isNull(authSessions.revokedAt),
        gt(authSessions.expiresAt, new Date())
      )
    )
    .limit(1);

  const session = rows[0];
  if (!session) return null;

  const userRows = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  const user = userRows[0];
  if (!user || !user.isActive) return null;

  // Révoque l'ancienne session puis en ouvre une nouvelle
  await db
    .update(authSessions)
    .set({ revokedAt: new Date() })
    .where(eq(authSessions.id, session.id));

  const fresh = await createSession(user.id, meta);

  const payload: AccessTokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role as Role,
    name: typeof user.name === "string" ? user.name : null,
  };

  return {
    accessToken: signAccessToken(payload),
    refreshToken: fresh.refreshToken,
    user: payload,
  };
}

export async function revokeSession(refreshToken: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(authSessions)
    .set({ revokedAt: new Date() })
    .where(eq(authSessions.refreshTokenHash, hashToken(refreshToken)));
}

/** Révoque toutes les sessions d'un utilisateur (changement de mot de passe, compromission). */
export async function revokeAllSessions(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(authSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(authSessions.userId, userId), isNull(authSessions.revokedAt)));
}

// ---------- Verrouillage anti-bourrinage ----------

export function isLocked(user: { lockedUntil?: Date | null }): boolean {
  return Boolean(user.lockedUntil && user.lockedUntil.getTime() > Date.now());
}

export async function registerFailedAttempt(userId: number, current: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const attempts = current + 1;
  const shouldLock = attempts >= MAX_FAILED_ATTEMPTS;

  await db
    .update(users)
    .set({
      failedLoginAttempts: attempts,
      lockedUntil: shouldLock ? new Date(Date.now() + LOCK_DURATION_MINUTES * 60_000) : null,
    })
    .where(eq(users.id, userId));

  return shouldLock;
}

export async function resetFailedAttempts(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(users)
    .set({ failedLoginAttempts: 0, lockedUntil: null, lastSignedIn: new Date() })
    .where(eq(users.id, userId));
}

// ---------- Jetons à usage unique ----------

export async function issueToken(
  userId: number,
  purpose: "password_reset" | "email_verification"
): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Base de données indisponible");

  const token = randomToken();
  const ttlMs =
    purpose === "password_reset"
      ? RESET_TOKEN_TTL_MINUTES * 60_000
      : VERIFY_TOKEN_TTL_HOURS * 3_600_000;

  await db.insert(authTokens).values({
    userId,
    tokenHash: hashToken(token),
    purpose,
    expiresAt: new Date(Date.now() + ttlMs),
  });

  return token;
}

/** Consomme un jeton à usage unique. Renvoie l'userId, ou null si invalide/expiré/déjà utilisé. */
export async function consumeToken(
  token: string,
  purpose: "password_reset" | "email_verification"
): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;

  const hash = hashToken(token);
  const rows = await db
    .select()
    .from(authTokens)
    .where(
      and(
        eq(authTokens.tokenHash, hash),
        eq(authTokens.purpose, purpose),
        isNull(authTokens.usedAt),
        gt(authTokens.expiresAt, new Date())
      )
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  await db.update(authTokens).set({ usedAt: new Date() }).where(eq(authTokens.id, row.id));
  return row.userId;
}

/** Identifiant openId synthétique pour les comptes créés par mot de passe. */
export function localOpenId(): string {
  return `local:${crypto.randomUUID()}`;
}
