import { useState, useRef, useEffect } from "react";
import { useSyncState } from "@/hooks/use-sync-state";
import { Bot, Send, Sparkles, FileCode, CheckSquare, Square, Mic, MicOff, Volume2, Copy, Check, MessageSquareQuote, Search, Folder } from "lucide-react";
import { FeedbackButtons } from "@/components/FeedbackButtons";
import { motion, AnimatePresence } from "framer-motion";
import { useChat } from "@/hooks/use-chat";
import { useProjects, useUpdateProject } from "@/hooks/use-projects";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { useQuery } from "@tanstack/react-query";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSearch } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

interface UserSettings {
  messages: any[];
  apiKey: string;
  selectedModel: string;
}

interface AIModel {
  id: string;
  name: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  metadata?: {
    suggestions?: string[];
    variants?: string[];
    tutorials?: any[];
    variant?: "default" | "creative" | "precise" | "fast";
  };
}

export default function Home() {
  const { toast } = useToast();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const projectIdParam = params.get("projectId");

  const [messages, setMessages] = useSyncState<Message[]>(`chat_messages_${projectIdParam || 'default'}`, []);
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState<number | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useSyncState("selected_ai_model", "xiaomi/mimo-v2-flash:free");
  const [apiKey, setApiKey] = useSyncState("openrouter_api_key", "");
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [isContextVisible, setIsContextVisible] = useState(true);
  
  const { data: projects } = useProjects();
  const updateProjectMutation = useUpdateProject();
  
  const activeProjectId = projectIdParam ? parseInt(projectIdParam) : (projects?.[0]?.id || null);
  const activeProject = projects?.find(p => p.id === activeProjectId);

  const { data: settings, isLoading: isLoadingSettings } = useQuery<UserSettings>({
    queryKey: ["/api/settings"],
  });

  const { data: models } = useQuery<AIModel[]>({
    queryKey: ["/api/models"],
  });

  const chatMutation = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeProject && isInitialLoad) {
      if (activeProject.messages && (activeProject.messages as any[]).length > 0) {
        setMessages(activeProject.messages as Message[]);
        setIsInitialLoad(false);
      } else if (activeProject.messages) {
        // If it's an empty array from a new project, we still mark initial load as done
        setIsInitialLoad(false);
      }
    }
  }, [activeProject, isInitialLoad]);

  useEffect(() => {
    if (activeProjectId && !isInitialLoad && !isLoadingSettings) {
      const timer = setTimeout(() => {
        updateProjectMutation.mutate({
          id: activeProjectId,
          messages: messages
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [messages, activeProjectId, isInitialLoad, isLoadingSettings]);

  useEffect(() => {
    // Settings are now handled by useSyncState and localStorage
  }, [settings, isInitialLoad]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e?: React.FormEvent, customInput?: string) => {
    if (e) e.preventDefault();
    const userMessage = customInput || input;
    if (!userMessage.trim() || chatMutation.isPending) return;

    if (!customInput) setInput("");
    
    setMessages(prev => [
      ...prev, 
      { role: "user", content: userMessage } as Message,
      { role: "assistant", content: "", metadata: { variant: "default" } } as Message
    ]);

    try {
      const result = await chatMutation.mutateAsync({
        message: userMessage,
        model: selectedModel,
        apiKey: apiKey,
        contextFiles: selectedProjects.length > 0 ? selectedProjects : undefined,
        useWebSearch,
        onToken: (token) => {
          setMessages(prev => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];
            if (lastMsg && lastMsg.role === "assistant") {
              lastMsg.content += token;
            }
            return updated;
          });
        }
      });

      if (result.metadata) {
        setMessages(prev => {
          const updated = [...prev];
          const lastMsg = updated[updated.length - 1];
          if (lastMsg && lastMsg.role === "assistant") {
            lastMsg.metadata = {
              ...lastMsg.metadata,
              ...result.metadata
            };
          }
          return updated;
        });
      }
    } catch (err: any) {
      let errorMessage = "Sorry, I encountered an error processing your request.";
      if (err?.message?.includes("429") || err?.status === 429) {
        errorMessage = "Rate limit reached. Please wait a moment or add your own OpenRouter API key in the settings for uninterrupted access.";
      }
      setMessages(prev => {
        const updated = [...prev];
        const lastMsg = updated[updated.length - 1];
        if (lastMsg && lastMsg.role === "assistant") {
          lastMsg.content = errorMessage;
        }
        return updated;
      });
    }
  };

  const toggleFile = (filePath: string, content: string) => {
    const fileId = `--- ${filePath} ---\n${content}`;
    if (selectedProjects.includes(fileId)) {
      setSelectedProjects(prev => prev.filter(c => c !== fileId));
    } else {
      setSelectedProjects(prev => [...prev, fileId]);
    }
  };

  const renderContextFiles = (files: any[]) => {
    return files.map((file: any) => {
      if (file.type === 'folder') {
        return (
          <div key={file.path} className="space-y-1">
            <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Folder className="w-3 h-3" />
              {file.name}
            </div>
            <div className="ml-2 border-l border-white/5 pl-2">
              {renderContextFiles(file.children || [])}
            </div>
          </div>
        );
      }

      const fileId = `--- ${file.path} ---\n${file.content}`;
      const isSelected = selectedProjects.includes(fileId);

      return (
        <div
          key={file.path}
          onClick={() => toggleFile(file.path, file.content)}
          className={cn(
            "flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all hover:bg-white/5 border border-transparent",
            isSelected ? "bg-primary/5 border-primary/20" : ""
          )}
        >
          {isSelected ? (
            <CheckSquare className="w-4 h-4 text-primary shrink-0" />
          ) : (
            <Square className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
          <div className="min-w-0">
            <p className={cn("text-xs font-medium truncate", isSelected ? "text-primary" : "text-gray-300")}>
              {file.name}
            </p>
          </div>
        </div>
      );
    });
  };

  const startVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Speech recognition is not supported in your browser.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev ? `${prev} ${transcript}` : transcript);
      setIsRecording(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  };

  const copyToClipboard = async (text: string, codeId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(codeId);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const [autoPlay] = useSyncState("tts_autoplay", true);
  const [voicePitch] = useSyncState("tts_pitch", 1.1);
  const [voiceRate] = useSyncState("tts_rate", 1.0);

  const speakText = (text: string, idx: number) => {
    if ('speechSynthesis' in window) {
      if (isSpeaking === idx) {
        window.speechSynthesis.cancel();
        setIsSpeaking(null);
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Expanded list of free system female voices
      const voices = window.speechSynthesis.getVoices();
      const femaleVoices = voices.filter(v => 
        (v.name.toLowerCase().includes("female") || 
         v.name.toLowerCase().includes("woman") ||
         v.name.toLowerCase().includes("girl") ||
         v.name.toLowerCase().includes("samantha") ||
         v.name.toLowerCase().includes("victoria") ||
         v.name.toLowerCase().includes("moira") ||
         v.name.toLowerCase().includes("karen") ||
         v.name.toLowerCase().includes("tessa") ||
         v.name.toLowerCase().includes("serena") ||
         v.name.toLowerCase().includes("hazel") ||
         v.name.toLowerCase().includes("zira") ||
         v.name.toLowerCase().includes("catherine") ||
         v.name.toLowerCase().includes("mary") ||
         v.name.toLowerCase().includes("marcia") ||
         v.name.toLowerCase().includes("mariska") ||
         v.name.toLowerCase().includes("melina") ||
         v.name.toLowerCase().includes("nicole") ||
         v.name.toLowerCase().includes("salli") ||
         v.name.toLowerCase().includes("maggie") ||
         v.name.toLowerCase().includes("anna") ||
         v.name.toLowerCase().includes("susan") ||
         v.name.toLowerCase().includes("claire") ||
         v.name.toLowerCase().includes("elsa") ||
         v.name.toLowerCase().includes("jane") ||
         v.name.toLowerCase().includes("lisa") ||
         v.name.toLowerCase().includes("zoe") ||
         v.name.toLowerCase().includes("amy") ||
         v.name.toLowerCase().includes("emma") ||
         v.name.toLowerCase().includes("rosalind") ||
         v.name.toLowerCase().includes("heather") ||
         v.name.toLowerCase().includes("helena") ||
         v.name.toLowerCase().includes("kathleen") ||
         v.name.toLowerCase().includes("linda") ||
         v.name.toLowerCase().includes("marit") ||
         v.name.toLowerCase().includes("monica") ||
         v.name.toLowerCase().includes("nanette") ||
         v.name.toLowerCase().includes("ruth") ||
         v.name.toLowerCase().includes("sarah") ||
         v.name.toLowerCase().includes("sophia") ||
         v.name.toLowerCase().includes("sylvia") ||
         v.name.toLowerCase().includes("veronica") ||
         v.name.toLowerCase().includes("wendy") ||
         v.name.toLowerCase().includes("yasmin")) &&
        v.lang.startsWith("en") &&
        // Ensure they are local/free voices (no 'Premium' or cloud-only markers if possible)
        !v.name.includes("Premium")
      );

      const preferredVoice = femaleVoices.find(v => (v.name.includes("Google") || v.name.includes("Natural")) && v.lang.startsWith("en")) || 
                             femaleVoices[0] || 
                             voices.find(v => v.lang.startsWith("en") && (v.name.includes("Samantha") || v.name.includes("Zira")));
      if (preferredVoice) utterance.voice = preferredVoice;
      
      utterance.pitch = voicePitch;
      utterance.rate = voiceRate;
      
      utterance.onend = () => setIsSpeaking(null);
      utterance.onerror = () => setIsSpeaking(null);
      setIsSpeaking(idx);
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Text-to-speech is not supported in your browser.");
    }
  };

  const handleQuickAction = (action: string) => {
    let prompt = "";
    switch (action) {
      case "summarize":
        prompt = "Please summarize the current strategy or project state.";
        break;
      case "debug":
        prompt = "I'm having an issue. Can you help me debug the code or configuration in this project?";
        break;
      case "improve":
        prompt = "How can I improve this strategy for better performance and risk management?";
        break;
      default:
        return;
    }
    setInput(prompt);
  };

  const { data: recentPlays } = useQuery<any[]>({
    queryKey: ["/api/youtube/recent"],
  });

  if (isLoadingSettings) {
    return <div className="flex items-center justify-center h-screen bg-background text-white">Loading settings...</div>;
  }

  return (
    <div className="flex-1 flex flex-col relative h-full overflow-hidden bg-background">
      <ResizablePanelGroup direction="horizontal" className="flex-1 h-full">
        <ResizablePanel defaultSize={75} minSize={30} className="flex flex-col h-full relative">
          <header className="p-3 sm:p-4 bg-background/80 backdrop-blur-xl border-b border-white/5 flex flex-wrap items-center justify-between gap-3 sm:gap-4 shrink-0 z-20">
            <div className="flex items-center gap-3 pl-12 lg:pl-0">
              <Bot className="w-5 h-5 text-primary" />
              <h1 className="font-display font-bold text-white text-sm sm:text-base">4tiee Assistant</h1>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4 ml-auto">
              {!isContextVisible && (
                <button
                  onClick={() => setIsContextVisible(true)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-all border border-white/10 flex items-center gap-2"
                  title="Show context panel"
                >
                  <Folder className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-medium uppercase tracking-wider hidden xs:inline">Context</span>
                </button>
              )}
              <button
                onClick={() => {
                  if (confirm("Clear chat history?")) {
                    setMessages([{ role: "assistant", content: "Chat history cleared. How can I help you today?" }]);
                  }
                }}
                className="text-[10px] sm:text-xs text-muted-foreground hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/5"
              >
                Clear
              </button>
              
            <div className="flex items-center gap-2">
                <button
                  onClick={() => setUseWebSearch(!useWebSearch)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-xs transition-all border",
                    useWebSearch 
                      ? "bg-primary/20 border-primary text-primary" 
                      : "bg-white/5 border-white/10 text-muted-foreground hover:text-white"
                  )}
                  title="Enable web search plugin"
                >
                  <Search className="w-3 h-3" />
                  <span className="hidden xs:inline">Web Search</span>
                </button>
              </div>
            </div>
          </header>

          <div className="flex-1 min-h-0 relative flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-6 no-scrollbar scroll-smooth" ref={scrollRef}>
              <div className="max-w-4xl mx-auto w-full flex flex-col gap-6 sm:gap-8 pb-10">
                {messages.map((msg, idx) => (
                  <motion.div
                    key={`msg-${idx}-${msg.role}`}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                    className={cn(
                      "flex flex-col gap-3",
                      msg.role === "user" ? "items-end" : "items-start"
                    )}
                  >
                    <div className={cn(
                      "flex gap-3 sm:gap-4 group/msg max-w-[90%] sm:max-w-[80%]",
                      msg.role === "user" ? "flex-row-reverse" : "flex-row"
                    )}>
                      <div className={cn(
                        "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 border border-white/10 shadow-lg transition-transform group-hover/msg:scale-110",
                        msg.role === "user" ? "bg-primary text-white" : "bg-card/80 text-primary"
                      )}>
                        {msg.role === "assistant" ? <Bot className="w-4 h-4 sm:w-5 sm:h-5" /> : <div className="text-[10px] sm:text-xs font-bold">U</div>}
                      </div>
                      
                      <div className={cn(
                        "p-4 sm:p-5 rounded-3xl transition-all duration-300 relative shadow-xl hover:shadow-2xl",
                        msg.role === "user"
                          ? "bg-primary text-white rounded-tr-none shadow-primary/10"
                          : cn(
                              "bg-card/40 border border-white/5 backdrop-blur-xl text-gray-100 rounded-tl-none",
                              msg.metadata?.variant === "creative" ? "border-purple-500/20 shadow-purple-500/5" :
                              msg.metadata?.variant === "precise" ? "border-blue-500/20 shadow-blue-500/5" :
                              msg.metadata?.variant === "fast" ? "border-orange-500/20 shadow-orange-500/5" : ""
                            )
                      )}>
                        {msg.role === "assistant" && msg.metadata?.variant && (
                          <div className={cn(
                            "text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] mb-3 opacity-60",
                            msg.metadata.variant === "creative" ? "text-purple-400" :
                            msg.metadata.variant === "precise" ? "text-blue-400" :
                            msg.metadata.variant === "fast" ? "text-orange-400" : "text-primary"
                          )}>
                            {msg.metadata.variant} mode
                          </div>
                        )}
                        
                        <div className="prose prose-invert prose-xs sm:prose-sm max-w-none leading-relaxed prose-p:mb-3 last:prose-p:mb-0 break-words overflow-hidden">
                          <ReactMarkdown
                            components={{
                              code({ node, inline, className, children, ...props }: any) {
                                const match = /language-(\w+)/.exec(className || '');
                                const codeText = String(children).replace(/\n$/, '');
                                const codeId = `${idx}-${codeText.substring(0, 20)}`;
                                if (!inline && match) {
                                  return (
                                    <div className="relative group/code my-4 rounded-2xl overflow-hidden border border-white/10 bg-black/40 shadow-2xl">
                                      <div className="flex items-center justify-between px-4 py-2.5 bg-white/5 border-b border-white/5">
                                        <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">{match[1]}</span>
                                        <button onClick={() => copyToClipboard(codeText, codeId)} className="text-muted-foreground hover:text-white transition-all p-1 hover:bg-white/10 rounded-md">
                                          {copiedCode === codeId ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                        </button>
                                      </div>
                                      <pre className="p-5 overflow-x-auto no-scrollbar"><code className="text-[13px] length-6" {...props}>{children}</code></pre>
                                    </div>
                                  );
                                }
                                return <code className={cn("px-1.5 py-0.5 rounded-md bg-white/10 text-primary font-medium", className)} {...props}>{children}</code>;
                              }
                            }}
                          >
                            {msg.content.replace(/\[SUGGESTIONS: .*?\]/, '')}
                          </ReactMarkdown>
                        </div>

                        {msg.role === "assistant" && (
                          <div className="flex items-center gap-3 mt-6 pt-5 border-t border-white/5 opacity-0 group-hover/msg:opacity-100 transition-all duration-300">
                            <button onClick={() => speakText(msg.content, idx)} className="p-2 rounded-xl hover:bg-white/5 text-muted-foreground hover:text-primary transition-all">
                              <Volume2 className={cn("w-4 h-4", isSpeaking === idx && "animate-pulse text-primary")} />
                            </button>
                            <button onClick={() => copyToClipboard(msg.content, `bubble-${idx}`)} className="p-2 rounded-xl hover:bg-white/5 text-muted-foreground hover:text-primary transition-all">
                              {copiedCode === `bubble-${idx}` ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            </button>
                            <FeedbackButtons messageIndex={idx} projectId={activeProjectId!} />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {msg.role === "assistant" && msg.metadata?.tutorials && msg.metadata.tutorials.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 w-full max-w-2xl ml-11 sm:ml-14">
                        {msg.metadata.tutorials.map((video, vIdx) => (
                          <a key={vIdx} href={video.url} target="_blank" rel="noopener noreferrer" className="group/vid bg-card/40 border border-white/10 p-2.5 rounded-2xl hover:bg-card/60 hover:scale-[1.02] transition-all duration-300 flex items-center gap-4 shadow-lg shadow-black/20">
                            <div className="relative w-24 aspect-video rounded-xl overflow-hidden shrink-0 shadow-inner">
                              <img src={video.thumbnail} className="w-full h-full object-cover group-hover/vid:scale-110 transition-transform duration-700" alt={video.title} />
                              <div className="absolute inset-0 bg-black/20 group-hover/vid:bg-transparent transition-all duration-500" />
                            </div>
                            <div className="min-w-0 pr-3">
                              <h4 className="text-[11px] font-bold text-white line-clamp-2 group-hover/vid:text-primary transition-colors leading-snug">{video.title}</h4>
                              <p className="text-[9px] text-muted-foreground mt-1.5 uppercase tracking-widest font-medium">{video.duration} • {video.views} views</p>
                            </div>
                          </a>
                        ))}
                      </div>
                    )}

                    {msg.role === "assistant" && msg.metadata?.suggestions && msg.metadata.suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-2.5 mt-5 ml-11 sm:ml-14">
                        {msg.metadata.suggestions.map((suggestion, sIdx) => (
                          <button
                            key={sIdx}
                            onClick={() => handleSubmit(undefined, suggestion)}
                            className="px-5 py-2.5 rounded-2xl text-[10px] font-bold uppercase tracking-[0.15em] bg-white/5 border border-white/10 hover:bg-primary hover:text-white hover:border-primary hover:scale-105 transition-all duration-300 shadow-lg shadow-black/10"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}
                {chatMutation.isPending && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex gap-4 max-w-3xl ml-11 sm:ml-14"
                  >
                    <div className="flex gap-1.5 items-center p-4 bg-card/40 rounded-2xl border border-white/5 backdrop-blur-md shadow-xl">
                      <motion.div
                        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ repeat: Infinity, duration: 1, delay: 0 }}
                        className="w-1.5 h-1.5 bg-primary rounded-full"
                      />
                      <motion.div
                        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                        className="w-1.5 h-1.5 bg-primary rounded-full"
                      />
                      <motion.div
                        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                        className="w-1.5 h-1.5 bg-primary rounded-full"
                      />
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 bg-background/80 backdrop-blur-xl border-t border-white/5 shrink-0">
            <div className="max-w-3xl mx-auto space-y-4">
              {recentPlays && recentPlays.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xs font-bold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                      <Volume2 className="w-3 h-3 text-primary" />
                      Recently Played
                    </h2>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                    {recentPlays.slice(0, 4).map((video) => (
                      <div key={video.id} className="group relative flex-shrink-0 w-32 aspect-video rounded-lg overflow-hidden bg-card/50 border border-white/5">
                        <img src={video.thumbnailUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all" alt={video.title} />
                        <div className="absolute inset-0 p-1.5 flex flex-col justify-end bg-gradient-to-t from-black/80 to-transparent">
                          <p className="text-[9px] font-medium text-white line-clamp-1">{video.title}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "summarize", label: "Summarize", icon: <MessageSquareQuote className="w-3 h-3" /> },
                  { id: "debug", label: "Debug", icon: <Bot className="w-3 h-3" /> },
                  { id: "improve", label: "Improve", icon: <Sparkles className="w-3 h-3" /> },
                ].map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleQuickAction(action.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-medium bg-white/5 border border-white/10 text-muted-foreground hover:text-white hover:bg-white/10 transition-all"
                  >
                    {action.icon}
                    {action.label}
                  </button>
                ))}
              </div>
              
              <div className="relative">
                <form onSubmit={handleSubmit} className="relative group">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about your project or Freqtrade config..."
                    className="w-full bg-card/50 border border-white/10 rounded-2xl pl-6 pr-24 py-4 text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-xl"
                    disabled={chatMutation.isPending}
                  />
                  <div className="absolute right-2 top-2 bottom-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={isRecording ? stopVoiceInput : startVoiceInput}
                      className={cn(
                        "aspect-square flex items-center justify-center rounded-xl transition-all",
                        isRecording 
                          ? "bg-red-500 text-white animate-pulse" 
                          : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white"
                      )}
                      title={isRecording ? "Stop recording" : "Voice input"}
                    >
                      {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>
                    <button 
                      type="submit"
                      disabled={!input.trim() || chatMutation.isPending}
                      className="aspect-square flex items-center justify-center bg-primary hover:bg-primary/90 text-white rounded-xl disabled:opacity-50 disabled:bg-transparent disabled:text-muted-foreground transition-all"
                    >
                      {chatMutation.isPending ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </form>
              </div>
              <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground px-2">
                <Sparkles className="w-3 h-3 text-primary" />
                <span>AI can analyze selected strategies and current market data</span>
              </div>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle className="bg-white/5" />

        {isContextVisible && (
          <ResizablePanel defaultSize={25} minSize={15} className="hidden xl:flex flex-col">
            <div className="flex flex-col h-full bg-card/30 border-l border-white/5">
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-white mb-1">Context</h3>
                  <p className="text-sm text-muted-foreground">Select files for AI analysis</p>
                </div>
                <button
                  onClick={() => setIsContextVisible(false)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-all border border-white/10"
                  title="Hide context panel"
                >
                  <CheckSquare className="w-3.5 h-3.5 rotate-45" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {activeProject ? (
                  <>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
                      Project: {activeProject.name}
                    </p>
                    {renderContextFiles((activeProject.files || []) as any[])}
                  </>
                ) : (
                  <div className="text-center py-8 px-4 border border-dashed border-white/10 rounded-xl">
                    <FileCode className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-sm text-muted-foreground">No active project</p>
                  </div>
                )}
              </div>
            </div>
          </ResizablePanel>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
