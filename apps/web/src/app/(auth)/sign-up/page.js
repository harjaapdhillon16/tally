"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
export default function SignUpPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);
    const supabase = createClientComponentClient();
    const router = useRouter();
    const handleSignUp = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setMessage(null);
        if (password !== confirmPassword) {
            setError("Passwords don't match");
            setIsLoading(false);
            return;
        }
        try {
            const { error, data } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/dashboard`,
                },
            });
            if (error) {
                setError(error.message);
            }
            else if (data.user && !data.user.email_confirmed_at) {
                setMessage("Check your email for a confirmation link");
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
    return (_jsxs("div", { className: "flex min-h-full flex-1 flex-col justify-center py-12 sm:px-6 lg:px-8", children: [_jsx("div", { className: "sm:mx-auto sm:w-full sm:max-w-md", children: _jsx("h2", { className: "mt-6 text-center text-2xl font-bold leading-9 tracking-tight", children: "Create your account" }) }), _jsx("div", { className: "mt-10 sm:mx-auto sm:w-full sm:max-w-[480px]", children: _jsxs("div", { className: "bg-card px-6 py-12 shadow sm:rounded-lg sm:px-12 border", children: [_jsxs("form", { className: "space-y-6", onSubmit: handleSignUp, children: [error && (_jsx("div", { className: "rounded-md bg-destructive/15 p-3", children: _jsx("p", { className: "text-sm text-destructive", children: error }) })), message && (_jsx("div", { className: "rounded-md bg-green-50 p-3", children: _jsx("p", { className: "text-sm text-green-800", children: message }) })), _jsxs("div", { children: [_jsx("label", { htmlFor: "email", className: "block text-sm font-medium leading-6", children: "Email address" }), _jsx("div", { className: "mt-2", children: _jsx(Input, { id: "email", name: "email", type: "email", autoComplete: "email", required: true, value: email, onChange: (e) => setEmail(e.target.value) }) })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "password", className: "block text-sm font-medium leading-6", children: "Password" }), _jsx("div", { className: "mt-2", children: _jsx(Input, { id: "password", name: "password", type: "password", autoComplete: "new-password", required: true, value: password, onChange: (e) => setPassword(e.target.value) }) })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "confirm-password", className: "block text-sm font-medium leading-6", children: "Confirm password" }), _jsx("div", { className: "mt-2", children: _jsx(Input, { id: "confirm-password", name: "confirm-password", type: "password", autoComplete: "new-password", required: true, value: confirmPassword, onChange: (e) => setConfirmPassword(e.target.value) }) })] }), _jsx("div", { children: _jsx(Button, { type: "submit", className: "w-full", disabled: isLoading, children: isLoading ? "Creating account..." : "Sign up" }) })] }), _jsx("div", { className: "mt-6", children: _jsxs("p", { className: "text-center text-sm text-muted-foreground", children: ["Already have an account?", " ", _jsx(Link, { href: "/sign-in", className: "font-semibold text-primary hover:underline", children: "Sign in" })] }) })] }) })] }));
}
//# sourceMappingURL=page.js.map