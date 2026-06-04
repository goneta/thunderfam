import { z } from "zod/v4";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { documents, notifications } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { storagePut } from "../storage";

const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/svg+xml",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "application/xml",
  "text/xml",
];

const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16MB

export const documentsRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const conditions = [eq(documents.userId, ctx.user.id)];
      if (input.projectId) {
        conditions.push(eq(documents.projectId, input.projectId));
      }
      return db
        .select()
        .from(documents)
        .where(and(...conditions))
        .orderBy(desc(documents.createdAt));
    }),

  upload: protectedProcedure
    .input(
      z.object({
        filename: z.string().min(1).max(512),
        mimeType: z.string().min(1),
        fileSize: z.number().max(MAX_FILE_SIZE),
        base64Data: z.string(),
        projectId: z.number().optional(),
        category: z.string().default("general"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ALLOWED_MIME_TYPES.includes(input.mimeType)) {
        throw new Error(`Type de fichier non autorisé: ${input.mimeType}`);
      }

      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      // Decode base64 and upload to S3
      const buffer = Buffer.from(input.base64Data, "base64");
      const key = `documents/${ctx.user.id}/${Date.now()}-${input.filename}`;
      const { url } = await storagePut(key, buffer, input.mimeType);

      const [doc] = await db
        .insert(documents)
        .values({
          userId: ctx.user.id,
          projectId: input.projectId,
          filename: key,
          originalName: input.filename,
          mimeType: input.mimeType,
          fileSize: input.fileSize,
          storageKey: key,
          storageUrl: url,
          category: input.category,
        })
        .$returningId();

      // Notify if linked to project
      if (input.projectId) {
        await db.insert(notifications).values({
          userId: ctx.user.id,
          title: "Document uploadé",
          content: `Le fichier "${input.filename}" a été ajouté au projet.`,
          type: "document_uploaded",
          relatedProjectId: input.projectId,
        });
      }

      return { success: true, id: doc.id, url };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db
        .delete(documents)
        .where(and(eq(documents.id, input.id), eq(documents.userId, ctx.user.id)));
      return { success: true };
    }),
});
