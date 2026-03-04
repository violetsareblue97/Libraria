import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export default async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // create supabase client that can read/write cookies in the request
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  const path = request.nextUrl.pathname

  // routes that require login
  const PROTECTED_ROUTES = ["/dashboard", "/admin", "/katalog"];
  const isProtected = PROTECTED_ROUTES.some(r => path.startsWith(r));
  const isAuthOnly = path.startsWith("/auth");

  // redirect to login if user tries to access protected page without session
  if (isProtected && !session) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth"
    url.searchParams.set("redirectedFrom", path)
    return NextResponse.redirect(url)
  }

  // if already logged in and tries to visit /auth, redirect to dashboard
  if (isAuthOnly && session) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single()

    const url = request.nextUrl.clone()
    url.pathname = profile?.role === "admin" ? "/admin" : "/dashboard"
    return NextResponse.redirect(url)
  }

  return response
}

// only run middleware on these routes
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/katalog/:path*",
    "/auth",
  ],
}