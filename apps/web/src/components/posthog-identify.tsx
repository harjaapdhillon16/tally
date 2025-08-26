"use client";

import { useEffect } from "react";
import { usePostHog } from "posthog-js/react";
import { createClient } from "@/lib/supabase";

export function PostHogIdentify() {
  const posthog = usePostHog();
  const supabase = createClient();

  useEffect(() => {
    const identifyUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user && posthog) {
          // Get current org from cookie
          const cookies = document.cookie.split(';');
          const orgCookie = cookies.find(cookie => cookie.trim().startsWith('orgId='));
          const currentOrgId = orgCookie ? orgCookie.split('=')[1] : null;

          // Identify user with PostHog
          posthog.identify(user.id, {
            email: user.email,
            orgId: currentOrgId,
          });

          // Set user properties
          posthog.setPersonProperties({
            email: user.email,
            currentOrgId: currentOrgId,
          });
        }
      } catch (error) {
        console.error("Error identifying user with PostHog:", error);
      }
    };

    identifyUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session?.user && posthog) {
          // Get current org from cookie on sign in
          const cookies = document.cookie.split(';');
          const orgCookie = cookies.find(cookie => cookie.trim().startsWith('orgId='));
          const currentOrgId = orgCookie ? orgCookie.split('=')[1] : null;

          posthog.identify(session.user.id, {
            email: session.user.email,
            orgId: currentOrgId,
          });
        } else if (event === 'SIGNED_OUT' && posthog) {
          posthog.reset();
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [posthog, supabase.auth]);

  // This component doesn't render anything
  return null;
}