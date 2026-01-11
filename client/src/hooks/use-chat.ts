import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useChat() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { 
      message: string; 
      model?: string; 
      apiKey?: string; 
      contextFiles?: string[]; 
      useWebSearch?: boolean;
      onToken?: (token: string) => void;
    }) => {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: data.message,
          model: data.model,
          apiKey: data.apiKey,
          contextFiles: data.contextFiles,
          useWebSearch: data.useWebSearch
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to send message");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      let fullMessage = "";
      let metadata: any = {};
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') break;
            
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.error) throw new Error(parsed.error);
              if (parsed.text) {
                fullMessage += parsed.text;
                if (data.onToken) data.onToken(parsed.text);
              }
              if (parsed.metadata) {
                metadata = { ...metadata, ...parsed.metadata };
              }
            } catch (e) {
              // Ignore partial JSON chunks if they happen
            }
          }
        }
      }

      return { message: fullMessage, metadata };
    },
    onError: (error) => {
      toast({ title: "Chat Error", description: error.message, variant: "destructive" });
    },
  });
}
