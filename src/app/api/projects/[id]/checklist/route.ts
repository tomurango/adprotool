import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checklistItems } from '@/lib/db/schema';
import { initDb } from '@/lib/db/init';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  initDb();

  const items = await db
    .select()
    .from(checklistItems)
    .where(eq(checklistItems.projectId, id))
    .orderBy(checklistItems.order);

  return NextResponse.json(items);
}
