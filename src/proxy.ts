import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabasePublishableKey, supabaseUrl } from "@/lib/site";

// Refreshes the Supabase session cookie and keeps signed-out visitors out of /admin.
// Optimistic check only: admin pages still verify the role on the server.
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  // Server components can't see the path; auth.ts reads this to send users back after the 2-step check.
  request.headers.delete("x-admin-path");
  if (pathname.startsWith("/admin")) request.headers.set("x-admin-path", pathname + search);

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && pathname.startsWith("/admin") && pathname !== "/admin/login") {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/auth/:path*", "/account/:path*"],
};
