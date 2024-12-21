const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn
};

console.log = function(...args) {
  originalConsole.log('🔍 LOGGED:', ...args);
};
console.error = function(...args) {
  originalConsole.error('❌ ERROR:', ...args);
};
console.warn = function(...args) {
  originalConsole.warn('⚠️ WARN:', ...args);
};

console.log('🎯 main.tsx loaded');
import { StrictMode } from "react";
console.log('🚀 Application starting...');
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import App from './App';
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster />
    </QueryClientProvider>
  </StrictMode>,
);
