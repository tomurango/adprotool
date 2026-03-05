import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { outputs } from '@/lib/db/schema';
import { initDb } from '@/lib/db/init';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ outputId: string }> }
) {
  const { outputId } = await params;
  initDb();
  const body = await request.json();
  const { content, status } = body;

  const existing = await db.select().from(outputs).where(eq(outputs.id, outputId));
  if (!existing.length) {
    return NextResponse.json({ error: 'アウトプットが見つかりません' }, { status: 404 });
  }

  const updateData: Partial<typeof outputs.$inferInsert> = {};
  if (content !== undefined) updateData.content = content;
  if (status !== undefined) updateData.status = status;

  await db.update(outputs).set(updateData).where(eq(outputs.id, outputId));
  const updated = await db.select().from(outputs).where(eq(outputs.id, outputId));
  return NextResponse.json(updated[0]);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ outputId: string }> }
) {
  const { outputId } = await params;
  initDb();

  const existing = await db.select().from(outputs).where(eq(outputs.id, outputId));
  if (!existing.length) {
    return NextResponse.json({ error: 'アウトプットが見つかりません' }, { status: 404 });
  }

  await db.delete(outputs).where(eq(outputs.id, outputId));
  return NextResponse.json({ success: true });
}
