import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionUser, getUserAssets, saveUserAssets } from '@/lib/db';

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  return await getSessionUser(token);
}

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 });
  return NextResponse.json(await getUserAssets(user.id));
}

export async function POST(req) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 });

  const assets = await req.json();
  await saveUserAssets(user.id, assets);
  return NextResponse.json({ ok: true });
}
