"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
export default function SignInPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const supabase = createClientComponentClient();
    const router = useRouter();
    const handleSignIn = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) {
                setError(error.message);
            }
            else {
                router.push("/dashboard");
                router.refresh();
            }
        }
        catch {
            setError("An unexpected error occurred");
        }
        finally {
            setIsLoading(false);
        }
    };
    return (_jsxs("div", { className: "flex min-h-full flex-1 flex-col justify-center py-12 sm:px-6 lg:px-8", children: [_jsx("div", { className: "sm:mx-auto sm:w-full sm:max-w-md", children: _jsx("h2", { className: "mt-6 text-center text-2xl font-bold leading-9 tracking-tight", children: "Sign in to your account" }) }), _jsx("div", { className: "mt-10 sm:mx-auto sm:w-full sm:max-w-[480px]", children: _jsxs("div", { className: "bg-card px-6 py-12 shadow sm:rounded-lg sm:px-12 border", children: [_jsxs("form", { className: "space-y-6", onSubmit: handleSignIn, children: [error && (_jsx("div", { className: "rounded-md bg-destructive/15 p-3", children: _jsx("p", { className: "text-sm text-destructive", children: error }) })), _jsxs("div", { children: [_jsx("label", { htmlFor: "email", className: "block text-sm font-medium leading-6", children: "Email address" }), _jsx("div", { className: "mt-2", children: _jsx(Input, { id: "email", name: "email", type: "email", autoComplete: "email", required: true, value: email, onChange: (e) => setEmail(e.target.value) }) })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "password", className: "block text-sm font-medium leading-6", children: "Password" }), _jsx("div", { className: "mt-2", children: _jsx(Input, { id: "password", name: "password", type: "password", autoComplete: "current-password", required: true, value: password, onChange: (e) => setPassword(e.target.value) }) })] }), _jsx("div", { children: _jsx(Button, { type: "submit", className: "w-full", disabled: isLoading, children: isLoading ? "Signing in..." : "Sign in" }) })] }), _jsx("div", { className: "mt-6", children: _jsxs("p", { className: "text-center text-sm text-muted-foreground", children: ["Don't have an account?", " ", _jsx(Link, { href: "/sign-up", className: "font-semibold text-primary hover:underline", children: "Sign up" })] }) })] }) })] }));
}
//# sourceMappingURL=page.js.map