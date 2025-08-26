import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Email Insight - Gmail Analytics & Subscription Management',
  description: 'Analyze your Gmail usage patterns and manage subscriptions with intelligent insights.',
  keywords: ['email', 'analytics', 'gmail', 'subscription', 'management'],
  authors: [{ name: 'Email Insight Team' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps): JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <div className="relative min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}