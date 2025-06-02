import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token');

  // Protect specific routes
  if (request.nextUrl.pathname.startsWith('/chat') && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If no redirect is needed, continue with the request
  return NextResponse.next();
}

export const config = {
  matcher: ['/chat/:path*'], // Add protected routes
};
