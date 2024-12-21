import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { createTool } from "@/lib/api";
import type { ToolDefinition } from "@/lib/types";

const toolSchema = z.object({
  name: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/, {
    message: "Name must only contain letters, numbers, underscores, and hyphens",
  }),
  description: z.string().min(1),
  input_schema: z.string().transform((str, ctx) => {
    try {
      const parsed = JSON.parse(str);
      if (typeof parsed !== 'object' || !parsed.type || parsed.type !== 'object') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Schema must be an object with type: 'object'",
        });
        return z.NEVER;
      }
      return parsed;
    } catch (e) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid JSON",
      });
      return z.NEVER;
    }
  }),
});

type FormValues = z.input<typeof toolSchema>;

export default function ToolConfig() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(toolSchema),
    defaultValues: {
      name: "",
      description: "",
      input_schema: JSON.stringify({
        type: "object",
        properties: {
          example: {
            type: "string",
            description: "An example property",
          },
        },
        required: ["example"],
      }, null, 2),
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      setIsSubmitting(true);
      const toolData: ToolDefinition = {
        name: values.name,
        description: values.description,
        input_schema: typeof values.input_schema === 'string' 
          ? JSON.parse(values.input_schema)
          : values.input_schema
      };
      await createTool(toolData);
      toast({
        title: "Success",
        description: "Tool created successfully",
      });
      navigate("/");
    } catch (error) {
      if (error instanceof Error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "An unknown error occurred",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-4xl font-black font-montserrat mb-8">Add New Tool</h1>

      <Card>
        <CardHeader>
          <CardTitle>Tool Configuration</CardTitle>
          <CardDescription>
            Configure a new tool for Claude to use. The tool name must be unique and the input schema must be valid JSON.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="get_weather" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Get the current weather for a given location"
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="input_schema"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Input Schema (JSON)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter JSON schema..."
                        className="font-mono min-h-[200px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button 
                type="submit" 
                className="w-full bg-[#8445ff] hover:bg-[#6a37cc]"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating..." : "Create Tool"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}