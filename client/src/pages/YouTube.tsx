import { useState, useRef, useEffect } from "react";
import { useSyncState } from "@/hooks/use-sync-state";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { YoutubeVideo, Playlist } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Search, 
  Plus, 
  Play, 
  ListPlus, 
  X,
  Repeat,
  Shuffle,
  Volume2,
  VolumeX,
  SkipForward,
  SkipBack,
  Pause,
  ChevronRight,
  ChevronLeft,
  MoreHorizontal
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactPlayer from "react-player";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export function YouTubePlayer() {
  const [playingVideo, setPlayingVideo] = useSyncState<any>("yt_playing_video", null);
  const [playerSize, setPlayerSize] = useSyncState("yt_player_size", { width: 400, height: 225 });
  const [isRepeat, setIsRepeat] = useSyncState("yt_is_repeat", false);
  const [isShuffle, setIsShuffle] = useSyncState("yt_is_shuffle", false);
  const [volume, setVolume] = useSyncState("yt_volume", 0.8);
  const [isPlaying, setIsPlaying] = useSyncState("yt_is_playing", false);
  const [isMuted, setIsMuted] = useSyncState("yt_is_muted", false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [played, setPlayed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const playerRef = useRef<any>(null);

  const { data: libraryVideos } = useQuery<any[]>({
    queryKey: ["/api/youtube/library"],
  });

  const handlePlay = (video: any) => {
    const youtubeId = video.id || video.youtubeId;
    if (!youtubeId) return;
    setIsPlaying(false);
    setIsPlayerReady(false);
    setPlayingVideo(null);
    setTimeout(() => {
      setPlayingVideo({ ...video, _t: Date.now() });
    }, 100);
  };

  const onPlayerReady = () => {
    setIsPlayerReady(true);
    // Use a small delay and check if video still exists to avoid play interruptions
    setTimeout(() => {
      setPlayingVideo((prev: any) => {
        if (prev) {
          setIsPlaying(true);
        }
        return prev;
      });
    }, 1200);
  };

  const handleNext = () => {
    if (!libraryVideos || libraryVideos.length === 0) return;
    let nextIndex;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * libraryVideos.length);
    } else {
      const currentIndex = libraryVideos.findIndex(v => (v.id || v.youtubeId) === (playingVideo?.id || playingVideo?.youtubeId));
      nextIndex = (currentIndex + 1) % libraryVideos.length;
    }
    handlePlay(libraryVideos[nextIndex]);
  };

  const handlePrevious = () => {
    if (!libraryVideos || libraryVideos.length === 0) return;
    const currentIndex = libraryVideos.findIndex(v => (v.id || v.youtubeId) === (playingVideo?.id || playingVideo?.youtubeId));
    const prevIndex = (currentIndex - 1 + libraryVideos.length) % libraryVideos.length;
    handlePlay(libraryVideos[prevIndex]);
  };

  const handleProgress = (state: { played: number }) => {
    if (!isSeeking) {
      setPlayed(state.played);
    }
  };

  const handleDuration = (duration: number) => {
    setDuration(duration);
  };

  const formatTime = (seconds: number) => {
    const date = new Date(seconds * 1000);
    const hh = date.getUTCHours();
    const mm = date.getUTCMinutes();
    const ss = date.getUTCSeconds().toString().padStart(2, "0");
    if (hh) {
      return `${hh}:${mm.toString().padStart(2, "0")}:${ss}`;
    }
    return `${mm}:${ss}`;
  };

  const PlayerComp = ReactPlayer as any;

  return (
    <div 
      className={`fixed bottom-4 right-4 z-[100] animate-in slide-in-from-bottom duration-300 group/player ${!playingVideo ? 'hidden' : ''}`}
      style={{ width: playerSize.width }}
    >
      <Card className="glass-panel overflow-hidden border-primary/20 shadow-2xl relative">
        <div 
          className="absolute top-0 left-0 w-4 h-4 cursor-nwse-resize z-[110] bg-primary/20 opacity-0 group-hover/player:opacity-100 transition-opacity flex items-center justify-center rounded-br-lg"
          onMouseDown={(e) => {
            const startX = e.clientX;
            const startWidth = playerSize.width;
            const onMouseMove = (moveEvent: MouseEvent) => {
              const deltaX = startX - moveEvent.clientX;
              const newWidth = Math.max(300, Math.min(800, startWidth + deltaX));
              setPlayerSize({
                width: newWidth,
                height: (newWidth * 9) / 16
              });
            };
            const onMouseUp = () => {
              document.removeEventListener("mousemove", onMouseMove);
              document.removeEventListener("mouseup", onMouseUp);
            };
            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
          }}
        >
          <div className="w-1 h-1 bg-primary rounded-full" />
        </div>

        <CardContent className="p-0">
          <div className="flex flex-col">
            <div 
              className="relative aspect-video bg-black"
              style={{ width: playerSize.width, height: playerSize.height }}
            >
              {playingVideo && (
                <div className="w-full h-full">
                  <PlayerComp
                    ref={playerRef}
                    key={playingVideo._t || (playingVideo.id || playingVideo.youtubeId)}
                    url={`https://www.youtube.com/watch?v=${playingVideo.id || playingVideo.youtubeId}`}
                    width="100%"
                    height="100%"
                    playing={isPlaying}
                    volume={volume}
                    muted={isMuted}
                    loop={isRepeat}
                    onEnded={handleNext}
                    onReady={onPlayerReady}
                    onProgress={handleProgress}
                    onDuration={handleDuration}
                    config={{
                      youtube: {
                        playerVars: { showinfo: 0, controls: 0, modestbranding: 1 }
                      }
                    }}
                  />
                </div>
              )}
            </div>
            <div className="p-3 flex flex-col gap-3 bg-background/95 backdrop-blur-sm border-t border-border/50">
              <div className="flex flex-col gap-1 px-2">
                <Slider
                  value={[played * 100]}
                  max={100}
                  step={0.1}
                  className="w-full"
                  onValueChange={(vals) => {
                    setIsSeeking(true);
                    setPlayed(vals[0] / 100);
                  }}
                  onValueCommit={(vals) => {
                    setIsSeeking(false);
                    if (playerRef.current) {
                      try {
                        const player = playerRef.current;
                        // ReactPlayer usually exposes seekTo directly
                        if (typeof player.seekTo === 'function') {
                          player.seekTo(vals[0] / 100);
                        } else {
                          // Try internal player fallback for different versions/providers
                          const internal = player.getInternalPlayer();
                          if (internal) {
                            if (typeof internal.seekTo === 'function') {
                              internal.seekTo(vals[0] / 100, true);
                            } else if (typeof internal.seekToVideo === 'function') {
                              internal.seekToVideo(vals[0] / 100, true);
                            }
                          }
                        }
                      } catch (err) {
                        console.error("Seek failed:", err);
                      }
                    }
                  }}
                />
                <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                  <span>{formatTime(played * duration)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5 overflow-hidden flex-1 mr-2">
                  <h4 className="font-bold text-sm line-clamp-1">{playingVideo?.title || "No video playing"}</h4>
                  <p className="text-xs text-muted-foreground truncate">{playingVideo?.channelTitle || ""}</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive shrink-0"
                  onClick={() => setPlayingVideo(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 rounded-full transition-colors ${isShuffle ? 'text-primary' : 'text-muted-foreground'}`}
                    onClick={() => setIsShuffle(!isShuffle)}
                  >
                    <Shuffle className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-muted-foreground"
                    onClick={handlePrevious}
                  >
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-10 w-10 rounded-full shadow-sm"
                    onClick={() => setIsPlaying(!isPlaying)}
                  >
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-muted-foreground"
                    onClick={handleNext}
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 rounded-full transition-colors ${isRepeat ? 'text-primary' : 'text-muted-foreground'}`}
                    onClick={() => setIsRepeat(!isRepeat)}
                  >
                    <Repeat className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-3 px-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => setIsMuted(!isMuted)}
                  >
                    {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>
                  <Slider
                    value={[isMuted ? 0 : volume * 100]}
                    max={100}
                    step={1}
                    className="w-full"
                    onValueChange={(vals) => {
                      setVolume(vals[0] / 100);
                      if (vals[0] > 0) setIsMuted(false);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function YouTube() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [playingVideo, setPlayingVideo] = useSyncState<any>("yt_playing_video", null);
  const { toast } = useToast();

  const { data: libraryVideos } = useQuery<any[]>({
    queryKey: ["/api/youtube/library"],
  });

  const { data: playlists } = useQuery<Playlist[]>({
    queryKey: ["/api/youtube/playlists"],
  });

  const { data: recentPlays } = useQuery<YoutubeVideo[]>({
    queryKey: ["/api/youtube/recent"],
  });

  const handlePlay = (video: any) => {
    setPlayingVideo({ ...video, _t: Date.now() });
  };

  const createPlaylistMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/youtube/playlists", { name });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/youtube/playlists"] });
      toast({ title: "Playlist created" });
    },
  });

  const addToPlaylistMutation = useMutation({
    mutationFn: async ({ playlistId, video }: { playlistId: number; video: any }) => {
      const res = await apiRequest("POST", `/api/youtube/playlists/${playlistId}/items`, {
        youtubeId: video.id,
        title: video.title,
        description: video.description,
        thumbnailUrl: video.thumbnailUrl,
        channelTitle: video.channelTitle,
        publishedAt: video.publishedAt,
        position: 0,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Added to playlist" });
    },
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Search failed",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const VideoCard = ({ video }: { video: any }) => (
    <div className="group relative space-y-3 w-full">
      <div className="relative aspect-video overflow-hidden rounded-xl bg-muted border border-white/5 group-hover:border-primary/30 transition-all shadow-lg">
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          className="object-cover transition-transform duration-500 group-hover:scale-110 h-full w-full opacity-90 group-hover:opacity-100"
        />
        <div className="absolute inset-0 bg-black/60 opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-center justify-center gap-3 backdrop-blur-[2px]">
          <Button
            size="icon"
            variant="default"
            className="h-12 w-12 rounded-full shadow-xl transform scale-90 group-hover:scale-100 transition-transform"
            onClick={() => handlePlay(video)}
          >
            <Play className="h-6 w-6 fill-current" />
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="icon" variant="secondary" className="h-12 w-12 rounded-full shadow-xl transform scale-90 group-hover:scale-100 transition-transform delay-75">
                <ListPlus className="h-6 w-6" />
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-panel">
              <DialogHeader>
                <DialogTitle>Add to Playlist</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
                {playlists?.map((p) => (
                  <Button
                    key={p.id}
                    variant="ghost"
                    className="w-full justify-start hover:bg-primary/10 hover:text-primary transition-colors h-12"
                    onClick={() => addToPlaylistMutation.mutate({ playlistId: p.id, video })}
                  >
                    <ListPlus className="mr-3 h-4 w-4" />
                    {p.name}
                  </Button>
                ))}
                {(!playlists || playlists.length === 0) && (
                  <p className="text-sm text-center text-muted-foreground py-4">No playlists found. Create one to get started!</p>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
        {video.duration && (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white">
            {video.duration}
          </div>
        )}
      </div>
      <div className="space-y-1 pr-2">
        <h3 className="font-semibold leading-snug line-clamp-2 text-sm group-hover:text-primary transition-colors cursor-pointer" onClick={() => handlePlay(video)}>
          {video.title}
        </h3>
        <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
          {video.channelTitle}
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-background text-foreground animate-in relative">
      <header className="sticky top-0 z-10 flex items-center justify-between p-4 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-4 flex-1 max-w-2xl">
          <form onSubmit={handleSearch} className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search videos, artists, songs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted/50 border-border/50 focus-visible:ring-primary/20 h-10 rounded-xl"
            />
          </form>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <Button 
            variant="outline" 
            className="rounded-xl h-10 border-primary/50 text-primary hover:bg-primary/10"
            onClick={() => window.location.href = '/api/auth/google'}
          >
            Connect YouTube
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="rounded-xl h-10 hover-elevate">
                <Plus className="mr-2 h-4 w-4" />
                New playlist
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-panel">
              <DialogHeader>
                <DialogTitle>Create Playlist</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const name = new FormData(e.currentTarget).get("name") as string;
                  createPlaylistMutation.mutate(name);
                }}
                className="space-y-4"
              >
                <Input name="name" placeholder="Playlist name" className="bg-muted/50 border-border/50" required />
                <Button type="submit" className="w-full">Create</Button>
              </form>
            </DialogContent>
          </Dialog>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 hover-elevate">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 glass-panel">
              <DropdownMenuItem className="cursor-pointer" onClick={() => window.open('https://youtube.com', '_blank')}>
                YouTube Home
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={() => window.open('https://music.youtube.com', '_blank')}>
                YouTube Music
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive cursor-pointer">
                Clear history
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-20">
        <div className="p-6 space-y-12 max-w-[1600px] mx-auto">
          {searchResults.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-display font-bold">Search results</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {searchResults.map((video) => (
                  <VideoCard key={video.id} video={video} />
                ))}
              </div>
            </section>
          )}

          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-display font-bold">From your library</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full border-border/50 hover-elevate no-default-active-elevate">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full border-border/50 hover-elevate no-default-active-elevate">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {libraryVideos?.map((video) => (
                <VideoCard key={video.id || video.youtubeId} video={video} />
              ))}
              {(!libraryVideos || libraryVideos.length === 0) && playlists?.map((playlist) => (
                <div key={playlist.id} className="group space-y-3 cursor-pointer">
                  <div className="aspect-square rounded-xl glass-panel flex items-center justify-center transition-all overflow-hidden relative border border-white/5 hover:border-primary/30">
                    <div className="grid grid-cols-2 grid-rows-2 w-full h-full opacity-20">
                      <div className="bg-primary/20" />
                      <div className="bg-primary/40" />
                      <div className="bg-primary/10" />
                      <div className="bg-primary/30" />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center flex-col gap-2">
                      <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all shadow-lg shadow-primary/20 active-elevate-2">
                        <Play className="h-6 w-6 fill-current text-primary-foreground" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1 text-center sm:text-left">
                    <h3 className="font-medium line-clamp-1 text-sm text-white group-hover:text-primary transition-colors">{playlist.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono">Playlist</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-display font-bold">Listen again</h2>
              <Button variant="outline" size="sm" className="rounded-full border-border/50 hover:bg-muted h-8 px-4">
                More
              </Button>
            </div>
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex space-x-6 pb-4">
                {recentPlays?.map((video) => (
                  <div key={video.id || video.youtubeId} className="group space-y-3 w-[160px] shrink-0">
                    <div className="relative aspect-square rounded-xl bg-muted/50 overflow-hidden border border-border/50 shadow-md">
                      <img 
                        src={video.thumbnailUrl || ""} 
                        alt={video.title} 
                        className="object-cover h-full w-full opacity-90 group-hover:opacity-100 transition-all duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-[2px]">
                         <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-xl shadow-primary/20 transform translate-y-4 group-hover:translate-y-0 transition-all active-elevate-2">
                            <Play className="h-6 w-6 fill-current text-primary-foreground" onClick={() => handlePlay(video)} />
                         </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-medium text-sm line-clamp-1">{video.title}</h3>
                      <p className="text-xs text-muted-foreground font-mono">{video.channelTitle}</p>
                    </div>
                  </div>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </section>
        </div>
      </main>
    </div>
  );
}
