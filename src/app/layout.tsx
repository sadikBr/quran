import type { Metadata } from "next";
import { Fira_Code, Merriweather, Oxanium } from "next/font/google";
import "./globals.css";

const oxanium = Oxanium({
    variable: "--font-sans",
    subsets: ["latin"],
});

const firaCode = Fira_Code({
    variable: "--font-mono",
    subsets: ["latin"],
});

const merriweather = Merriweather({
    variable: "--font-serif",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Read Quran & Track Your Memorization",
    description: "App to read Quran and track your memorization",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="dark">
            <body
                className={`${oxanium.variable} ${firaCode.variable} ${merriweather.variable} antialiased`}
            >
                {children}
            </body>
        </html>
    );
}
