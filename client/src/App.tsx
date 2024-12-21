import { Switch, Route } from "wouter";
import Home from "@/pages/Home";
import ToolConfig from "@/pages/ToolConfig";
import Chat from "@/pages/Chat";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Wrench, MessageSquare } from "lucide-react";
import { Link, useLocation } from "wouter";

function App() {
  const [location] = useLocation();

  return (
    <div className="min-h-screen">
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[98%] w-full mx-auto px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <h1 className="text-2xl font-black font-montserrat text-[#8445ff]">
                Claude Tool Manager
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/" className={`flex items-center space-x-1 px-3 py-2 rounded-md ${
                location === "/" ? "bg-[#e9dff0]" : "hover:bg-gray-100"
              }`}>
                <Wrench className="h-4 w-4" />
                <span>Tools</span>
              </Link>
              <Link href="/chat" className={`flex items-center space-x-1 px-3 py-2 rounded-md ${
                location === "/chat" ? "bg-[#e9dff0]" : "hover:bg-gray-100"
              }`}>
                <MessageSquare className="h-4 w-4" />
                <span>Chat</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="min-h-[calc(100vh-4rem)] bg-gray-50">
        <div className="max-w-[98%] w-full mx-auto">
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/tools/new" component={ToolConfig} />
            <Route path="/chat" component={Chat} />
            <Route component={NotFound} />
          </Switch>
        </div>
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
            <h1 className="text-2xl font-bold text-gray-900">404 Page Not Found</h1>
          </div>
          <p className="mt-4 text-sm text-gray-600">
            The requested page could not be found.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default App;