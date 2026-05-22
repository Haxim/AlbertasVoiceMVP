import Link from "next/link";
import "./globals.css";

export const metadata = {
  title: "Alberta's Voice Referral MVP",
  description: "Consent-first referendum referral workflow for Alberta captains.",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-field text-ink antialiased">
        <header className="border-b border-line bg-white/90 shadow-sm shadow-sky/10">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <Link href="/" className="flex items-center gap-3 text-lg font-extrabold tracking-normal text-spruce">
              <img src="/icon.png" alt="" className="h-10 w-10 rounded-lg" />
              <span>Alberta&apos;s Voice</span>
            </Link>
            <div className="flex items-center gap-3 text-sm font-medium">
              <Link href="/leaderboard" className="hover:text-spruce">
                Leaderboard
              </Link>
              <Link href="/dashboard" className="rounded-md bg-spruce px-3 py-2 text-white shadow-sm shadow-sky/20 hover:bg-spruce/90">
                Captain
              </Link>
            </div>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
