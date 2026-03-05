import { NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId は必須です' }, { status: 400 });
  }

  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  const callbackUrl = process.env.TWITTER_CALLBACK_URL;

  if (!apiKey || !apiSecret || !callbackUrl) {
    return NextResponse.json({ error: 'Twitter API credentials are not configured' }, { status: 500 });
  }

  const client = new TwitterApi({ appKey: apiKey, appSecret: apiSecret });
  const authLink = await client.generateAuthLink(`${callbackUrl}?projectId=${projectId}`);

  return NextResponse.redirect(authLink.url);
}
