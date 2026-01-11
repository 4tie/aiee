import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSyncState } from "@/hooks/use-sync-state";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { CheckCircle2, XCircle, Loader2, Save } from "lucide-react";

interface AIModel {
  id: string;
  name: string;
}

export default function Settings() {
  const { toast } = useToast();
  const [autoPlay, setAutoPlay] = useSyncState("tts_autoplay", true);
  const [voicePitch, setVoicePitch] = useSyncState("tts_pitch", 1.1);
  const [voiceRate, setVoiceRate] = useSyncState("tts_rate", 1.0);
  const [apiKey, setApiKey] = useSyncState("openrouter_api_key", "");
  const [selectedModel, setSelectedModel] = useSyncState("selected_ai_model", "xiaomi/mimo-v2-flash:free");

  // Local state for the inputs to allow manual saving
  const [localApiKey, setLocalApiKey] = useState(apiKey);
  const [localModel, setLocalModel] = useState(selectedModel);

  const { data: models } = useQuery<AIModel[]>({
    queryKey: ["/api/models"],
  });

  const testKeyMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/test-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: localApiKey })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Invalid API key");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Test Successful",
        description: "Your OpenRouter API key is valid.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Test Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleSave = () => {
    setApiKey(localApiKey);
    setSelectedModel(localModel);
    toast({
      title: "Settings Saved",
      description: "Your configuration has been updated successfully.",
    });
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <Button onClick={handleSave} className="gap-2">
          <Save className="w-4 h-4" />
          Save All Changes
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>AI Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>OpenRouter API Key</Label>
            <div className="flex gap-2">
              <Input 
                type="password" 
                value={localApiKey} 
                onChange={(e) => setLocalApiKey(e.target.value)}
                placeholder="sk-or-v1-..."
                className="flex-1"
                data-testid="input-api-key"
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => testKeyMutation.mutate()}
                disabled={!localApiKey || testKeyMutation.isPending}
                className="gap-2 shrink-0"
              >
                {testKeyMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : testKeyMutation.isSuccess ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : testKeyMutation.isError ? (
                  <XCircle className="w-4 h-4 text-red-500" />
                ) : null}
                Test Key
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Your API key is stored locally in your browser.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Default AI Model</Label>
            <Select 
              value={localModel} 
              onValueChange={setLocalModel}
            >
              <SelectTrigger data-testid="select-ai-model">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {models?.filter(m => m.id.endsWith(":free")).map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Voice Assistant</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-speak responses</Label>
              <p className="text-sm text-muted-foreground">Automatically read AI responses aloud</p>
            </div>
            <Switch 
              checked={autoPlay} 
              onCheckedChange={setAutoPlay} 
              data-testid="switch-tts-autoplay"
            />
          </div>

          <div className="space-y-2">
            <Label>Voice Pitch</Label>
            <Select 
              value={voicePitch.toString()} 
              onValueChange={(v) => setVoicePitch(parseFloat(v))}
            >
              <SelectTrigger data-testid="select-voice-pitch">
                <SelectValue placeholder="Select pitch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.8">Deep</SelectItem>
                <SelectItem value="1.0">Normal</SelectItem>
                <SelectItem value="1.1">Natural (Feminine)</SelectItem>
                <SelectItem value="1.3">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Speech Rate</Label>
            <Select 
              value={voiceRate.toString()} 
              onValueChange={(v) => setVoiceRate(parseFloat(v))}
            >
              <SelectTrigger data-testid="select-voice-rate">
                <SelectValue placeholder="Select rate" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.8">Slow</SelectItem>
                <SelectItem value="1.0">Normal</SelectItem>
                <SelectItem value="1.2">Fast</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
