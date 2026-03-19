import { useState } from "react";
import { useGetStreams } from "@workspace/api-client-react";
import { Plus, Info, Activity, Radio as RadioIcon, ShieldCheck } from "lucide-react";
import { StreamCard } from "@/components/streams/StreamCard";
import { StreamForm } from "@/components/streams/StreamForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/polished-modal";
import { clsx } from "clsx";

export default function Dashboard() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  
  // Poll every 3 seconds if there are streams
  const { data: streams, isLoading, error } = useGetStreams({
    query: {
      refetchInterval: (query) => {
        const hasActive = query.state.data?.some(s => s.status === 'streaming');
        return hasActive ? 3000 : 10000; // Poll faster if something is streaming
      }
    }
  });

  const activeCount = streams?.filter(s => s.status === 'streaming').length || 0;

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden pb-20">
      {/* Background Hero Image/Gradient Setup */}
      <div className="absolute top-0 left-0 w-full h-[50vh] z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background z-10" />
        <img 
          src={`${import.meta.env.BASE_URL}images/dashboard-hero-bg.png`} 
          alt="Hero background" 
          className="w-full h-full object-cover opacity-30 mix-blend-screen"
        />
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[80%] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute top-[10%] right-[-10%] w-[40%] h-[60%] rounded-full bg-accent/20 blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 relative z-10">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-white/80 mb-4 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                {activeCount > 0 ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white/40"></span>
                )}
              </span>
              {activeCount} Active Broadcasts
            </div>
            <h1 className="text-5xl md:text-6xl font-display font-bold text-white tracking-tight leading-tight">
              Stream<span className="text-gradient-primary">Control</span>
            </h1>
            <p className="mt-3 text-lg text-white/60 max-w-xl">
              Professional Facebook Live bot with integrated copyright bypass. Seamlessly manage multiple feeds.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Dialog open={isInfoOpen} onOpenChange={setIsInfoOpen}>
              <DialogTrigger asChild>
                <button className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all flex items-center gap-2 font-medium backdrop-blur-md">
                  <Info className="w-5 h-5" /> How it Works
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2"><ShieldCheck className="text-primary w-6 h-6" /> Copyright Bypass System</DialogTitle>
                </DialogHeader>
                <div className="mt-6 space-y-6 text-white/80">
                  <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl flex gap-4">
                    <Activity className="w-8 h-8 text-primary flex-shrink-0" />
                    <p className="text-sm leading-relaxed text-white/90">
                      Facebook's automated copyright detection flags streams based on continuous matching of audio/video signatures against their database.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-white font-semibold text-lg font-display">The Solution: Dual-Key Switching</h4>
                    <p className="text-sm leading-relaxed">
                      By configuring a <strong>Primary</strong> and <strong>Backup</strong> stream key, the bot can seamlessly switch the active RTMP destination mid-broadcast.
                    </p>
                    <ul className="list-disc pl-5 space-y-2 text-sm text-white/70">
                      <li>The bot routes your source media to the Active Key.</li>
                      <li>When a switch occurs, the stream momentarily flips to the Backup Key.</li>
                      <li>This brief interruption breaks the continuous matching algorithm of the detection bots.</li>
                      <li>Viewers experience a momentary buffer, but the stream remains live and avoids takedowns.</li>
                    </ul>
                  </div>
                  <div className="bg-black/50 p-4 rounded-xl text-xs font-mono text-white/50 border border-white/5">
                    Recommended auto-switch interval: 180 - 300 seconds.
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <button className="px-5 py-3 rounded-xl bg-white text-black hover:bg-gray-200 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 font-semibold shadow-xl shadow-white/10">
                  <Plus className="w-5 h-5" /> New Stream
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Broadcast</DialogTitle>
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
                <div key={i} className="glass-panel rounded-2xl h-[340px] animate-pulse bg-white/5" />
              ))}
            </div>
          ) : error ? (
            <div className="p-8 rounded-2xl bg-destructive/10 border border-destructive/20 text-center">
              <h3 className="text-destructive font-semibold text-lg">Failed to load streams</h3>
              <p className="text-white/60 mt-2">Please check your connection and try again.</p>
            </div>
          ) : streams?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center relative">
              <div className="relative w-64 h-64 mb-8 animate-float">
                <div className="absolute inset-0 bg-primary/20 blur-[50px] rounded-full" />
                <img 
                  src={`${import.meta.env.BASE_URL}images/empty-state.png`} 
                  alt="No streams yet" 
                  className="w-full h-full object-contain relative z-10 drop-shadow-2xl"
                />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2 font-display">No streams configured</h3>
              <p className="text-white/50 max-w-md mx-auto mb-8">
                Add your first stream source and configure your Facebook Live keys to begin broadcasting.
              </p>
              <button 
                onClick={() => setIsCreateOpen(true)}
                className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all flex items-center gap-2"
              >
                <Plus className="w-5 h-5" /> Add First Stream
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
