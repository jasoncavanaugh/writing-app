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
      console.log("in", input);
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
      const persistedId = ret[0]?.persisted_id!!;
      const parentId = input.parentId;
      const parentBlob = await ctx.db.query.blobs.findFirst({
        where: (blob, { eq }) => eq(blob.id, parentId),
      });
      if (!parentBlob) {
        return;
      }
      const kidsArr = parentBlob.kids?.split(",") ?? [];
      kidsArr.push(persistedId.toString());
      await ctx.db
        .insert(blobs)
        .values({ ...parentBlob, kids: kidsArr.join(",") })
        .onConflictDoUpdate({
          target: blobs.id,
          set: { kids: kidsArr.join(",") }
        });
    }),
  /*
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text}`,
      };
    }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(posts).values({
        name: input.name,
        createdById: ctx.session.user.id,
      });
    }),

  getLatest: publicProcedure.query(async ({ ctx }) => {
    const post = await ctx.db.query.posts.findFirst({
      orderBy: (posts, { desc }) => [desc(posts.createdAt)],
    });

    return post ?? null;
  }),

  getSecretMessage: protectedProcedure.query(() => {
    return "you can now see this secret message!";
  }),
*/
});
