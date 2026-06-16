import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { getUserByEmail, createSession } from '@/lib/db';

export async function POST(req) {
  const { email, password } = await req.json();

  if (!email?.trim() || !password?.trim()) {
    return NextResponse.json({ error: 'נא למלא את כל השדות' }, { status: 400 });
  }

  const user = await getUserByEmail(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return NextResponse.json({ error: 'מייל או סיסמה שגויים' }, { status: 401 });
  }

  const token = uuid();
  await createSession(token, user.id);

  const res = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } });
  res.cookies.set('session', token, { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 30 });
  return res;
}
