import { db } from '@/lib/db';
import { conversations, messages } from '@/lib/db/schema';
import { initDb } from '@/lib/db/init';
import { eq, desc, asc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  initDb();
  const { id: projectId } = await params;

  // 最新の会話を取得
  const [latest] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.projectId, projectId))
    .orderBy(desc(conversations.createdAt))
    .limit(1);

  if (!latest) {
    return Response.json({ conversationId: null, messages: [] });
  }

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, latest.id))
    .orderBy(asc(messages.createdAt));

  return Response.json({
    conversationId: latest.id,
    messages: msgs.map(m => ({ role: m.role, content: m.content })),
  });
}
