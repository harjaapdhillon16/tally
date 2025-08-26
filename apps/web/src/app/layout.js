import { jsx as _jsx } from "react/jsx-runtime";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers";
const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});
const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});
export const metadata = {
    title: "Nexus - AI Financial Automation",
    description: "AI-powered financial automation platform for SMBs",
};
export default function RootLayout({ children, }) {
    return (_jsx("html", { lang: "en", children: _jsx("body", { className: `${geistSans.variable} ${geistMono.variable} antialiased font-sans`, children: _jsx(Providers, { children: children }) }) }));
}
//# sourceMappingURL=layout.js.map