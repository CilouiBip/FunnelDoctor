import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FunnelDoctor - YouTube Funnel Analytics',
  description: 'Track leads from YouTube to sales, identify leaks, and close more deals',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
