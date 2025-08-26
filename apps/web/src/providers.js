"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { SessionContextProvider } from "@supabase/auth-helpers-react";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com",
        person_profiles: "identified_only",
        capture_pageview: false,
    });
}
export function Providers({ children }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60 * 1000,
            },
        },
    }));
    const [supabaseClient] = useState(() => createClientComponentClient());
    return (_jsx(QueryClientProvider, { client: queryClient, children: _jsx(SessionContextProvider, { supabaseClient: supabaseClient, children: _jsx(PostHogProvider, { client: posthog, children: children }) }) }));
}
//# sourceMappingURL=providers.js.map