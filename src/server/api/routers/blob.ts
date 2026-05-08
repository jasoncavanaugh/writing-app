import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { blobs } from "~/server/db/schema";
import { eq, inArray } from "drizzle-orm";

export const blobRouter = createTRPCRouter({
  get_blobs_for_user: protectedProcedure.query(async ({ ctx }) => {
    const user_with_blobs = await ctx.db.query.users.findFirst({
      where: (user, { eq }) => eq(user.id, ctx.session.user.id),
      with: {
        blobs: true,
      },
    });
    return user_with_blobs?.blobs ?? [];
  }),
  delete_blob: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const all_blobs = await ctx.db.query.blobs.findMany({
        where: (blob, { eq }) => eq(blob.userId, ctx.session.user.id),
      });

      // Collect all descendant IDs via BFS
      const ids_to_delete: number[] = [];
      let current = [input.id];
      while (current.length > 0) {
        ids_to_delete.push(...current);
        current = all_blobs
          .filter((b) => b.parentId !== null && current.includes(b.parentId))
          .map((b) => b.id);
      }

      await ctx.db.delete(blobs).where(inArray(blobs.id, ids_to_delete));
    }),
  create_blob: protectedProcedure
    .input(
      z.object({
        content: z.string(),
        order: z.number(),
        parentId: z.number().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const ret = await ctx.db
        .insert(blobs)
        .values({
          content: input.content,
          order: input.order,
          parentId: input.parentId,
          userId: ctx.session.user.id,
        })
        .returning({ persisted_id: blobs.id });
      if (ret.length === 0) {
        throw new Error("Error inserting");
      }
      return ret[0]!.persisted_id;
    }),
  reorder_blobs: protectedProcedure
    .input(z.array(z.number()))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        for (let i = 0; i < input.length; i++) {
          await tx
            .update(blobs)
            .set({ order: i })
            .where(eq(blobs.id, input[i]!));
        }
      });
    }),
  edit_blob_content: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        content: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(blobs)
        .set({ content: input.content })
        .where(eq(blobs.id, input.id));
    }),
});
