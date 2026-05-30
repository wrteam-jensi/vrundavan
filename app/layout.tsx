import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Vrundavan Farmhouse',
  description: 'Vrundavan Farmhouse - established 2010, a calm farmhouse retreat.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
