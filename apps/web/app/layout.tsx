import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Quest Board',
  description: 'Find — or forge — an achievable adventure suited to your time, budget, and surroundings.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#14110f',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-body min-h-screen">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2">
          Skip to content
        </a>
        <nav aria-label="Primary" className="border-b border-border bg-surface px-6 py-3">
          <div className="mx-auto flex max-w-3xl gap-4 text-sm">
            <Link href="/" className="focus-ring text-text hover:text-accent">
              Home
            </Link>
            <Link href="/discover" className="focus-ring text-text hover:text-accent">
              The Realm
            </Link>
            <Link href="/forge" className="focus-ring text-text hover:text-accent">
              The Forge
            </Link>
            <Link href="/hearth" className="focus-ring text-text hover:text-accent">
              The Hearth
            </Link>
            <Link href="/my-quests" className="focus-ring text-text hover:text-accent">
              My Quests
            </Link>
            <Link href="/profile" className="focus-ring text-text hover:text-accent">
              Chronicle
            </Link>
            <Link href="/offline" className="focus-ring text-text hover:text-accent">
              Offline
            </Link>
            <Link href="/login" className="focus-ring ml-auto text-text hover:text-accent">
              Log in
            </Link>
          </div>
        </nav>
        <div id="main">{children}</div>
      </body>
    </html>
  );
}
