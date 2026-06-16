import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionUser } from '@/lib/db';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  const user = await getSessionUser(token);

  if (!user) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } });
}
