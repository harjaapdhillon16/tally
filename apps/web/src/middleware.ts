import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareSupabaseClient } from "@/lib/supabase";

/**
 * Helper function to create a redirect response while preserving cookies from the original response
 */
function createRedirectWithCookies(url: string, req: NextRequest, originalRes: NextResponse) {
  const redirectRes = NextResponse.redirect(new URL(url, req.url));
  
  // Copy cookies from the original response to the redirect response
  const cookies = originalRes.cookies.getAll();
  cookies.forEach(cookie => {
    redirectRes.cookies.set(cookie.name, cookie.value, cookie);
  });
  
  return redirectRes;
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareSupabaseClient(req, res);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  
  const session = user ? { user } : null;

  const isAuthPage = req.nextUrl.pathname.startsWith("/sign-in") || 
                     req.nextUrl.pathname.startsWith("/sign-up") ||
                     req.nextUrl.pathname.startsWith("/reset-password");
  
  const isOnboardingPage = req.nextUrl.pathname.startsWith("/onboarding");
  
  // Guard all /(app)/** paths by default
  const isAppPage = req.nextUrl.pathname.startsWith("/dashboard") ||
                    req.nextUrl.pathname.startsWith("/transactions") ||
                    req.nextUrl.pathname.startsWith("/reports") ||
                    req.nextUrl.pathname.startsWith("/settings") ||
                    req.nextUrl.pathname.startsWith("/exports") ||
                    isOnboardingPage;

  // Redirect unauthenticated users to sign-in for app pages
  if (!session && isAppPage) {
    return createRedirectWithCookies("/sign-in", req, res);
  }

  // Redirect authenticated users away from auth pages
  if (session && isAuthPage) {
    // Check if user has an org before redirecting to dashboard
    const { data: userOrgRoles } = await supabase
      .from("user_org_roles")
      .select("org_id")
      .eq("user_id", session.user.id)
      .limit(1);
    
    if (userOrgRoles && userOrgRoles.length > 0) {
      return createRedirectWithCookies("/dashboard", req, res);
    } else {
      return createRedirectWithCookies("/onboarding", req, res);
    }
  }

  // For authenticated users accessing app pages (excluding onboarding), 
  // check if they have an org membership
  if (session && isAppPage && !isOnboardingPage) {
    const { data: userOrgRoles } = await supabase
      .from("user_org_roles")
      .select("org_id")
      .eq("user_id", session.user.id)
      .limit(1);
    
    if (!userOrgRoles || userOrgRoles.length === 0) {
      return createRedirectWithCookies("/onboarding", req, res);
    }
  }

  // Handle root path redirects
  if (req.nextUrl.pathname === "/" && session) {
    // Check if user has an org before redirecting to dashboard
    const { data: userOrgRoles } = await supabase
      .from("user_org_roles")
      .select("org_id")
      .eq("user_id", session.user.id)
      .limit(1);
    
    if (userOrgRoles && userOrgRoles.length > 0) {
      return createRedirectWithCookies("/dashboard", req, res);
    } else {
      return createRedirectWithCookies("/onboarding", req, res);
    }
  }

  if (req.nextUrl.pathname === "/" && !session) {
    return createRedirectWithCookies("/sign-in", req, res);
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};