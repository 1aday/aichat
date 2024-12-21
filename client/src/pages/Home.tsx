import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { listTools } from "@/lib/api";
import { useEffect } from "react";

export default function Home() {
  const queryClient = useQueryClient();

  const { data: tools = [], isLoading } = useQuery({
    queryKey: ['/api/tools'],
    queryFn: listTools,
  });

  // Setup default tools when the page loads
  useEffect(() => {
    fetch('/api/setup-default-tools')
      .then(res => res.json())
      .then(() => {
        // Invalidate tools query to reload the list
        queryClient.invalidateQueries({ queryKey: ['/api/tools'] });
      })
      .catch(console.error);
  }, [queryClient]);

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-black font-montserrat">Tool Manager</h1>
          <p className="text-gray-600 mt-2">Configure and manage tools for Claude</p>
        </div>
      </div>

      {/* Tools Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Available Tools</h2>
          <Link href="/tools/new">
            <Button className="bg-[#8445ff] hover:bg-[#6a37cc]">
              <Plus className="mr-2 h-4 w-4" />
              Add Tool
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-20 bg-gray-100 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tools.length === 0 ? (
              <Card className="col-span-full">
                <CardHeader>
                  <CardTitle>No Tools Configured</CardTitle>
                  <CardDescription>
                    Get started by adding your first tool using the "Add Tool" button above.
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : (
              tools.map((tool) => (
                <Card key={tool.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle>{tool.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {tool.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-[#e9dff0] rounded-lg p-4">
                      <pre className="text-sm overflow-x-auto">
                        {JSON.stringify(tool.inputSchema, null, 2)}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}