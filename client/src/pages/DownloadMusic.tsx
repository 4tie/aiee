import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Music, Download, Loader2 } from "lucide-react";

export default function DownloadMusic() {
  const [url, setUrl] = useState("");
  const { toast } = useToast();

  const downloadMutation = useMutation({
    mutationFn: async (url: string) => {
      const res = await apiRequest("POST", "/api/download-youtube", { url });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Download started" });
      setUrl("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start download",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card className="hover-elevate">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="w-6 h-6" />
            Download Music from YouTube
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Paste YouTube URL here..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              data-testid="input-youtube-url"
            />
            <Button
              onClick={() => downloadMutation.mutate(url)}
              disabled={!url || downloadMutation.isPending}
              data-testid="button-download"
            >
              {downloadMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Download
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Enter a YouTube video URL to extract and download the audio as MP3.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
