import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { outputs, projectSnsAuth } from '@/lib/db/schema';
import { initDb } from '@/lib/db/init';
import { createSNSPlatform } from '@/lib/sns';
import { eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ outputId: string }> }
) {
  const { outputId } = await params;
  initDb();

  const output = await db.select().from(outputs).where(eq(outputs.id, outputId));
  if (!output.length) {
    return NextResponse.json({ error: 'アウトプットが見つかりません' }, { status: 404 });
  }

  const o = output[0];
  if (o.type !== 'sns_post' || !o.platform) {
    return NextResponse.json({ error: 'SNS投稿タイプのアウトプットではありません' }, { status: 400 });
  }

  const auth = await db
    .select()
    .from(projectSnsAuth)
    .where(
      and(
        eq(projectSnsAuth.projectId, o.projectId),
        eq(projectSnsAuth.platform, o.platform)
      )
    );

  if (!auth.length || !auth[0].accessToken || !auth[0].accessTokenSecret) {
    return NextResponse.json({ error: 'SNS認証が設定されていません' }, { status: 400 });
  }

  const platform = createSNSPlatform(o.platform as 'twitter', {
    accessToken: auth[0].accessToken,
    accessTokenSecret: auth[0].accessTokenSecret,
  });

  const result = await platform.post(o.content);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  await db
    .update(outputs)
    .set({ status: 'posted', postedAt: new Date() })
    .where(eq(outputs.id, outputId));

  return NextResponse.json({ success: true, url: result.url });
}
