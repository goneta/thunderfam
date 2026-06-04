import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { projectsRouter } from "./routers/projects";
import { servicesRouter } from "./routers/services";
import { notificationsRouter } from "./routers/notificationsRouter";
import { documentsRouter } from "./routers/documentsRouter";
import { ticketsRouter } from "./routers/ticketsRouter";
import { paymentsRouter } from "./routers/paymentsRouter";
import { adminRouter } from "./routers/adminRouter";
import { z } from "zod/v4";
import { notifyOwner } from "./_core/notification";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  projects: projectsRouter,
  services: servicesRouter,
  notifications: notificationsRouter,
  documents: documentsRouter,
  tickets: ticketsRouter,
  payments: paymentsRouter,
  admin: adminRouter,

  contact: router({
    send: publicProcedure
      .input(
        z.object({
          name: z.string().min(1).max(128),
          email: z.string().email().max(320),
          message: z.string().min(10).max(2000),
        })
      )
      .mutation(async ({ input }) => {
        await notifyOwner({
          title: `Nouveau message de ${input.name}`,
          content: `De : ${input.name} <${input.email}>\n\n${input.message}`,
        });
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
