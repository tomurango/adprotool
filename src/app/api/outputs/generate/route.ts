import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projects, checklistItems, outputs } from '@/lib/db/schema';
import { initDb } from '@/lib/db/init';
import { ai, buildSNSPostPrompt, buildVideoScriptPrompt } from '@/lib/ai';
import type { AIMessage } from '@/lib/ai';
import type { OutputFormat } from '@/lib/output-formats';
import { nanoid } from 'nanoid';
import { eq, asc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  initDb();
  const body = await request.json();
  const { projectId, type, platform, format, additionalInstruction } = body;

  if (!projectId || !type) {
    return NextResponse.json({ error: 'projectId と type は必須です' }, { status: 400 });
  }

  const project = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project.length) {
    return NextResponse.json({ error: 'プロジェクトが見つかりません' }, { status: 404 });
  }

  const items = await db
    .select()
    .from(checklistItems)
    .where(eq(checklistItems.projectId, projectId))
    .orderBy(asc(checklistItems.order));

  let prompt: string;
  if (type === 'sns_post') {
    prompt = buildSNSPostPrompt(
      project[0],
      items,
      platform ?? 'twitter',
      additionalInstruction
    );
  } else if (type === 'video_script') {
    prompt = buildVideoScriptPrompt(
      project[0],
      items,
      (format ?? 'plain_script') as OutputFormat,
      additionalInstruction
    );
  } else {
    return NextResponse.json({ error: '不正なタイプです' }, { status: 400 });
  }

  const aiMessages: AIMessage[] = [{ role: 'user', content: prompt }];
  const content = await ai.chat(aiMessages, { temperature: 0.8, maxTokens: 2048 });

  const outputId = nanoid();
  await db.insert(outputs).values({
    id: outputId,
    projectId,
    type,
    platform: platform ?? null,
    format: format ?? null,
    content,
    status: 'draft',
    postedAt: null,
    createdAt: new Date(),
  });

  const output = await db.select().from(outputs).where(eq(outputs.id, outputId));
  return NextResponse.json(output[0], { status: 201 });
}
