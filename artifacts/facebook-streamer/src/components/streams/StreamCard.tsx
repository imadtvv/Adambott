import { useState } from "react";
import { Play, Square, KeyRound, AlertCircle, RefreshCw, Trash2, Edit2, Loader2, Radio } from "lucide-react";
import { Stream } from "@workspace/api-client-react";
import { useStreamMutations } from "@/hooks/use-stream-mutations";
import { clsx } from "clsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/polished-modal";
import { StreamForm } from "./StreamForm";

interface StreamCardProps {
  stream: Stream;
}

export function StreamCard({ stream }: StreamCardProps) {
  const { startStream, stopStream, switchKey, deleteStream } = useStreamMutations();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const isStreaming = stream.status === "streaming";
  const isError = stream.status === "error";

  const handleStart = () => startStream.mutate({ id: stream.id });
  const handleStop = () => stopStream.mutate({ id: stream.id });
  const handleSwitch = () => switchKey.mutate({ id: stream.id });
  const handleDelete = () => {
    deleteStream.mutate({ id: stream.id });
    setIsDeleteOpen(false);
  };

  return (
    <div className="glass-panel glass-panel-hover rounded-2xl p-6 flex flex-col relative overflow-hidden group">
      {/* Decorative background glow based on status */}
      <div className={clsx(
        "absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors duration-1000",
        isStreaming ? "bg-red-500" : isError ? "bg-orange-500" : "bg-primary"
      )} />

      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
          <h3 className="text-xl font-bold text-white font-display flex items-center gap-2">
            {stream.name}
            {isStreaming && (
              <span className="relative flex h-3 w-3 ml-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <Badge 
              variant={isStreaming ? "live" : isError ? "error" : "idle"} 
              className="text-[10px] uppercase tracking-wider font-bold"
            >
              {stream.status}
            </Badge>
            {stream.copyrightProtection && (
              <Badge variant="ghost" className="text-[10px] uppercase tracking-wider font-bold bg-white/5 text-primary border-primary/20">
                Protected
              </Badge>
            )}
          </div>
        </div>

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger asChild>
              <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                <Edit2 className="w-4 h-4" />
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Stream</DialogTitle>
              </DialogHeader>
              <StreamForm initialData={stream} onSuccess={() => setIsEditOpen(false)} />
            </DialogContent>
          </Dialog>

          <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
            <DialogTrigger asChild>
              <button className="p-2 rounded-lg bg-white/5 hover:bg-destructive/20 text-white/60 hover:text-destructive transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-destructive flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" /> Delete Stream
                </DialogTitle>
              </DialogHeader>
              <div className="mt-4">
                <p className="text-white/70">Are you sure you want to delete "{stream.name}"? This action cannot be undone.</p>
                <div className="mt-6 flex justify-end gap-3">
                  <button onClick={() => setIsDeleteOpen(false)} className="px-4 py-2 rounded-xl text-white/70 hover:bg-white/5 transition-colors font-medium">Cancel</button>
                  <button onClick={handleDelete} className="px-4 py-2 rounded-xl bg-destructive hover:bg-destructive/90 text-white font-medium shadow-lg shadow-destructive/20 transition-all">Delete Forever</button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-3 mb-6 flex-grow relative z-10">
        <div className="bg-black/30 rounded-xl p-3 border border-white/5">
          <div className="text-xs font-medium text-white/40 mb-1 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5" /> Source
          </div>
          <div className="font-mono text-xs text-white/80 truncate" title={stream.sourceUrl}>
            {stream.sourceUrl}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-black/30 rounded-xl p-3 border border-white/5 flex flex-col justify-center">
            <div className="text-xs font-medium text-white/40 mb-1 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5" /> Active Key
            </div>
            <div className={clsx(
              "font-semibold text-sm capitalize flex items-center gap-1.5",
              stream.activeKey === 'primary' ? "text-emerald-400" : "text-amber-400"
            )}>
              <span className={clsx("w-1.5 h-1.5 rounded-full", stream.activeKey === 'primary' ? "bg-emerald-400" : "bg-amber-400")} />
              {stream.activeKey}
            </div>
          </div>
          <div className="bg-black/30 rounded-xl p-3 border border-white/5 flex flex-col justify-center">
            <div className="text-xs font-medium text-white/40 mb-1 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Auto-Switch
            </div>
            <div className="font-semibold text-sm text-white/80">
              {stream.copyrightProtection && stream.switchInterval > 0 
                ? `${stream.switchInterval}s` 
                : "Disabled"}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 relative z-10 pt-4 border-t border-white/5">
        {!isStreaming ? (
          <button
            onClick={handleStart}
            disabled={startStream.isPending}
            className="col-span-2 py-3 rounded-xl font-semibold bg-white text-black hover:bg-gray-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.15)] disabled:opacity-50"
          >
            {startStream.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
            Start Broadcast
          </button>
        ) : (
          <>
            <button
              onClick={handleStop}
              disabled={stopStream.isPending}
              className="py-3 rounded-xl font-semibold bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive hover:text-white active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {stopStream.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4 fill-current" />}
              Stop
            </button>
            <button
              onClick={handleSwitch}
              disabled={switchKey.isPending || !stream.backupStreamKey}
              className="py-3 rounded-xl font-semibold bg-accent/20 text-accent-foreground border border-accent/30 hover:bg-accent hover:text-white active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-30 group"
              title={!stream.backupStreamKey ? "No backup key configured" : "Switch active key"}
            >
              <RefreshCw className={clsx("w-4 h-4", switchKey.isPending ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500")} />
              Switch Key
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Badge({ children, variant, className }: { children: React.ReactNode, variant: 'live' | 'idle' | 'error' | 'ghost', className?: string }) {
  const variants = {
    live: "bg-red-500/10 text-red-500 border border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]",
    idle: "bg-white/5 text-white/60 border border-white/10",
    error: "bg-orange-500/10 text-orange-500 border border-orange-500/20",
    ghost: ""
  };
  return (
    <span className={clsx("px-2.5 py-1 rounded-full flex items-center gap-1.5", variants[variant], className)}>
      {children}
    </span>
  );
}
