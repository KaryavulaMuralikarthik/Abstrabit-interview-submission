import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/Components/Layout/Navbar";
import { createClient } from "@/lib/server/supabseServer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bookmark Manager - Murali",
  description:
    "My Project made for submission to ____ as part of their interview process.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} italic ${geistMono.variable} antialiased`}
      >
        {user && <Navbar/>}
        <div className={`${user ? 'mt-20':'mt-0'}`}>
          {children}
        </div>
      </body>
    </html>
  );
}
