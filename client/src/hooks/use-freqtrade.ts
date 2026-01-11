import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { InsertFreqtradeConnection, FreqtradeConnection, FreqtradeState, FreqtradeTrade, BacktestRequest } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useConnections() {
  return useQuery({
    queryKey: [api.freqtrade.listConnections.path],
    queryFn: async () => {
      const res = await fetch(api.freqtrade.listConnections.path);
      if (!res.ok) throw new Error("Failed to fetch connections");
      return api.freqtrade.listConnections.responses[200].parse(await res.json());
    },
  });
}

export function useConnection(id: number) {
  return useQuery({
    queryKey: [api.freqtrade.getConnection.path, id],
    queryFn: async () => {
      const url = buildUrl(api.freqtrade.getConnection.path, { id });
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch connection");
      return api.freqtrade.getConnection.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateConnection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertFreqtradeConnection) => {
      const validated = api.freqtrade.createConnection.input.parse(data);
      const res = await fetch(api.freqtrade.createConnection.path, {
        method: api.freqtrade.createConnection.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      if (!res.ok) throw new Error("Failed to create connection");
      return api.freqtrade.createConnection.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.freqtrade.listConnections.path] });
      toast({ title: "Success", description: "Connection added successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteConnection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.freqtrade.deleteConnection.path, { id });
      const res = await fetch(url, { method: api.freqtrade.deleteConnection.method });
      if (!res.ok) throw new Error("Failed to delete connection");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.freqtrade.listConnections.path] });
      toast({ title: "Success", description: "Connection removed" });
    },
  });
}

// === Proxy Methods ===

export function useFreqtradePing(connectionId: number) {
  return useQuery({
    queryKey: ["freqtrade", connectionId, "ping"],
    queryFn: async () => {
      const url = buildUrl(api.freqtrade.ping.path, { id: connectionId });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Connection failed");
      return await res.json();
    },
    refetchInterval: 10000, // Check status every 10s
    retry: false,
    enabled: !!connectionId,
  });
}

export function useFreqtradeOpenTrades(connectionId: number) {
  return useQuery({
    queryKey: ["freqtrade", connectionId, "open-trades"],
    queryFn: async () => {
      const res = await fetch(`/api/freqtrade/${connectionId}/open-trades`);
      if (!res.ok) throw new Error("Failed to fetch open trades");
      return await res.json();
    },
    refetchInterval: 5000,
    enabled: !!connectionId,
  });
}

export function useFreqtradeStats(connectionId: number) {
  return useQuery({
    queryKey: ["freqtrade", connectionId, "stats"],
    queryFn: async () => {
      const res = await fetch(`/api/freqtrade/${connectionId}/stats`);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return await res.json();
    },
    refetchInterval: 30000,
    enabled: !!connectionId,
  });
}

export function useFreqtradeDailyProfit(connectionId: number, days: number = 7) {
  return useQuery({
    queryKey: ["freqtrade", connectionId, "daily-profit", days],
    queryFn: async () => {
      const res = await fetch(`/api/freqtrade/${connectionId}/daily-profit?days=${days}`);
      if (!res.ok) throw new Error("Failed to fetch daily profit");
      return await res.json();
    },
    refetchInterval: 60000,
    enabled: !!connectionId,
  });
}

export function useFreqtradeTrades(connectionId: number) {
  return useQuery({
    queryKey: ["freqtrade", connectionId, "trades"],
    queryFn: async () => {
      const url = buildUrl(api.freqtrade.trades.path, { id: connectionId });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch trades");
      const data = await res.json();
      return data.trades as FreqtradeTrade[];
    },
    refetchInterval: 5000, // Live updates
    enabled: !!connectionId,
  });
}

export function useRunBacktest() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ connectionId, ...data }: { connectionId: number } & BacktestRequest) => {
      const url = buildUrl(api.freqtrade.backtest.path, { id: connectionId });
      const res = await fetch(url, {
        method: api.freqtrade.backtest.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Backtest failed to start");
      return await res.json();
    },
    onError: (error) => {
      toast({ title: "Backtest Error", description: error.message, variant: "destructive" });
    },
  });
}
