import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Mail, Shield, Zap } from 'lucide-react';

export default function HomePage(): JSX.Element {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            <span className="text-xl font-semibold">Email Insight</span>
          </div>
          <Button>Get Started</Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold text-balance mb-6">
              Gmail Analytics &{' '}
              <span className="text-primary">Subscription Management</span>
            </h1>
            <p className="text-xl text-muted-foreground text-balance mb-8 max-w-2xl mx-auto">
              Gain insights into your email patterns, identify subscriptions, 
              and take control of your inbox with intelligent analytics.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button size="lg" className="px-8">
                Connect Gmail
              </Button>
              <Button size="lg" variant="outline" className="px-8">
                Learn More
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Powerful Features</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to understand and optimize your email experience.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Email Analytics</CardTitle>
                <CardDescription>
                  Visualize your email patterns, response times, and contact relationships.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>• Volume trends over time</li>
                  <li>• Contact activity scoring</li>
                  <li>• Response time analysis</li>
                  <li>• Email classification</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Subscription Detection</CardTitle>
                <CardDescription>
                  Automatically identify and manage email subscriptions using ML algorithms.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>• AI-powered detection</li>
                  <li>• One-click unsubscribe</li>
                  <li>• Frequency analysis</li>
                  <li>• Category classification</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Privacy First</CardTitle>
                <CardDescription>
                  All data processing happens locally. Your emails never leave your control.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>• Local data storage</li>
                  <li>• Encrypted credentials</li>
                  <li>• No third-party sharing</li>
                  <li>• GDPR compliant</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Status Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-6">
              <Zap className="h-4 w-4" />
              Development in Progress
            </div>
            <h2 className="text-2xl font-bold mb-4">Phase 1: Foundation Complete</h2>
            <p className="text-muted-foreground mb-6">
              The foundation is ready! We've set up the core architecture with TypeScript, 
              Hono API server, Next.js frontend, and SQLite database. Ready for Gmail integration.
            </p>
            <div className="grid sm:grid-cols-2 gap-4 text-left">
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold text-green-600 mb-2">✅ Completed</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• TypeScript project setup</li>
                  <li>• Hono API server</li>
                  <li>• SQLite database with Drizzle ORM</li>
                  <li>• JWT authentication framework</li>
                  <li>• Health monitoring endpoints</li>
                </ul>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold text-blue-600 mb-2">🚧 Coming Next</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Google OAuth integration</li>
                  <li>• Gmail API sync engine</li>
                  <li>• Email analytics dashboard</li>
                  <li>• Subscription detection ML</li>
                  <li>• One-click unsubscribe</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2024 Email Insight. Built with Next.js, Hono, and TypeScript.</p>
        </div>
      </footer>
    </div>
  );
}