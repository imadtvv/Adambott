import { useState } from "react";
import { Play, Square, KeyRound, AlertCircle, RefreshCw, Trash2, Edit2, Loader2, Radio, ChevronDown, ChevronUp } from "lucide-react";
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
  const [showError, setShowError] = useState(false);

  const isStreaming = stream.status === "streaming";
  const isError = stream.status === "error";
  const lastError = (stream as any).lastError as string | null;

  const handleStart = () => startStream.mutate({ id: stream.id });
  const handleStop = () => stopStream.mutate({ id: stream.id });
  const handleSwitch = () => switchKey.mutate({ id: stream.id });
  const handleDelete = () => {
    deleteStream.mutate({ id: stream.id });
    setIsDeleteOpen(false);
  };

  return (
    <div className="bg-card border border-border hover:border-primary/50 shadow-lg hover:shadow-[0_0_20px_rgba(204,0,0,0.15)] rounded-sm p-6 flex flex-col relative group transition-all duration-300">
      {/* Decorative top accent line */}
      <div className={clsx(
        "absolute top-0 left-0 right-0 h-1 w-full",
        isStreaming ? "bg-primary shadow-[0_0_10px_rgba(204,0,0,0.8)]" : isError ? "bg-orange-500" : "bg-white/10 group-hover:bg-primary/50"
      )} />

      <div className="flex justify-between items-start mb-6">
        <div className="flex-1 min-w-0 pr-4">
          <h3 className="text-xl font-bold text-white font-display flex items-center gap-2 uppercase tracking-wide truncate">
            {stream.name}
          </h3>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge 
              variant={isStreaming ? "live" : isError ? "error" : "idle"} 
              className="text-[10px] uppercase tracking-widest font-bold"
            >
              {stream.status}
              {isStreaming && <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
            </Badge>
            {stream.copyrightProtection && (
              <span className="px-2 py-0.5 rounded-sm bg-black border border-border text-[10px] uppercase tracking-widest font-bold text-white/50">
                Protected
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-1">
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger asChild>
              <button className="p-2 rounded-sm bg-black border border-transparent hover:border-primary/50 text-white/40 hover:text-white transition-colors" title="Edit">
                <Edit2 className="w-4 h-4" />
              </button>
            </DialogTrigger>
            <DialogContent className="border-primary/30">
              <DialogHeader>
                <DialogTitle className="uppercase tracking-widest text-lg">Edit Stream</DialogTitle>
              </DialogHeader>
              <StreamForm initialData={stream} onSuccess={() => setIsEditOpen(false)} />
            </DialogContent>
          </Dialog>

          <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
            <DialogTrigger asChild>
              <button className="p-2 rounded-sm bg-black border border-transparent hover:border-primary/50 text-white/40 hover:text-primary transition-colors" title="Delete">
                <Trash2 className="w-4 h-4" />
              </button>
            </DialogTrigger>
            <DialogContent className="border-primary/30">
              <DialogHeader>
                <DialogTitle className="text-primary flex items-center gap-2 uppercase tracking-widest text-lg">
                  <AlertCircle className="w-5 h-5" /> Delete Stream
                </DialogTitle>
              </DialogHeader>
              <div className="mt-4">
                <p className="text-white/70 text-sm">Are you sure you want to delete "{stream.name}"? This action cannot be undone.</p>
                <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-border">
                  <button onClick={() => setIsDeleteOpen(false)} className="px-5 py-2.5 rounded-sm text-white/70 hover:text-white bg-black border border-border hover:bg-white/5 transition-colors font-bold uppercase tracking-widest text-[10px]">Cancel</button>
                  <button onClick={handleDelete} className="px-5 py-2.5 rounded-sm bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-[0_0_15px_rgba(204,0,0,0.3)] transition-all uppercase tracking-widest text-[10px]">Delete Forever</button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* FFmpeg Error Display */}
      {isError && lastError && (
        <div className="mb-4 bg-orange-500/5 border border-orange-500/20 rounded-sm overflow-hidden">
          <button
            onClick={() => setShowError(v => !v)}
            className="w-full flex items-center justify-between px-3 py-2 text-orange-400 hover:bg-orange-500/10 transition-colors"
          >
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
              <AlertCircle className="w-3.5 h-3.5" /> FFmpeg Error
            </div>
            {showError ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {showError && (
            <div className="px-3 pb-3">
              <pre className="text-[10px] text-orange-300/80 whitespace-pre-wrap break-all leading-relaxed max-h-32 overflow-y-auto font-mono">
                {lastError}
              </pre>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3 mb-6 flex-grow">
        <div className="bg-black/50 p-3 border border-border rounded-sm">
          <div className="text-[10px] uppercase tracking-widest font-bold text-white/40 mb-1 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5" /> Source
          </div>
          <div className="font-mono text-xs text-white/80 truncate" title={stream.sourceUrl}>
            {stream.sourceUrl}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-black/50 p-3 border border-border rounded-sm flex flex-col justify-center">
            <div className="text-[10px] uppercase tracking-widest font-bold text-white/40 mb-1 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5" /> Active Key
            </div>
            <div className={clsx(
              "font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-1.5",
              stream.activeKey === 'primary' ? "text-emerald-500" : "text-amber-500"
            )}>
              <span className={clsx("w-1.5 h-1.5 rounded-sm", stream.activeKey === 'primary' ? "bg-emerald-500" : "bg-amber-500")} />
              {stream.activeKey}
            </div>
          </div>
          <div className="bg-black/50 p-3 border border-border rounded-sm flex flex-col justify-center">
            <div className="text-[10px] uppercase tracking-widest font-bold text-white/40 mb-1 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Auto-Switch
            </div>
            <div className="font-mono font-bold text-xs text-white/80 uppercase tracking-wider">
              {stream.copyrightProtection && stream.switchInterval > 0 
                ? `${stream.switchInterval}s` 
                : "Disabled"}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
        {!isStreaming ? (
          <button
            onClick={handleStart}
            disabled={startStream.isPending}
            className="col-span-2 py-3 rounded-sm font-bold bg-white text-black hover:bg-white/80 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 uppercase tracking-widest text-[10px] shadow-[0_0_15px_rgba(255,255,255,0.1)]"
          >
            {startStream.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
            Start Broadcast
          </button>
        ) : (
          <>
            <button
              onClick={handleStop}
              disabled={stopStream.isPending}
              className="py-3 rounded-sm font-bold bg-black text-primary border border-primary hover:bg-primary hover:text-primary-foreground active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 uppercase tracking-widest text-[10px] shadow-[0_0_10px_rgba(204,0,0,0.2)]"
            >
              {stopStream.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4 fill-current" />}
              Stop
            </button>
            <button
              onClick={handleSwitch}
              disabled={switchKey.isPending || !stream.backupStreamKey}
              className="py-3 rounded-sm font-bold bg-black text-white border border-border hover:bg-white/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-30 group uppercase tracking-widest text-[10px]"
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

function Badge({ children, variant, className }: { children: React.ReactNode, variant: 'live' | 'idle' | 'error', className?: string }) {
  const variants = {
    live: "bg-primary/10 text-primary border border-primary/30 shadow-[0_0_10px_rgba(204,0,0,0.2)]",
    idle: "bg-black text-white/50 border border-border",
    error: "bg-orange-500/10 text-orange-500 border border-orange-500/30",
  };
  return (
    <span className={clsx("px-2 py-0.5 rounded-sm flex items-center gap-1.5", variants[variant], className)}>
      {children}
    </span>
  );
}