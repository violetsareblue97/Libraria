// proxy.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Pastikan menggunakan 'export default' agar Next.js mengenalinya sebagai entry point proxy
export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

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

  // Daftar rute yang harus login
  const PROTECTED_ROUTES = ["/dashboard", "/admin", "/katalog"];
  const isProtected = PROTECTED_ROUTES.some(r => path.startsWith(r));
  const isAuthOnly = path.startsWith("/auth");

  // Logika Proteksi: Jika belum login dan akses rute terproteksi
  if (isProtected && !session) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth"
    url.searchParams.set("redirectedFrom", path)
    return NextResponse.redirect(url)
  }

  // Logika Auth: Jika sudah login tapi akses halaman /auth
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

// Konfigurasi Matcher tetap diekspor secara terpisah
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/katalog/:path*",
    "/auth",
  ],
}