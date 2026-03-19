import { useState } from "react";
import { useGetStreams, useLogout } from "@workspace/api-client-react";
import { Plus, Info, Activity, ShieldCheck, LogOut } from "lucide-react";
import { StreamCard } from "@/components/streams/StreamCard";
import { StreamForm } from "@/components/streams/StreamForm";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/polished-modal";

export default function Dashboard() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [, setLocation] = useLocation();
  
  const { data: streams, isLoading, error } = useGetStreams({
    query: {
      refetchInterval: (query) => {
        const hasActive = query.state.data?.some(s => s.status === 'streaming');
        return hasActive ? 3000 : 10000;
      }
    }
  });

  const logoutMutation = useLogout({
    mutation: {
      onSuccess: () => {
        localStorage.removeItem("stream_token");
        localStorage.removeItem("stream_role");
        setLocation("/login");
      }
    }
  });

  const activeCount = streams?.filter(s => s.status === 'streaming').length || 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a] relative overflow-x-hidden pb-20 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 relative z-10">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-12 border-b border-border pb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm bg-black border border-primary/20 text-xs font-bold text-primary mb-4 uppercase tracking-widest shadow-[0_0_10px_rgba(204,0,0,0.1)]">
              <span className="relative flex h-2 w-2">
                {activeCount > 0 ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-sm bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-sm h-2 w-2 bg-primary"></span>
                  </>
                ) : (
                  <span className="relative inline-flex rounded-sm h-2 w-2 bg-primary/40"></span>
                )}
              </span>
              {activeCount} Active Broadcasts
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-white tracking-tight uppercase">
              Stream<span className="text-primary">Control</span>
            </h1>
            <p className="mt-2 text-white/50 max-w-xl text-xs uppercase tracking-widest font-bold">
              Professional Broadcasting Hub
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => logoutMutation.mutate()}
              className="px-4 py-3 rounded-sm bg-black hover:bg-white/5 text-white/60 hover:text-white border border-border transition-all flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest"
            >
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
            <Dialog open={isInfoOpen} onOpenChange={setIsInfoOpen}>
              <DialogTrigger asChild>
                <button className="px-4 py-3 rounded-sm bg-black hover:bg-white/5 text-white border border-border transition-all flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest">
                  <Info className="w-3.5 h-3.5" /> Info
                </button>
              </DialogTrigger>
              <DialogContent className="border-primary/30 max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 uppercase tracking-widest text-lg"><ShieldCheck className="text-primary w-5 h-5" /> Copyright Bypass System</DialogTitle>
                </DialogHeader>
                <div className="mt-6 space-y-6 text-white/80">
                  <div className="p-4 bg-primary/10 border border-primary/20 rounded-sm flex gap-4">
                    <Activity className="w-8 h-8 text-primary flex-shrink-0" />
                    <p className="text-sm leading-relaxed text-white/90">
                      Facebook's automated copyright detection flags streams based on continuous matching of audio/video signatures against their database.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-white font-bold text-xs tracking-widest uppercase font-display">The Solution: Dual-Key Switching</h4>
                    <p className="text-sm leading-relaxed">
                      By configuring a <strong>Primary</strong> and <strong>Backup</strong> stream key, the bot can seamlessly switch the active RTMP destination mid-broadcast.
                    </p>
                    <ul className="list-disc pl-5 space-y-2 text-sm text-white/70">
                      <li>The bot routes your source media to the Active Key.</li>
                      <li>When a switch occurs, the stream momentarily flips to the Backup Key.</li>
                      <li>This brief interruption breaks the continuous matching algorithm of the detection bots.</li>
                    </ul>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <button className="px-5 py-3 rounded-sm bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest shadow-[0_0_15px_rgba(204,0,0,0.3)]">
                  <Plus className="w-3.5 h-3.5" /> New Stream
                </button>
              </DialogTrigger>
              <DialogContent className="border-primary/30">
                <DialogHeader>
                  <DialogTitle className="uppercase tracking-widest text-lg">Create Broadcast</DialogTitle>
                </DialogHeader>
                <StreamForm onSuccess={() => setIsCreateOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {/* Content Area */}
        <main>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="glass-panel rounded-sm h-[340px] animate-pulse bg-white/5" />
              ))}
            </div>
          ) : error ? (
            <div className="p-8 rounded-sm bg-primary/10 border border-primary/30 text-center">
              <h3 className="text-primary font-bold text-lg uppercase tracking-wider">Failed to load streams</h3>
              <p className="text-white/60 mt-2 text-sm">Please check your connection and try again.</p>
            </div>
          ) : streams?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center relative border border-border rounded-sm bg-card">
              <h3 className="text-2xl font-bold text-white mb-2 font-display uppercase tracking-wider">No streams configured</h3>
              <p className="text-white/50 max-w-md mx-auto mb-8 text-sm uppercase tracking-widest font-bold">
                Add your first stream source and configure your keys.
              </p>
              <button 
                onClick={() => setIsCreateOpen(true)}
                className="px-6 py-3 rounded-sm font-bold bg-primary text-primary-foreground shadow-[0_0_20px_rgba(204,0,0,0.3)] hover:shadow-[0_0_30px_rgba(204,0,0,0.5)] transition-all flex items-center gap-2 uppercase tracking-wide text-xs"
              >
                <Plus className="w-4 h-4" /> Add First Stream
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {streams?.map(stream => (
                <StreamCard key={stream.id} stream={stream} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}