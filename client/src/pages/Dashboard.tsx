import { useState } from "react";
import { useConnections, useFreqtradeTrades, useFreqtradePing } from "@/hooks/use-freqtrade";
import { Loader2, TrendingUp, TrendingDown, DollarSign, Activity, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { data: connections } = useConnections();
  const [selectedConnectionId, setSelectedConnectionId] = useState<number | null>(null);

  if (connections?.length && !selectedConnectionId) {
    setSelectedConnectionId(connections[0].id);
  }

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">Live Dashboard</h1>
          <p className="text-muted-foreground">Monitor real-time trading activity</p>
        </div>
        
        <div className="relative">
          <select
            className="appearance-none bg-card border border-white/10 text-white pl-4 pr-10 py-2.5 rounded-xl focus:outline-none focus:border-primary cursor-pointer min-w-[200px]"
            value={selectedConnectionId || ""}
            onChange={(e) => setSelectedConnectionId(Number(e.target.value))}
          >
            {connections?.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">▼</div>
        </div>
      </div>

      {selectedConnectionId ? (
        <DashboardContent connectionId={selectedConnectionId} />
      ) : (
        <div className="text-center py-20 bg-card/30 rounded-3xl border border-dashed border-white/10">
          <p className="text-muted-foreground">No connections available. Add one in the Connections tab.</p>
        </div>
      )}
    </div>
  );
}

function DashboardContent({ connectionId }: { connectionId: number }) {
  const { data: trades, isLoading: tradesLoading } = useFreqtradeTrades(connectionId);
  const { data: ping } = useFreqtradePing(connectionId);

  const openTrades = trades?.filter(t => t.is_open) || [];
  const totalProfit = trades?.reduce((acc, t) => acc + (t.profit_abs || 0), 0) || 0;
  
  if (tradesLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card/50 border border-white/5 p-6 rounded-2xl backdrop-blur-sm">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Open Trades</p>
              <h3 className="text-2xl font-bold text-white font-mono">{openTrades.length}</h3>
            </div>
          </div>
        </div>

        <div className="bg-card/50 border border-white/5 p-6 rounded-2xl backdrop-blur-sm">
          <div className="flex items-center gap-4 mb-2">
            <div className={cn(
              "p-3 rounded-xl",
              totalProfit >= 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
            )}>
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Profit (Abs)</p>
              <h3 className={cn("text-2xl font-bold font-mono", totalProfit >= 0 ? "text-green-400" : "text-red-400")}>
                {totalProfit.toFixed(2)} USDT
              </h3>
            </div>
          </div>
        </div>

        <div className="bg-card/50 border border-white/5 p-6 rounded-2xl backdrop-blur-sm">
          <div className="flex items-center gap-4 mb-2">
            <div className={cn(
              "p-3 rounded-xl",
              ping?.status === 'online' ? "bg-green-500/10 text-green-500" : "bg-orange-500/10 text-orange-500"
            )}>
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Bot Status</p>
              <h3 className="text-2xl font-bold text-white uppercase font-display">{ping?.status || "Unknown"}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Trades Table */}
      <div className="bg-card/40 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="p-6 border-b border-white/5">
          <h3 className="text-lg font-semibold text-white">Active Trades</h3>
        </div>
        
        {openTrades.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            No active trades at the moment.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-muted-foreground font-medium uppercase text-xs">
                <tr>
                  <th className="px-6 py-4">Pair</th>
                  <th className="px-6 py-4">Open Date</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                  <th className="px-6 py-4 text-right">Open Rate</th>
                  <th className="px-6 py-4 text-right">Profit %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {openTrades.map((trade) => (
                  <tr key={trade.trade_id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-medium text-white">{trade.pair}</td>
                    <td className="px-6 py-4 text-muted-foreground">{trade.open_date}</td>
                    <td className="px-6 py-4 text-right font-mono text-white">{trade.amount}</td>
                    <td className="px-6 py-4 text-right font-mono text-muted-foreground">{trade.open_rate}</td>
                    <td className="px-6 py-4 text-right">
                      <div className={cn(
                        "inline-flex items-center gap-1 font-mono font-bold",
                        (trade.profit_pct || 0) >= 0 ? "text-green-400" : "text-red-400"
                      )}>
                        {(trade.profit_pct || 0) >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {(trade.profit_pct || 0).toFixed(2)}%
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
