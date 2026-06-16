import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionUser, getUserMemory, saveUserMemory } from '@/lib/db';

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  return await getSessionUser(token);
}

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 });
  return NextResponse.json(await getUserMemory(user.id));
}

export async function POST(req) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 });

  const memory = await req.json();
  await saveUserMemory(user.id, memory);
  return NextResponse.json({ ok: true });
}
