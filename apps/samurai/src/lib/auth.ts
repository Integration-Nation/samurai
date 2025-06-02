// lib/auth.ts - Server-side auth utilities
import { cookies } from 'next/headers';

export async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token');

  if (!token) {
    return null;
  }

  try {
    // Call your NestJS backend directly
    const response = await fetch('http://localhost:3000/api/auth/me', {
      headers: {
        Cookie: `access_token=${token.value}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

export function logout() {
  // Clear the cookie
  document.cookie =
    'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  window.location.href = '/';
}
