import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { getUserByEmail, createUser, createSession } from '@/lib/db';

export async function POST(req) {
  const { name, email, password } = await req.json();

  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    return NextResponse.json({ error: 'נא למלא את כל השדות' }, { status: 400 });
  }

  if (password.length < 4) {
    return NextResponse.json({ error: 'סיסמה חייבת להיות לפחות 4 תווים' }, { status: 400 });
  }

  if (await getUserByEmail(email)) {
    return NextResponse.json({ error: 'כתובת המייל כבר רשומה' }, { status: 400 });
  }

  const user = {
    id: uuid(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    passwordHash: bcrypt.hashSync(password, 10),
    createdAt: Date.now(),
  };

  await createUser(user);

  const token = uuid();
  await createSession(token, user.id);

  const res = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } });
  res.cookies.set('session', token, { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 30 });
  return res;
}
