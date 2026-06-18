import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Builds the absolute base URL used for post-auth redirects.
 *
 * Behind Vercel's proxy `requestUrl.origin` resolves to the internal host, which
 * does not match the domain registered in Supabase Auth. We therefore prefer an
 * explicit `NEXT_PUBLIC_SITE_URL` and fall back to the forwarded host in
 * production so the redirect lands on the public HTTPS domain.
 */
function getRedirectBase(request: NextRequest, origin: string): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) return siteUrl.replace(/\/$/, "");

  const isLocalEnv = process.env.NODE_ENV === "development";
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (!isLocalEnv && forwardedHost) {
    return `https://${forwardedHost}`;
  }
  return origin;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";
  const redirectBase = getRedirectBase(request, requestUrl.origin);

  if (!code) {
    return NextResponse.redirect(`${redirectBase}/login?error=no_code`);
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${redirectBase}/login?error=${encodeURIComponent(error.message)}`
    );
  }

  return NextResponse.redirect(`${redirectBase}${next}`);
}
