import { db, dbRead } from "@/lib/db";
import { brandFeedback, orders } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export type BrandFeedbackRow = typeof brandFeedback.$inferSelect;

export interface CreateFeedbackInput {
  userId: number;
  orderId?: string | null;
  rating: number;
  comment?: string | null;
}

export async function createFeedback(input: CreateFeedbackInput): Promise<BrandFeedbackRow> {
  const [row] = await db
    .insert(brandFeedback)
    .values({
      userId: input.userId,
      orderId: input.orderId ?? null,
      rating: input.rating,
      comment: input.comment ?? null,
    })
    .returning();
  return row;
}

/** Confirms the order belongs to this user, so feedback can't be attached to someone else's order. */
export async function userOwnsOrder(userId: number, orderId: string): Promise<boolean> {
  const [row] = await dbRead
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
    .limit(1);
  return !!row;
}

export async function getAllFeedback(): Promise<BrandFeedbackRow[]> {
  return dbRead.select().from(brandFeedback).orderBy(desc(brandFeedback.createdAt));
}

export async function setFeedbackApproval(id: number, isApproved: boolean): Promise<BrandFeedbackRow | null> {
  const [row] = await db
    .update(brandFeedback)
    .set({ isApproved })
    .where(eq(brandFeedback.id, id))
    .returning();
  return row ?? null;
}
