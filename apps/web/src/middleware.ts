import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareSupabaseClient } from "@/lib/supabase";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareSupabaseClient(req, res);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const isAuthPage = req.nextUrl.pathname.startsWith("/sign-in") || 
                     req.nextUrl.pathname.startsWith("/sign-up") ||
                     req.nextUrl.pathname.startsWith("/reset-password");
  
  const isOnboardingPage = req.nextUrl.pathname.startsWith("/onboarding");
  
  // Guard all /(app)/** paths by default
  const isAppPage = req.nextUrl.pathname.startsWith("/dashboard") ||
                    req.nextUrl.pathname.startsWith("/transactions") ||
                    req.nextUrl.pathname.startsWith("/reports") ||
                    req.nextUrl.pathname.startsWith("/settings") ||
                    req.nextUrl.pathname.startsWith("/connections") ||
                    req.nextUrl.pathname.startsWith("/exports") ||
                    isOnboardingPage;

  // Redirect unauthenticated users to sign-in for app pages
  if (!session && isAppPage) {
    const redirectUrl = new URL("/sign-in", req.url);
    return NextResponse.redirect(redirectUrl);
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
      const redirectUrl = new URL("/dashboard", req.url);
      return NextResponse.redirect(redirectUrl);
    } else {
      const redirectUrl = new URL("/onboarding", req.url);
      return NextResponse.redirect(redirectUrl);
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
      const redirectUrl = new URL("/onboarding", req.url);
      return NextResponse.redirect(redirectUrl);
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
      const redirectUrl = new URL("/dashboard", req.url);
      return NextResponse.redirect(redirectUrl);
    } else {
      const redirectUrl = new URL("/onboarding", req.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  if (req.nextUrl.pathname === "/" && !session) {
    const redirectUrl = new URL("/sign-in", req.url);
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};