import { useState } from "react";
import { useLocation } from "wouter";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createTool } from "@/lib/api";
import type { ToolDefinition, ToolType, Parameter } from "@/lib/types";
import { Plus, X } from "lucide-react";

const parameterSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  description: z.string().optional(),
  required: z.boolean().default(false),
});

const webhookConfigSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
  url: z.string().url(),
  headers: z.record(z.string()),
  pathParameters: z.array(parameterSchema),
  queryParameters: z.array(parameterSchema),
  bodyParameters: z.array(parameterSchema),
});

const toolSchema = z.object({
  name: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/, {
    message: "Name must only contain letters, numbers, underscores, and hyphens",
  }),
  description: z.string().min(1),
  type: z.enum(['webhook', 'client'] as const),
  config: webhookConfigSchema,
});

type FormValues = z.infer<typeof toolSchema>;

export default function ToolConfig() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(toolSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "webhook",
      config: {
        method: "POST",
        url: "",
        headers: {},
        pathParameters: [],
        queryParameters: [],
        bodyParameters: [],
      },
    },
  });

  const { fields: pathFields, append: appendPath, remove: removePath } = form.useFieldArray({
    name: "config.pathParameters",
  });

  const { fields: queryFields, append: appendQuery, remove: removeQuery } = form.useFieldArray({
    name: "config.queryParameters",
  });

  const { fields: bodyFields, append: appendBody, remove: removeBody } = form.useFieldArray({
    name: "config.bodyParameters",
  });

  const [headers, setHeaders] = useState<{ key: string; value: string }[]>([]);

  function addHeader() {
    setHeaders([...headers, { key: "", value: "" }]);
  }

  function removeHeader(index: number) {
    const newHeaders = [...headers];
    newHeaders.splice(index, 1);
    setHeaders(newHeaders);
  }

  function updateHeader(index: number, field: "key" | "value", value: string) {
    const newHeaders = [...headers];
    newHeaders[index][field] = value;
    setHeaders(newHeaders);

    // Update form data
    const headerObj = headers.reduce((acc, { key, value }) => {
      if (key) acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
    form.setValue("config.headers", headerObj);
  }

  async function onSubmit(values: FormValues) {
    try {
      setIsSubmitting(true);
      const toolData: ToolDefinition = {
        ...values,
        input_schema: {
          type: "object",
          properties: {},
          required: [],
        },
      };

      // Build input schema from parameters
      const allParameters = [
        ...values.config.pathParameters,
        ...values.config.queryParameters,
        ...values.config.bodyParameters,
      ];

      toolData.input_schema.properties = allParameters.reduce((acc, param) => {
        acc[param.name] = {
          type: param.type,
          description: param.description,
        };
        return acc;
      }, {} as Record<string, { type: string; description?: string }>);

      toolData.input_schema.required = allParameters
        .filter(param => param.required)
        .map(param => param.name);

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
            Configure a new tool for Claude to use.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                {/* Basic Info */}
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
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tool Type</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex gap-4"
                        >
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <RadioGroupItem value="webhook" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Webhook
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <RadioGroupItem value="client" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Client
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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

              {/* Webhook Configuration */}
              {form.watch("type") === "webhook" && (
                <>
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Webhook Configuration</h3>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="config.method"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Method</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select method" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="GET">GET</SelectItem>
                                <SelectItem value="POST">POST</SelectItem>
                                <SelectItem value="PUT">PUT</SelectItem>
                                <SelectItem value="DELETE">DELETE</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="config.url"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>URL</FormLabel>
                            <FormControl>
                              <Input placeholder="https://api.example.com/v1/endpoint" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Headers */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <FormLabel>Headers</FormLabel>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addHeader}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Header
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {headers.map((header, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              placeholder="Header name"
                              value={header.key}
                              onChange={(e) => updateHeader(index, "key", e.target.value)}
                            />
                            <Input
                              placeholder="Header value"
                              value={header.value}
                              onChange={(e) => updateHeader(index, "value", e.target.value)}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeHeader(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Parameters */}
                    {[
                      { title: "Path Parameters", fields: pathFields, append: appendPath, remove: removePath },
                      { title: "Query Parameters", fields: queryFields, append: appendQuery, remove: removeQuery },
                      { title: "Body Parameters", fields: bodyFields, append: appendBody, remove: removeBody },
                    ].map((section) => (
                      <div key={section.title} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <FormLabel>{section.title}</FormLabel>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => section.append({ name: "", type: "string", description: "", required: false })}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Parameter
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {section.fields.map((field, index) => (
                            <div key={field.id} className="flex gap-2">
                              <Input
                                {...form.register(`${field.name}.name`)}
                                placeholder="Parameter name"
                              />
                              <Select
                                onValueChange={(value) => form.setValue(`${field.name}.type`, value)}
                                defaultValue="string"
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="string">String</SelectItem>
                                  <SelectItem value="number">Number</SelectItem>
                                  <SelectItem value="boolean">Boolean</SelectItem>
                                  <SelectItem value="array">Array</SelectItem>
                                  <SelectItem value="object">Object</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input
                                {...form.register(`${field.name}.description`)}
                                placeholder="Description"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => section.remove(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
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