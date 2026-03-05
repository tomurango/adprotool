import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projects, checklistItems, conversations, messages, outputs, projectSnsAuth } from '@/lib/db/schema';
import { initDb } from '@/lib/db/init';
import { eq, sql, inArray } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  initDb();

  const project = await db.select().from(projects).where(eq(projects.id, id));
  if (!project.length) {
    return NextResponse.json({ error: 'プロジェクトが見つかりません' }, { status: 404 });
  }

  const items = await db
    .select()
    .from(checklistItems)
    .where(eq(checklistItems.projectId, id))
    .orderBy(checklistItems.order);

  const recentOutputs = await db
    .select()
    .from(outputs)
    .where(eq(outputs.projectId, id))
    .orderBy(sql`${outputs.createdAt} desc`)
    .limit(3);

  return NextResponse.json({
    ...project[0],
    checklistItems: items,
    recentOutputs,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  initDb();
  const body = await request.json();
  const { name, description } = body;

  const existing = await db.select().from(projects).where(eq(projects.id, id));
  if (!existing.length) {
    return NextResponse.json({ error: 'プロジェクトが見つかりません' }, { status: 404 });
  }

  await db
    .update(projects)
    .set({
      name: name?.trim() ?? existing[0].name,
      description: description !== undefined ? description?.trim() || null : existing[0].description,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, id));

  const updated = await db.select().from(projects).where(eq(projects.id, id));
  return NextResponse.json(updated[0]);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  initDb();

  const existing = await db.select().from(projects).where(eq(projects.id, id));
  if (!existing.length) {
    return NextResponse.json({ error: 'プロジェクトが見つかりません' }, { status: 404 });
  }

  // 外部キー制約に従い、依存順に削除する
  // 1. messagesはconversationsを参照
  const convRows = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(eq(conversations.projectId, id));
  if (convRows.length) {
    const convIds = convRows.map(c => c.id);
    await db.delete(messages).where(inArray(messages.conversationId, convIds));
  }
  await db.delete(conversations).where(eq(conversations.projectId, id));

  // 2. outputs, project_sns_auth, checklist_items はprojectを参照
  await db.delete(outputs).where(eq(outputs.projectId, id));
  await db.delete(projectSnsAuth).where(eq(projectSnsAuth.projectId, id));
  await db.delete(checklistItems).where(eq(checklistItems.projectId, id));

  // 3. 最後にproject本体を削除
  await db.delete(projects).where(eq(projects.id, id));
  return NextResponse.json({ success: true });
}
