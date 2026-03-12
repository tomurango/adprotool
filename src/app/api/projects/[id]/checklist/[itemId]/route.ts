import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checklistItems } from '@/lib/db/schema';
import { initDb } from '@/lib/db/init';
import { eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id, itemId } = await params;
  initDb();
  const body = await request.json();
  const { answer, isCompleted } = body;

  const existing = await db
    .select()
    .from(checklistItems)
    .where(and(eq(checklistItems.id, itemId), eq(checklistItems.projectId, id)));

  if (!existing.length) {
    return NextResponse.json({ error: 'チェックシート項目が見つかりません' }, { status: 404 });
  }

  const updateData: Partial<typeof checklistItems.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (answer !== undefined) updateData.answer = answer;
  if (isCompleted !== undefined) updateData.isCompleted = isCompleted;

  await db
    .update(checklistItems)
    .set(updateData)
    .where(eq(checklistItems.id, itemId));

  const updated = await db.select().from(checklistItems).where(eq(checklistItems.id, itemId));
  return NextResponse.json(updated[0]);
}
