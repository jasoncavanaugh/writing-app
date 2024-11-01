import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { db } from "~/server/db";
import { blobs } from "~/server/db/schema";

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
      await ctx.db.delete(blobs);
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
      if (!input.parentId) {
        return;
      }
      if (ret.length === 0) {
        throw new Error("Error inserting");
      }
      const persisted_id = ret[0]?.persisted_id!!;
      const parent_id = input.parentId;
      const parent_blob = await ctx.db.query.blobs.findFirst({
        where: (blob, { eq }) => eq(blob.id, parent_id),
      });
      if (!parent_blob) {
        return;
      }
      const kidsArr = parent_blob.kids?.split(",") ?? [];
      kidsArr.push(persisted_id.toString());
      await ctx.db
        .insert(blobs)
        .values({ ...parent_blob, kids: kidsArr.join(",") })
        .onConflictDoUpdate({
          target: blobs.id,
          set: { kids: kidsArr.join(",") },
        });
      return persisted_id;
    }),
});
