import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projects, checklistItems } from '@/lib/db/schema';
import { initDb } from '@/lib/db/init';
import { DEFAULT_CHECKLIST_ITEMS } from '@/lib/checklist';
import { nanoid } from 'nanoid';
import { eq, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  initDb();
  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      checklistTotal: sql<number>`count(${checklistItems.id})`,
      checklistCompleted: sql<number>`sum(case when ${checklistItems.isCompleted} then 1 else 0 end)`,
    })
    .from(projects)
    .leftJoin(checklistItems, eq(projects.id, checklistItems.projectId))
    .groupBy(projects.id)
    .orderBy(sql`${projects.updatedAt} desc`);

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  initDb();
  const body = await request.json();
  const { name, description } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: 'プロジェクト名は必須です' }, { status: 400 });
  }

  const now = new Date();
  const projectId = nanoid();

  await db.insert(projects).values({
    id: projectId,
    name: name.trim(),
    description: description?.trim() || null,
    createdAt: now,
    updatedAt: now,
  });

  const itemsToInsert = DEFAULT_CHECKLIST_ITEMS.map(item => ({
    id: nanoid(),
    projectId,
    question: item.question,
    answer: null,
    isCompleted: false,
    order: item.order,
    createdAt: now,
    updatedAt: now,
  }));

  await db.insert(checklistItems).values(itemsToInsert);

  const project = await db.select().from(projects).where(eq(projects.id, projectId));
  return NextResponse.json(project[0], { status: 201 });
}
