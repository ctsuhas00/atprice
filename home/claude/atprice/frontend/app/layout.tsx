import type { Metadata } from 'next';
import '../styles/globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: {
    default: 'AtPrice — Compare Local Hardware Prices',
    template: '%s | AtPrice',
  },
  description: 'Discover and compare hardware & construction material prices from local sellers in Karnataka. Call or WhatsApp sellers directly.',
  keywords: ['hardware prices', 'local hardware', 'building materials', 'Karnataka hardware', 'compare prices'],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'AtPrice',
    title: 'AtPrice — Compare Local Hardware Prices',
    description: 'Compare hardware & construction material prices from local sellers. Find the best price near you.',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
