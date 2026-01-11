import { useState, useMemo, useEffect, useRef } from "react";
import { Plus, Save, Loader2, FileCode, Check, Folder, ChevronRight, ChevronDown, File, MoreVertical, Pencil, Trash2, Search, X, Share2, Terminal as TerminalIcon, Star } from "lucide-react";
import { useProjects, useCreateProject, useUpdateProject } from "@/hooks/use-projects";
import { Badge } from "@/components/ui/badge";
import Editor from "react-simple-code-editor";
import { highlight, languages } from "prismjs";
import "prismjs/components/prism-python";
import "prismjs/themes/prism-tomorrow.css";
import { cn } from "@/lib/utils";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ProjectFile {
  name: string;
  content?: string;
  path: string;
  type: 'file' | 'folder';
  children?: ProjectFile[];
}

export default function Projects() {
  const { data: projects, isLoading } = useProjects();
  const createMutation = useCreateProject();
  const updateMutation = useUpdateProject();
  
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [projectName, setProjectName] = useState("");
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddFileDialogOpen, setIsAddFileDialogOpen] = useState(false);
  const [isAddFolderDialogOpen, setIsAddFolderDialogOpen] = useState(false);
  const [itemToManage, setItemToManage] = useState<ProjectFile | null>(null);
  const [newName, setNewName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showTerminal, setShowTerminal] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);

  const selectedProject = projects?.find(p => p.id === selectedProjectId);

  useEffect(() => {
    if (showTerminal && terminalRef.current && !xtermRef.current) {
      const term = new Terminal({
        theme: {
          background: '#1e1e1e',
          foreground: '#d4d4d4',
          cursor: '#ffffff',
          selectionBackground: 'rgba(255, 255, 255, 0.3)',
        },
        fontSize: 13,
        fontFamily: '"JetBrains Mono", monospace',
        cursorBlink: true,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(terminalRef.current);
      fitAddon.fit();

      term.writeln('\x1b[1;32m4tiee.fd Terminal\x1b[0m');
      term.writeln('Welcome to the strategy development environment.');
      const projectPath = selectedProject?.path || 'unknown';
      term.write(`\n\x1b[1;34m${projectPath} $ \x1b[0m`);

      let currentLine = '';
      let commandHistory: string[] = [];
      let historyIndex = -1;

      term.onData(e => {
        switch (e) {
          case '\r':
            term.writeln('');
            if (currentLine.trim()) {
              term.writeln(`Executing in ${projectPath}: ${currentLine}`);
              commandHistory.push(currentLine);
              historyIndex = commandHistory.length;
            }
            term.write(`\x1b[1;34m${projectPath} $ \x1b[0m`);
            currentLine = '';
            break;
          case '\u007F':
            if (currentLine.length > 0) {
              currentLine = currentLine.slice(0, -1);
              term.write('\b \b');
            }
            break;
          case '\t':
            if (currentLine.trim()) {
              const suggestions = ['python', 'freqtrade', 'backtest', 'list', 'strategy'];
              const match = suggestions.find(s => s.startsWith(currentLine.toLowerCase()));
              if (match) {
                const remainder = match.slice(currentLine.length);
                currentLine = match;
                term.write(remainder);
              }
            }
            break;
          case '\u001b[A':
            if (historyIndex > 0) {
              historyIndex--;
              term.write('\b \b'.repeat(currentLine.length));
              currentLine = commandHistory[historyIndex];
              term.write(currentLine);
            }
            break;
          case '\u001b[B':
            if (historyIndex < commandHistory.length - 1) {
              historyIndex++;
              term.write('\b \b'.repeat(currentLine.length));
              currentLine = commandHistory[historyIndex];
              term.write(currentLine);
            } else if (historyIndex === commandHistory.length - 1) {
              historyIndex++;
              term.write('\b \b'.repeat(currentLine.length));
              currentLine = '';
            }
            break;
          default:
            if (e >= ' ' && e <= '~') {
              currentLine += e;
              term.write(e);
            }
        }
      });

      xtermRef.current = term;

      const handleResize = () => fitAddon.fit();
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        term.dispose();
        xtermRef.current = null;
      };
    }
  }, [showTerminal, selectedProject?.path]);

  const handleAddFile = () => {
    if (!selectedProjectId || !newName.trim()) return;
    const newFile: ProjectFile = { name: newName.trim(), content: "", path: `/${newName.trim()}`, type: 'file' };
    const currentFiles = (selectedProject?.files || []) as ProjectFile[];
    updateMutation.mutate({ id: selectedProjectId, files: [...currentFiles, newFile] });
    setIsAddFileDialogOpen(false);
    setNewName("");
  };

  const handleAddFolder = () => {
    if (!selectedProjectId || !newName.trim()) return;
    const newFolder: ProjectFile = { name: newName.trim(), path: `/${newName.trim()}`, type: 'folder', children: [] };
    const currentFiles = (selectedProject?.files || []) as ProjectFile[];
    updateMutation.mutate({ id: selectedProjectId, files: [...currentFiles, newFolder] });
    setIsAddFolderDialogOpen(false);
    setNewName("");
  };

  useEffect(() => {
    if (selectedProject) {
      setProjectName(selectedProject.name);
      const projectFiles = (selectedProject.files || []) as ProjectFile[];
      if (!activeFilePath && projectFiles.length > 0) {
        const findFirstFile = (files: ProjectFile[]): string | null => {
          for (const f of files) {
            if (f.type === 'file') return f.path;
            if (f.children) {
              const childPath = findFirstFile(f.children);
              if (childPath) return childPath;
            }
          }
          return null;
        };
        const firstFile = findFirstFile(projectFiles);
        if (firstFile) setActiveFilePath(firstFile);
      }
    } else if (projects && projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [selectedProjectId, selectedProject, projects, activeFilePath]);

  useEffect(() => {
    if (selectedProject && activeFilePath) {
      const findFile = (files: ProjectFile[]): ProjectFile | null => {
        for (const f of files) {
          if (f.path === activeFilePath) return f;
          if (f.children) {
            const found = findFile(f.children);
            if (found) return found;
          }
        }
        return null;
      };
      const file = findFile((selectedProject.files || []) as ProjectFile[]);
      if (file) setCode(file.content || "");
    }
  }, [activeFilePath, selectedProject]);

  const handleSave = () => {
    if (!selectedProjectId || !activeFilePath) return;
    const updateFiles = (files: ProjectFile[]): ProjectFile[] => {
      return files.map(f => {
        if (f.path === activeFilePath) return { ...f, content: code };
        if (f.children) return { ...f, children: updateFiles(f.children) };
        return f;
      });
    };
    const currentFiles = (selectedProject?.files || []) as ProjectFile[];
    updateMutation.mutate({ id: selectedProjectId, files: updateFiles(currentFiles), name: projectName });
    setIsEditingProjectName(false);
  };

  const toggleFolder = (path: string) => {
    const next = new Set(expandedFolders);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setExpandedFolders(next);
  };

  const handleRename = () => {
    if (!selectedProjectId || !itemToManage || !newName.trim()) return;
    const renameInTree = (files: ProjectFile[]): ProjectFile[] => {
      return files.map(f => {
        if (f.path === itemToManage.path) {
          const oldPath = f.path;
          const newPath = oldPath.substring(0, oldPath.lastIndexOf('/') + 1) + newName.trim();
          return { ...f, name: newName.trim(), path: newPath };
        }
        if (f.children) return { ...f, children: renameInTree(f.children) };
        return f;
      });
    };
    const newFiles = renameInTree((selectedProject?.files || []) as ProjectFile[]);
    updateMutation.mutate({ id: selectedProjectId, files: newFiles });
    setIsRenameDialogOpen(false);
    setItemToManage(null);
  };

  const handleDelete = () => {
    if (!selectedProjectId || !itemToManage) return;
    const deleteFromTree = (files: ProjectFile[]): ProjectFile[] => {
      return files.filter(f => f.path !== itemToManage.path).map(f => {
        if (f.children) return { ...f, children: deleteFromTree(f.children) };
        return f;
      });
    };
    const newFiles = deleteFromTree((selectedProject?.files || []) as ProjectFile[]);
    updateMutation.mutate({ id: selectedProjectId, files: newFiles });
    if (activeFilePath === itemToManage.path) setActiveFilePath(null);
    setIsDeleteDialogOpen(false);
    setItemToManage(null);
  };

  const renderFileTree = (files: ProjectFile[]) => {
    const filteredFiles = files.filter(f => f.name !== '.ai');
    const searchFilteredFiles = searchQuery.trim() === "" 
      ? filteredFiles 
      : filteredFiles.filter(file => {
          const matches = (f: ProjectFile): boolean => {
            if (f.name.toLowerCase().includes(searchQuery.toLowerCase())) return true;
            if (f.children) return f.children.some(matches);
            return false;
          };
          return matches(file);
        });

    return (
      <div className="space-y-1">
        {searchFilteredFiles.map((file) => (
          <div key={file.path} className="group relative">
            <div 
              onClick={() => file.type === 'folder' ? toggleFolder(file.path) : setActiveFilePath(file.path)}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors text-sm pr-8",
                activeFilePath === file.path ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-white/5 hover:text-white"
              )}
            >
              {file.type === 'folder' ? (
                <>
                  {expandedFolders.has(file.path) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <Folder className="w-4 h-4 text-blue-400" />
                </>
              ) : (
                <>
                  <div className="w-4" />
                  <File className="w-4 h-4 text-muted-foreground" />
                </>
              )}
              <span className="truncate">{file.name}</span>
              <div className="absolute right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 hover:bg-white/10 rounded-md">
                      <MoreVertical className="w-3 h-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-32">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setItemToManage(file); setNewName(file.name); setIsRenameDialogOpen(true); }}>
                      <Pencil className="w-4 h-4 mr-2" /> Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setItemToManage(file); setIsDeleteDialogOpen(true); }} className="text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            {file.type === 'folder' && expandedFolders.has(file.path) && file.children && (
              <div className="ml-4 border-l border-border pl-2 mt-1">
                {renderFileTree(file.children)}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex-1 flex h-screen overflow-hidden">
      <div className="w-80 bg-card/30 border-r border-border flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg text-foreground truncate max-w-[180px]" title={selectedProject?.name || "Projects"}>
              {selectedProject?.name || "Projects"}
            </h2>
            <div className="flex items-center gap-1">
              {selectedProjectId && (
                <>
                  <button onClick={() => { setNewName(""); setIsAddFileDialogOpen(true); }} className="p-1.5 hover:bg-primary/20 hover:text-primary rounded-lg text-foreground"><Plus className="w-5 h-5" /></button>
                  <button onClick={() => { setNewName(""); setIsAddFolderDialogOpen(true); }} className="p-1.5 hover:bg-primary/20 hover:text-primary rounded-lg text-foreground"><Folder className="w-5 h-5" /></button>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="Search files..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-foreground/5 border border-border rounded-lg py-2 pl-9 pr-3 text-sm focus:outline-none" />
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {selectedProject ? (
              <>
                {renderFileTree((selectedProject.files || []) as ProjectFile[])}
                {selectedProject.musicPreferences && (selectedProject.musicPreferences as any).analysis && (
                  <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/10 space-y-3">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-primary">
                      <Star className="w-3 h-3 fill-current" /> <span>Music Taste</span>
                    </div>
                    <p className="text-xs text-muted-foreground italic leading-relaxed">"{(selectedProject.musicPreferences as any).analysis}"</p>
                  </div>
                )}
              </>
            ) : ( <p className="text-xs text-muted-foreground italic">No project selected</p> )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-[#1e1e1e]">
        {selectedProjectId ? (
          <>
            <div className="h-14 border-b border-white/10 bg-card/50 flex items-center justify-between px-6">
              <div className="flex items-center gap-4">
                {isEditingProjectName ? (
                  <div className="flex items-center gap-2">
                    <input value={projectName} onChange={(e) => setProjectName(e.target.value)} className="bg-background border border-border rounded px-2 py-1 text-foreground" autoFocus />
                    <button onClick={() => setIsEditingProjectName(false)} className="p-1 hover:text-green-500"><Check className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <h1 onClick={() => setIsEditingProjectName(true)} className="text-lg font-display font-bold text-foreground cursor-pointer">{projectName}</h1>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => window.open('https://replit.com/new/github/replit/freqai-template', '_blank')}><Share2 className="w-3.5 h-3.5 mr-2" /> Deploy Strategy</Button>
                <button onClick={handleSave} disabled={updateMutation.isPending || !activeFilePath} className="p-2 hover:bg-primary/20 rounded-lg text-primary disabled:opacity-50"><Save className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden relative">
              {activeFilePath ? (
                <Editor value={code} onValueChange={code => setCode(code)} highlight={code => highlight(code, languages.python, "python")} padding={20} style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 14, minHeight: '100%', backgroundColor: 'transparent', color: '#d4d4d4' }} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <FileCode className="w-12 h-12 mb-4 opacity-10" /> <p className="text-sm">Select a file to edit</p>
                </div>
              )}
            </div>
            {showTerminal && (
              <div className="h-1/2 border-t border-white/10 bg-[#1e1e1e] flex flex-col">
                <div className="flex items-center justify-between px-4 py-1.5 bg-white/5 border-b border-white/10">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground"><TerminalIcon className="w-3 h-3" /> Terminal</div>
                  <button onClick={() => setShowTerminal(false)} className="text-muted-foreground hover:text-white"><X className="w-3.5 h-3.5" /></button>
                </div>
                <div ref={terminalRef} className="flex-1 overflow-hidden p-2" />
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center h-full">
            <Folder className="w-16 h-16 mb-4 opacity-10" /> <p className="text-lg font-medium">No Project Selected</p>
          </div>
        )}
      </div>

      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}><DialogContent><DialogHeader><DialogTitle>Rename</DialogTitle></DialogHeader><div className="py-4"><Input value={newName} onChange={e => setNewName(e.target.value)} /></div><DialogFooter><Button variant="ghost" onClick={() => setIsRenameDialogOpen(false)}>Cancel</Button><Button onClick={handleRename}>Rename</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}><DialogContent><DialogHeader><DialogTitle>Delete</DialogTitle></DialogHeader><div className="py-4"><p className="text-sm">Are you sure?</p></div><DialogFooter><Button variant="ghost" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button><Button variant="destructive" onClick={handleDelete}>Delete</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={isAddFileDialogOpen} onOpenChange={setIsAddFileDialogOpen}><DialogContent><DialogHeader><DialogTitle>Add New File</DialogTitle></DialogHeader><div className="py-4"><Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="filename.py" /></div><DialogFooter><Button variant="ghost" onClick={() => setIsAddFileDialogOpen(false)}>Cancel</Button><Button onClick={handleAddFile}>Create File</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={isAddFolderDialogOpen} onOpenChange={setIsAddFolderDialogOpen}><DialogContent><DialogHeader><DialogTitle>Add New Folder</DialogTitle></DialogHeader><div className="py-4"><Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Folder name" /></div><DialogFooter><Button variant="ghost" onClick={() => setIsAddFolderDialogOpen(false)}>Cancel</Button><Button onClick={handleAddFolder}>Create Folder</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
