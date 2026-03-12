import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checklistItems, checklistItemHistory } from '@/lib/db/schema';
import { initDb } from '@/lib/db/init';
import { eq, and, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const dynamic = 'force-dynamic';

// 履歴取得
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { itemId } = await params;
  initDb();
  const history = await db
    .select()
    .from(checklistItemHistory)
    .where(eq(checklistItemHistory.checklistItemId, itemId))
    .orderBy(desc(checklistItemHistory.createdAt));
  return NextResponse.json(history);
}

// 手動更新
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

  // 変更前の値を履歴に保存
  const prev = existing[0];
  if (answer !== undefined && answer !== prev.answer) {
    await db.insert(checklistItemHistory).values({
      id: nanoid(),
      checklistItemId: itemId,
      answer: prev.answer,
      source: 'manual',
      reasoning: null,
      createdAt: new Date(),
    });
  }

  const updateData: Partial<typeof checklistItems.$inferInsert> = { updatedAt: new Date() };
  if (answer !== undefined) updateData.answer = answer;
  if (isCompleted !== undefined) updateData.isCompleted = isCompleted;

  await db.update(checklistItems).set(updateData).where(eq(checklistItems.id, itemId));
  const updated = await db.select().from(checklistItems).where(eq(checklistItems.id, itemId));
  return NextResponse.json(updated[0]);
}

// 履歴から1件前に戻す
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id, itemId } = await params;
  initDb();
  const body = await request.json();
  if (body.action !== 'revert') {
    return NextResponse.json({ error: '不正なアクション' }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(checklistItems)
    .where(and(eq(checklistItems.id, itemId), eq(checklistItems.projectId, id)));
  if (!existing.length) {
    return NextResponse.json({ error: 'チェックシート項目が見つかりません' }, { status: 404 });
  }

  const history = await db
    .select()
    .from(checklistItemHistory)
    .where(eq(checklistItemHistory.checklistItemId, itemId))
    .orderBy(desc(checklistItemHistory.createdAt))
    .limit(1);

  if (!history.length) {
    return NextResponse.json({ error: '履歴がありません' }, { status: 404 });
  }

  const prev = history[0];
  // 現在の値を履歴に残してから戻す
  await db.insert(checklistItemHistory).values({
    id: nanoid(),
    checklistItemId: itemId,
    answer: existing[0].answer,
    source: 'manual',
    reasoning: 'revert',
    createdAt: new Date(),
  });
  await db
    .update(checklistItems)
    .set({ answer: prev.answer, updatedAt: new Date() })
    .where(eq(checklistItems.id, itemId));
  // 使用した履歴レコードを削除
  await db.delete(checklistItemHistory).where(eq(checklistItemHistory.id, prev.id));

  const updated = await db.select().from(checklistItems).where(eq(checklistItems.id, itemId));
  return NextResponse.json(updated[0]);
}
