import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import NotFound from "@/pages/not-found";
import { Sidebar } from "@/components/Sidebar";
import { cn } from "@/lib/utils";

import Home from "@/pages/Home";
import Connections from "@/pages/Connections";
import Projects from "@/pages/Projects";
import Dashboard from "@/pages/Dashboard";
import LandingPage from "@/pages/LandingPage";
import DownloadMusic from "@/pages/DownloadMusic";
import YouTube, { YouTubePlayer } from "@/pages/YouTube";
import Tools from "@/pages/Tools";

import Settings from "@/pages/Settings";

function Router() {
  const [location] = useLocation();
  const showSidebar = location !== "/";

  return (
    <div className="flex min-h-screen bg-background text-foreground overflow-hidden">
      {showSidebar && <Sidebar />}
      <main className={cn("flex-1 overflow-auto", showSidebar && "lg:pl-64")}>
        <Switch>
          <Route path="/" component={LandingPage} />
          <Route path="/chat" component={Home} />
          <Route path="/connections" component={Connections} />
          <Route path="/projects" component={Projects} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/download" component={DownloadMusic} />
          <Route path="/youtube" component={YouTube} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <YouTubePlayer />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
