import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

  console.log("[AUTH CALLBACK] ===== START =====");
  console.log("[AUTH CALLBACK] Code present:", !!code);
  console.log("[AUTH CALLBACK] All cookies:", request.cookies.getAll().map(c => c.name));

  if (!code) {
    console.log("[AUTH CALLBACK] No code, redirecting to login");
    return NextResponse.redirect(`${requestUrl.origin}/login?error=no_code`);
  }

  const cookieStore = await cookies();
  console.log("[AUTH CALLBACK] CookieStore cookies:", cookieStore.getAll().map(c => c.name));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const all = cookieStore.getAll();
          console.log("[AUTH CALLBACK] getAll called, found:", all.length, "cookies:", all.map(c => c.name));
          return all;
        },
        setAll(cookiesToSet) {
          console.log("[AUTH CALLBACK] setAll called with:", cookiesToSet.map(c => c.name));
          cookiesToSet.forEach(({ name, value, options }) => {
            console.log("[AUTH CALLBACK] Setting cookie:", name, "options:", JSON.stringify(options));
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  console.log("[AUTH CALLBACK] Calling exchangeCodeForSession...");
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  console.log("[AUTH CALLBACK] exchangeCodeForSession result:", {
    error: error?.message || "none",
    hasUser: !!data?.user,
    hasSession: !!data?.session,
  });

  if (error) {
    console.log("[AUTH CALLBACK] Error, redirecting to login");
    return NextResponse.redirect(`${requestUrl.origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  // Verify session was actually stored
  const { data: { user } } = await supabase.auth.getUser();
  console.log("[AUTH CALLBACK] Post-exchange getUser:", user ? `User found: ${user.email}` : "NO USER!");

  if (!user) {
    console.log("[AUTH CALLBACK] No user after exchange! Cookies set:", cookieStore.getAll().map(c => c.name));
  }

  console.log("[AUTH CALLBACK] ===== SUCCESS, redirecting to", next, "=====");
  return NextResponse.redirect(`${requestUrl.origin}${next}`);
}
