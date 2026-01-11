import { Server, Trash2, Activity, Wifi, WifiOff, ShieldCheck, Clock } from "lucide-react";
import type { FreqtradeConnection } from "@shared/schema";
import { useFreqtradePing, useDeleteConnection } from "@/hooks/use-freqtrade";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ConnectionCardProps {
  connection: FreqtradeConnection;
}

export function ConnectionCard({ connection }: ConnectionCardProps) {
  const { data: ping, isLoading, isError } = useFreqtradePing(connection.id);
  const deleteMutation = useDeleteConnection();

  const isOnline = !isLoading && !isError && ping?.status === "online";

  return (
    <Card className="group relative overflow-visible bg-card/40 hover:bg-card/60 border-white/5 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 hover-elevate">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <div className={cn(
              "p-3 rounded-2xl transition-all duration-300 shadow-inner",
              isOnline 
                ? "bg-green-500/10 text-green-500 ring-1 ring-green-500/20 shadow-green-500/10" 
                : "bg-red-500/10 text-red-500 ring-1 ring-red-500/20 shadow-red-500/10"
            )}>
              <Server className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display font-bold text-lg text-white truncate leading-tight mb-1">
                {connection.name}
              </h3>
              <div className="flex items-center gap-2 text-muted-foreground">
                <p className="text-xs font-mono truncate max-w-[150px] opacity-70 group-hover:opacity-100 transition-opacity">
                  {connection.apiUrl}
                </p>
              </div>
            </div>
          </div>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold border backdrop-blur-md transition-all duration-300",
                  isOnline 
                    ? "bg-green-500/10 border-green-500/30 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.1)]" 
                    : "bg-red-500/10 border-red-500/30 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.1)]"
                )}>
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full animate-pulse",
                    isOnline ? "bg-green-400" : "bg-red-400"
                  )} />
                  {isOnline ? "Online" : "Offline"}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">{isOnline ? "Bot is responding" : "Bot is unreachable"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-black/30 border border-white/5 flex flex-col gap-1 group/stat transition-colors hover:border-white/10">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Activity className="w-3 h-3" />
              <p className="text-[10px] uppercase tracking-tight font-semibold">Status</p>
            </div>
            <p className="font-mono text-xs text-white font-medium">
              {isLoading ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                  Syncing
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    isOnline ? "bg-green-500" : "bg-red-500"
                  )} />
                  {ping?.status || "Unknown"}
                </span>
              )}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-black/30 border border-white/5 flex flex-col gap-1 group/stat transition-colors hover:border-white/10">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <ShieldCheck className="w-3 h-3" />
              <p className="text-[10px] uppercase tracking-tight font-semibold">User</p>
            </div>
            <p className="font-mono text-xs text-white font-medium truncate">
              {connection.username}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between pt-4 border-t border-white/5">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
            <Clock className="w-3 h-3" />
            <span>Updated just now</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (confirm("Are you sure you want to delete this connection?")) {
                deleteMutation.mutate(connection.id);
              }
            }}
            disabled={deleteMutation.isPending}
            className="h-8 w-8 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
            data-testid={`button-delete-connection-${connection.id}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
