"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { useEffect } from "react";
export default function GlobalError({ error }) {
    useEffect(() => {
        Sentry.captureException(error);
    }, [error]);
    return (_jsx("html", { children: _jsx("body", { children: _jsx(NextError, { statusCode: 0 }) }) }));
}
//# sourceMappingURL=global-error.js.map