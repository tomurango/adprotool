import { NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import { db } from '@/lib/db';
import { projectSnsAuth } from '@/lib/db/schema';
import { initDb } from '@/lib/db/init';
import { nanoid } from 'nanoid';
import { eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  initDb();
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  const oauthToken = searchParams.get('oauth_token');
  const oauthVerifier = searchParams.get('oauth_verifier');

  if (!projectId || !oauthToken || !oauthVerifier) {
    return NextResponse.json({ error: '無効なコールバックパラメータです' }, { status: 400 });
  }

  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;

  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: 'Twitter API credentials are not configured' }, { status: 500 });
  }

  const client = new TwitterApi({
    appKey: apiKey,
    appSecret: apiSecret,
    accessToken: oauthToken,
    accessSecret: '',
  });

  const { accessToken, accessSecret, screenName } = await client.login(oauthVerifier);

  // 既存の認証情報を更新または新規作成
  const existing = await db
    .select()
    .from(projectSnsAuth)
    .where(
      and(
        eq(projectSnsAuth.projectId, projectId),
        eq(projectSnsAuth.platform, 'twitter')
      )
    );

  if (existing.length) {
    await db
      .update(projectSnsAuth)
      .set({
        accessToken,
        accessTokenSecret: accessSecret,
        username: screenName,
        connectedAt: new Date(),
      })
      .where(eq(projectSnsAuth.id, existing[0].id));
  } else {
    await db.insert(projectSnsAuth).values({
      id: nanoid(),
      projectId,
      platform: 'twitter',
      accessToken,
      accessTokenSecret: accessSecret,
      username: screenName,
      connectedAt: new Date(),
    });
  }

  return NextResponse.redirect(new URL(`/projects/${projectId}`, request.url));
}
