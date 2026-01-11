import { Link, useLocation } from "wouter";
import { useSyncState } from "@/hooks/use-sync-state";
import { Bot, LineChart, Server, FileCode, Menu, X, Sun, Moon, Music, Search, Wrench, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { FeedbackButtons } from "./FeedbackButtons";
import { ThemeToggle } from "./ThemeToggle";

export function Sidebar() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useSyncState("sidebar_open", false);

  const links = [
    { href: "/chat", label: "4tiee.fd Assistant", icon: Bot },
    { href: "/youtube", label: "YouTube", icon: Search },
    { href: "/projects", label: "Projects", icon: FileCode },
    { href: "/connections", label: "Connections", icon: Server },
    { href: "/dashboard", label: "Dashboard", icon: LineChart },
    { href: "/download", label: "Download Music", icon: Music },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <>
      {/* Mobile Toggle */}
      <button 
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 active-elevate-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar Container */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-[280px] sm:w-64 bg-card/95 backdrop-blur-xl border-r border-white/10 transform transition-transform duration-300 ease-in-out lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col p-4 sm:p-6">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8 sm:mb-10 mt-12 lg:mt-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/25">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-display font-bold text-white tracking-tight">
              4tiee.fd
            </h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = location === link.href;
              return (
                <Link key={link.href} href={link.href}>
                  <div className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer group",
                    isActive 
                      ? "bg-primary text-white shadow-lg shadow-primary/20" 
                      : "text-muted-foreground hover:bg-white/5 hover:text-white"
                  )}>
                    <Icon className={cn(
                      "w-5 h-5 transition-transform group-hover:scale-110",
                      isActive ? "text-white" : "text-muted-foreground group-hover:text-white"
                    )} />
                    <span className="font-medium">{link.label}</span>
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* User/Status Footer (Optional) */}
          <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-muted-foreground font-mono">System Online</span>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
