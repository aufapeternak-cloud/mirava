import { NextResponse } from 'next/server';

export function middleware(request) {
  const authToken = request.cookies.get('auth_token');
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register'];
  const isPublicRoute = publicRoutes.includes(pathname);

  // Static assets and API routes should not be processed
  const isStaticAsset = pathname.startsWith('/_next/') || 
                       pathname.startsWith('/api/') || 
                       pathname.includes('.');

  if (isStaticAsset) {
    return NextResponse.next();
  }

  // If user is authenticated and trying to access login/register, redirect to home
  if (authToken && isPublicRoute) {
    console.log('Authenticated user accessing public route, redirecting to home');
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If user is not authenticated and trying to access protected route, redirect to login
  if (!authToken && !isPublicRoute) {
    console.log('Unauthenticated user accessing protected route, redirecting to login');
    
    // Create response to redirect to login
    const response = NextResponse.redirect(new URL('/login', request.url));
    
    // Clear any potentially corrupted auth cookies
    response.cookies.delete('auth_token');
    
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$|.*\\.css$|.*\\.js$).*)'
  ]
};
