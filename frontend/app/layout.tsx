import type { Metadata } from "next";
import { Syne, DM_Sans } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const syne = Syne({
    subsets: ["latin"],
    weight: ["400", "600", "700", "800"],
    variable: "--font-syne",
    display: "swap",
});

const dmSans = DM_Sans({
    subsets: ["latin"],
    weight: ["300", "400", "500"],
    style: ["normal", "italic"],
    variable: "--font-dm-sans",
    display: "swap",
});

export const metadata: Metadata = {
    title: {
        template: "%s | Aria Voice Agent",
        default: "Aria Voice Agent",
    },
    description: "AI-powered voice agent for intelligent lead qualification.",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html
            lang="en"
            className={`${syne.variable} ${dmSans.variable}`}
            suppressHydrationWarning
        >
            <body>
                <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>

                    {/* Nav */}
                    <nav
                        style={{
                            position: "sticky",
                            top: 0,
                            zIndex: 50,
                            borderBottom: "1px solid var(--border)",
                            backgroundColor: "rgba(9,9,15,0.85)",
                            backdropFilter: "blur(12px)",
                            WebkitBackdropFilter: "blur(12px)",
                        }}
                    >
                        <div
                            style={{
                                maxWidth: 1100,
                                margin: "0 auto",
                                padding: "0 24px",
                                height: 56,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                            }}
                        >
                            {/* Logo */}
                            <Link href="/agent" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
                                <div
                                    style={{
                                        width: 32, height: 32,
                                        borderRadius: 10,
                                        background: "linear-gradient(135deg, var(--brand), var(--brand-light))",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        color: "white", fontWeight: 800, fontSize: 15,
                                        fontFamily: "var(--font-display)",
                                    }}
                                >
                                    A
                                </div>
                                <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, letterSpacing: "-0.03em" }}>
                                    <span className="gradient-text">Aria</span>
                                    <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> Agent</span>
                                </span>
                            </Link>

                            {/* Nav links */}
                            <div style={{ display: "flex", gap: 4 }}>
                                {[
                                    { href: "/agent", label: "Voice Agent" },
                                    { href: "/dashboard", label: "Dashboard" },
                                ].map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        style={{
                                            padding: "6px 14px",
                                            borderRadius: 8,
                                            fontSize: 13,
                                            fontWeight: 500,
                                            color: "var(--text-muted)",
                                            textDecoration: "none",
                                            transition: "color 0.2s",
                                            fontFamily: "var(--font-body)",
                                        }}
                                    >
                                        {item.label}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </nav>

                    {/* Page content */}
                    <main style={{ flex: 1 }}>{children}</main>

                    {/* Footer */}
                    <footer
                        style={{
                            borderTop: "1px solid var(--border)",
                            padding: "12px 24px",
                            textAlign: "center",
                            fontSize: 12,
                            color: "var(--text-muted)",
                        }}
                    >
                        Aria Voice Agent · Powered by Groq LLaMA-3 · Free tier
                    </footer>
                </div>
            </body>
        </html>
    );
}