import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { outputs } from '@/lib/db/schema';
import { initDb } from '@/lib/db/init';
import { eq, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  initDb();

  const rows = await db
    .select()
    .from(outputs)
    .where(eq(outputs.projectId, id))
    .orderBy(sql`${outputs.createdAt} desc`);

  return NextResponse.json(rows);
}
