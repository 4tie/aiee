import { useState } from "react";
import { Search, Book, Globe, Construction, Send, Loader2, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export default function Tools() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const tools = [
    {
      id: "web-search",
      name: "Web Search",
      description: "Search the internet for real-time information and answers.",
      icon: Globe,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      id: "docs",
      name: "Documentation",
      description: "Read and analyze technical documentation or project files.",
      icon: Book,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      id: "builder",
      name: "Builder",
      description: "Automated assistance for building and refactoring code.",
      icon: Construction,
      color: "text-green-500",
      bg: "bg-green-500/10",
    }
  ];

  const handleAction = (type: string) => {
    // This will be handled by the Assistant, we just provide the UI to trigger it
    console.log(`Triggering tool action: ${type}`);
  };

  return (
    <div className="flex-1 p-6 space-y-8 max-w-5xl mx-auto">
      <div className="space-y-2">
        <h1 className="text-3xl font-display font-bold text-white">System Tools</h1>
        <p className="text-muted-foreground text-lg">
          Advanced capabilities to help you research, learn, and build faster.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tools.map((tool) => (
          <div 
            key={tool.id}
            className="group relative p-6 rounded-2xl bg-card/50 border border-white/5 hover:border-primary/50 transition-all duration-300 hover-elevate"
          >
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110", tool.bg)}>
              <tool.icon className={cn("w-6 h-6", tool.color)} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{tool.name}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              {tool.description}
            </p>
            <Button 
              className="w-full bg-white/5 hover:bg-white/10 text-white border-white/10"
              onClick={() => handleAction(tool.id)}
            >
              Open Tool
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-12">
        <Tabs defaultValue="search" className="w-full">
          <TabsList className="bg-card/50 border border-white/5 p-1">
            <TabsTrigger value="search" className="data-[state=active]:bg-primary">Search</TabsTrigger>
            <TabsTrigger value="docs" className="data-[state=active]:bg-primary">Docs</TabsTrigger>
          </TabsList>
          
          <TabsContent value="search" className="mt-6">
            <div className="bg-card/50 border border-white/5 rounded-2xl p-6 space-y-4">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Ask anything... (e.g., 'How to use Drizzle with Postgres?')" 
                    className="pl-10 bg-black/20 border-white/10 h-12"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button className="h-12 px-8 shadow-lg shadow-primary/20" disabled={!searchQuery.trim()}>
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  Search
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {['Latest tech news', 'API documentation', 'Code examples', 'Market trends'].map((tag) => (
                  <button 
                    key={tag}
                    onClick={() => setSearchQuery(tag)}
                    className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-muted-foreground hover:text-white hover:bg-white/10 transition-all"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="docs" className="mt-6">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               {[
                 { name: 'React Documentation', url: 'https://react.dev' },
                 { name: 'Tailwind CSS', url: 'https://tailwindcss.com' },
                 { name: 'Lucide Icons', url: 'https://lucide.dev' },
                 { name: 'Replit Docs', url: 'https://docs.replit.com' }
               ].map((doc) => (
                 <a 
                   key={doc.name}
                   href={doc.url}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="flex items-center justify-between p-4 rounded-xl bg-card/50 border border-white/5 hover:border-primary/30 transition-all group"
                 >
                   <span className="text-white font-medium">{doc.name}</span>
                   <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                 </a>
               ))}
             </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}