import { Switch, Route } from "wouter";
import Home from "@/pages/Home";
import ToolConfig from "@/pages/ToolConfig";
import ChatHome from "@/pages/ChatHome";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Wrench, MessageSquare } from "lucide-react";
import { Link, useLocation } from "wouter";

function App() {
  const [location] = useLocation();

  return (
    <div className="min-h-screen">
      <nav className="border-b border-gray-200/50 dark:border-gray-800/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-gray-100">
                AI Assistant
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/" className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                location === "/" ? "bg-primary/10 text-primary" : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-50"
              }`}>
                <MessageSquare className="h-4 w-4" />
                <span>Chat</span>
              </Link>
              <Link href="/tools" className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                location === "/tools" ? "bg-primary/10 text-primary" : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-50"
              }`}>
                <Wrench className="h-4 w-4" />
                <span>Tools</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="min-h-[calc(100vh-4rem)]">
        <Switch>
          <Route path="/" component={ChatHome} />
          <Route path="/tools" component={Home} />
          <Route path="/tools/new" component={ToolConfig} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">404 Page Not Found</h1>
          </div>
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            The requested page could not be found.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default App;