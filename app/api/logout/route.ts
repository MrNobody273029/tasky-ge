// app/api/logout/route.ts
import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({ ok: true });

  // რომელი ქუქებიც შეიძლება გქონდეს auth-ისთვის
  const names = ['auth', 'token', 'x-user-id', 'uid', 'email', 'x-email'];

  for (const name of names) {
    res.cookies.set(name, '', {
      maxAge: 0,
      path: '/',
      httpOnly: false,     // თუ გაქვს httpOnly, აქ შეგიძლია true გახადო
      sameSite: 'lax',
    });
  }

  return res;
}
