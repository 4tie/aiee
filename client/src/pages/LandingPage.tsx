import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Plus, Download, Folder, ArrowRight, Loader2, Sparkles, FileCode, MoreVertical, Pencil, Trash2, Copy, Key, ExternalLink } from "lucide-react";
import { useProjects, useCreateProject, useDeleteProject, useUpdateProject } from "@/hooks/use-projects";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: projects, isLoading } = useProjects();
  const createMutation = useCreateProject();
  const deleteMutation = useDeleteProject();
  const updateMutation = useUpdateProject();

  const [newProjectName, setNewProjectName] = useState("");
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isApiDialogOpen, setIsApiDialogOpen] = useState(false);
  const [projectToManage, setProjectToManage] = useState<any>(null);
  const [renameValue, setRenameValue] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isSavingApi, setIsSavingApi] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then(res => res.json())
      .then(data => {
        if (data.apiKey) setApiKey(data.apiKey);
      })
      .catch(err => console.error("Failed to load settings", err));
  }, []);

  const handleSaveApi = async () => {
    setIsSavingApi(true);
    try {
      // Get current settings first to preserve other values
      const res = await fetch("/api/settings");
      const currentSettings = await res.json();
      
      await apiRequest("POST", "/api/settings", {
        ...currentSettings,
        apiKey: apiKey.trim()
      });
      
      toast({
        title: "Success",
        description: "API key updated successfully",
      });
      setIsApiDialogOpen(false);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to save API key",
        variant: "destructive",
      });
    } finally {
      setIsSavingApi(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || createMutation.isPending) return;

    try {
      await createMutation.mutateAsync({
        name: newProjectName.trim(),
        path: `userdata/${newProjectName.toLowerCase().replace(/\s+/g, '-')}`,
        files: [
          {
            name: "main.py",
            content: "# Main strategy file\n\nclass Strategy:\n    pass",
            path: "/main.py",
            type: 'file'
          }
        ]
      });
      setNewProjectName("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleRename = async () => {
    if (!projectToManage || !renameValue.trim()) return;
    try {
      await updateMutation.mutateAsync({
        id: projectToManage.id,
        name: renameValue.trim()
      });
      setIsRenameDialogOpen(false);
      setProjectToManage(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDuplicate = async (project: any) => {
    try {
      const newName = `${project.name} (Copy)`;
      await createMutation.mutateAsync({
        name: newName,
        path: `userdata/${newName.toLowerCase().replace(/\s+/g, '-')}`,
        files: project.files,
        messages: project.messages,
        memory: project.memory
      });
    } catch (err) {
      console.error(err);
    }
  };

  const selectProject = (id: number) => {
    setLocation(`/chat?projectId=${id}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setIsApiDialogOpen(true)}
          className="text-muted-foreground hover:text-white"
        >
          <Key className="w-5 h-5" />
        </Button>
        <ThemeToggle />
      </div>
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-4">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-display font-bold text-white tracking-tight sm:text-5xl">
            Welcome to 4tiee.fd
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Your intelligent companion for 4tiee strategy development and management.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              variant="default"
              size="lg"
              className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 group h-12 px-8"
              onClick={() => window.open('https://replit.com/new/github/replit/freqai-template', '_blank')}
              data-testid="button-one-click-deploy"
            >
              <Sparkles className="w-5 h-5 mr-2 group-hover:animate-pulse" />
              One-Click Deploy to Replit
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-white/10 hover:bg-white/5 h-12 px-8"
              onClick={() => document.getElementById('projects-grid')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Get Started
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mt-12" id="projects-grid">
          {/* Create New Project */}
          <Card className="bg-card/50 border-white/5 backdrop-blur-sm hover:border-primary/20 transition-all group">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Plus className="w-5 h-5 text-primary" />
                New Project
              </CardTitle>
              <CardDescription>Start a fresh strategy from scratch</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <Input
                  placeholder="Project Name (e.g. MoonBot)"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="bg-background/50 border-white/10"
                />
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={!newProjectName.trim() || createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Create Project
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Existing Projects */}
          <Card className="bg-card/50 border-white/5 backdrop-blur-sm hover:border-primary/20 transition-all flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Folder className="w-5 h-5 text-primary" />
                Recent Projects
              </CardTitle>
              <CardDescription>Continue working on your strategies</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto max-h-[300px] space-y-2 scrollbar-hide">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : projects && projects.length > 0 ? (
                projects.map((project) => (
                  <div
                    key={project.id}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-primary/20 transition-all group/item"
                  >
                    <div 
                      className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                      onClick={() => selectProject(project.id)}
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <FileCode className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white group-hover/item:text-primary transition-colors truncate">
                          {project.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {project.path}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white opacity-0 group-hover/item:opacity-100 transition-opacity">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setProjectToManage(project);
                            setRenameValue(project.name);
                            setIsRenameDialogOpen(true);
                          }}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(project)}>
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => deleteMutation.mutate(project.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover/item:translate-x-1 transition-all flex-shrink-0" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 space-y-2">
                  <Folder className="w-12 h-12 text-muted-foreground mx-auto opacity-20" />
                  <p className="text-sm text-muted-foreground">No projects yet</p>
                </div>
              )}
            </CardContent>
            <div className="p-6 pt-0 mt-auto">
              <Button variant="outline" className="w-full border-white/10 hover:bg-white/5">
                <Download className="w-4 h-4 mr-2" />
                Import Strategy
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input 
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Project Name"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsRenameDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRename} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isApiDialogOpen} onOpenChange={setIsApiDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Configuration</DialogTitle>
            <DialogDescription>
              Configure your OpenRouter API key. This will be stored in userdata/settings.json.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">OpenRouter API Key</label>
              <Input 
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-or-v1-..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsApiDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveApi} disabled={isSavingApi}>
              {isSavingApi && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
