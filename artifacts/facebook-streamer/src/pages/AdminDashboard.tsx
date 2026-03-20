import { useState } from "react";
import { useLocation } from "wouter";
import { useGetAccessCodes, useGenerateAccessCode, useDeleteAccessCode, useGetStreams, useLogout } from "@workspace/api-client-react";
import { Plus, Trash2, Shield, Radio, Key, LogOut, CheckCircle2, Copy, Clock, Users, X, AlertTriangle } from "lucide-react";
import { StreamCard } from "@/components/streams/StreamCard";
import { StreamForm } from "@/components/streams/StreamForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/polished-modal";
import { format, isPast, parseISO } from "date-fns";
import { clsx } from "clsx";

function getCodeStatus(code: { used: boolean; useCount: number; maxUses: number; expiresAt: string | null }) {
  const isExpired = code.expiresAt && isPast(parseISO(code.expiresAt));
  if (isExpired) return { label: "Expired", color: "text-orange-400 bg-orange-400/10 border-orange-400/20", dot: "bg-orange-400" };
  if (code.useCount >= code.maxUses) return { label: "Exhausted", color: "text-primary bg-primary/10 border-primary/20", dot: "bg-primary" };
  if (code.useCount > 0) return { label: `${code.useCount}/${code.maxUses} Used`, color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20", dot: "bg-yellow-400 animate-pulse" };
  return { label: `Available`, color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", dot: "bg-emerald-400 animate-pulse" };
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"streams" | "codes">("codes");
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showNewStream, setShowNewStream] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Form state for generate code
  const [maxUses, setMaxUses] = useState(1);
  const [expiryEnabled, setExpiryEnabled] = useState(false);
  const [expiryDate, setExpiryDate] = useState("");

  const { data: codes, refetch: refetchCodes } = useGetAccessCodes();
  const { data: streams, isLoading: streamsLoading, refetch: refetchStreams } = useGetStreams({
    query: { refetchInterval: 5000 }
  });

  const generateCode = useGenerateAccessCode({
    mutation: {
      onSuccess: () => { refetchCodes(); setShowGenerateModal(false); setMaxUses(1); setExpiryEnabled(false); setExpiryDate(""); }
    }
  });

  const deleteCode = useDeleteAccessCode({
    mutation: {
      onSuccess: () => { refetchCodes(); setDeleteConfirm(null); }
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

  const handleCopy = (code: string, id: number) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleGenerate = () => {
    generateCode.mutate({
      data: {
        maxUses,
        expiresAt: expiryEnabled && expiryDate ? new Date(expiryDate).toISOString() : null,
      }
    });
  };

  const activeCount = streams?.filter(s => s.status === "streaming").length ?? 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-sidebar border-r border-border p-6 flex flex-col gap-6 shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-white tracking-tight uppercase">
              Stream<span className="text-primary">Control</span>
            </h1>
          </div>
          <p className="text-[10px] text-white/30 uppercase tracking-widest pl-7">Admin Panel</p>
        </div>

        <nav className="flex-1 space-y-1">
          <button
            onClick={() => setActiveTab("codes")}
            className={clsx(
              "w-full flex items-center gap-3 px-4 py-3 rounded-sm font-bold uppercase tracking-wider transition-all text-xs",
              activeTab === "codes" ? "bg-primary/20 text-primary border-l-2 border-primary" : "text-white/50 hover:bg-white/5 hover:text-white"
            )}
          >
            <Key className="w-4 h-4" /> Access Codes
            {codes && <span className="ml-auto text-[10px] bg-white/10 rounded-sm px-1.5 py-0.5">{codes.length}</span>}
          </button>
          <button
            onClick={() => setActiveTab("streams")}
            className={clsx(
              "w-full flex items-center gap-3 px-4 py-3 rounded-sm font-bold uppercase tracking-wider transition-all text-xs",
              activeTab === "streams" ? "bg-primary/20 text-primary border-l-2 border-primary" : "text-white/50 hover:bg-white/5 hover:text-white"
            )}
          >
            <Radio className="w-4 h-4" /> Streams
            {activeCount > 0 && <span className="ml-auto text-[10px] bg-primary/20 text-primary rounded-sm px-1.5 py-0.5">{activeCount} LIVE</span>}
          </button>
        </nav>

        <button
          onClick={() => logoutMutation.mutate()}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-sm font-bold uppercase tracking-wider text-white/40 hover:bg-destructive/10 hover:text-destructive transition-all text-xs"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8 overflow-auto">

        {/* ─── ACCESS CODES TAB ─── */}
        {activeTab === "codes" && (
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8 border-b border-border pb-6">
              <div>
                <h2 className="text-2xl font-bold text-white uppercase tracking-wide">Access Codes</h2>
                <p className="text-white/40 mt-1 text-xs font-medium uppercase tracking-widest">Generate & manage user access</p>
              </div>
              <button
                onClick={() => setShowGenerateModal(true)}
                className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold rounded-sm shadow-[0_0_20px_rgba(204,0,0,0.3)] hover:shadow-[0_0_30px_rgba(204,0,0,0.5)] transition-all flex items-center gap-2 uppercase tracking-widest text-xs"
              >
                <Plus className="w-4 h-4" /> Generate Code
              </button>
            </div>

            {/* Table */}
            <div className="bg-card border border-border rounded-sm overflow-hidden shadow-2xl">
              <table className="w-full text-left">
                <thead className="bg-black/80 border-b border-border">
                  <tr>
                    <th className="px-5 py-4 text-[10px] font-bold text-white/40 uppercase tracking-widest">Code</th>
                    <th className="px-5 py-4 text-[10px] font-bold text-white/40 uppercase tracking-widest">Status</th>
                    <th className="px-5 py-4 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Uses</span>
                    </th>
                    <th className="px-5 py-4 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Expires</span>
                    </th>
                    <th className="px-5 py-4 text-[10px] font-bold text-white/40 uppercase tracking-widest">Created</th>
                    <th className="px-5 py-4 text-[10px] font-bold text-white/40 uppercase tracking-widest text-right">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {codes?.map(code => {
                    const status = getCodeStatus(code);
                    return (
                      <tr key={code.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <code className="bg-black px-3 py-1.5 rounded-sm text-primary font-mono text-sm font-bold border border-border tracking-widest">
                              {code.code}
                            </code>
                            <button
                              onClick={() => handleCopy(code.code, code.id)}
                              className="p-1.5 rounded-sm hover:bg-white/10 text-white/30 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                              title="Copy"
                            >
                              {copiedId === code.id
                                ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={clsx("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[10px] font-bold uppercase tracking-widest border", status.color)}>
                            <span className={clsx("w-1.5 h-1.5 rounded-full", status.dot)}></span>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${Math.min(100, (code.useCount / code.maxUses) * 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono text-white/60">{code.useCount}/{code.maxUses}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-xs font-mono text-white/50">
                          {code.expiresAt
                            ? <span className={clsx(isPast(parseISO(code.expiresAt)) ? "text-orange-400" : "text-white/60")}>
                                {format(parseISO(code.expiresAt), 'MMM dd, yyyy HH:mm')}
                              </span>
                            : <span className="text-white/20">Never</span>
                          }
                        </td>
                        <td className="px-5 py-4 text-xs font-mono text-white/40">
                          {format(new Date(code.createdAt), 'MMM dd, yyyy')}
                        </td>
                        <td className="px-5 py-4 text-right">
                          {deleteConfirm === code.id ? (
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-[10px] text-white/50 uppercase">Sure?</span>
                              <button
                                onClick={() => deleteCode.mutate({ id: code.id })}
                                className="px-2 py-1 rounded-sm bg-destructive text-white text-[10px] font-bold uppercase hover:bg-destructive/80 transition-colors"
                              >Yes</button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="p-1 rounded-sm text-white/40 hover:text-white transition-colors"
                              ><X className="w-3.5 h-3.5" /></button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(code.id)}
                              className="p-2 rounded-sm border border-transparent text-white/30 hover:text-destructive hover:bg-destructive/10 hover:border-destructive/20 transition-all inline-flex opacity-0 group-hover:opacity-100"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {(!codes || codes.length === 0) && (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center text-white/30 text-xs font-bold uppercase tracking-widest">
                        No access codes yet. Generate one above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── STREAMS TAB ─── */}
        {activeTab === "streams" && (
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8 border-b border-border pb-6">
              <div>
                <h2 className="text-2xl font-bold text-white uppercase tracking-wide">Stream Management</h2>
                <p className="text-white/40 mt-1 text-xs font-medium uppercase tracking-widest">
                  {activeCount > 0 ? `${activeCount} live broadcast${activeCount > 1 ? "s" : ""}` : "No active broadcasts"}
                </p>
              </div>
              <Dialog open={showNewStream} onOpenChange={setShowNewStream}>
                <DialogTrigger asChild>
                  <button className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold rounded-sm shadow-[0_0_20px_rgba(204,0,0,0.3)] transition-all flex items-center gap-2 uppercase tracking-widest text-xs">
                    <Plus className="w-4 h-4" /> New Stream
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Create Broadcast</DialogTitle></DialogHeader>
                  <StreamForm onSuccess={() => { setShowNewStream(false); refetchStreams(); }} />
                </DialogContent>
              </Dialog>
            </div>

            {streamsLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => <div key={i} className="rounded-sm h-[340px] animate-pulse bg-white/5 border border-border" />)}
              </div>
            ) : !streams?.length ? (
              <div className="p-12 text-center border border-border rounded-sm bg-card">
                <Radio className="w-12 h-12 text-white/10 mx-auto mb-4" />
                <p className="text-lg font-bold text-white/50 uppercase tracking-widest">No streams configured</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {streams.map(stream => <StreamCard key={stream.id} stream={stream} />)}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ─── GENERATE CODE MODAL ─── */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-sm shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white uppercase tracking-wide">Generate Access Code</h3>
              <button onClick={() => setShowGenerateModal(false)} className="p-1.5 rounded-sm text-white/40 hover:text-white hover:bg-white/10 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Max Uses */}
              <div>
                <label className="block text-xs font-bold text-white/60 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Users className="w-3.5 h-3.5" /> Max Number of Users
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setMaxUses(v => Math.max(1, v - 1))}
                    className="w-10 h-10 rounded-sm bg-black border border-border text-white font-bold text-lg flex items-center justify-center hover:border-primary hover:text-primary transition-colors"
                  >−</button>
                  <div className="flex-1 text-center">
                    <span className="text-3xl font-bold text-primary font-mono">{maxUses}</span>
                    <p className="text-[10px] text-white/30 uppercase tracking-widest mt-0.5">
                      {maxUses === 1 ? "Single use" : `${maxUses} users`}
                    </p>
                  </div>
                  <button
                    onClick={() => setMaxUses(v => Math.min(100, v + 1))}
                    className="w-10 h-10 rounded-sm bg-black border border-border text-white font-bold text-lg flex items-center justify-center hover:border-primary hover:text-primary transition-colors"
                  >+</button>
                </div>
                {/* Quick presets */}
                <div className="flex gap-2 mt-3">
                  {[1, 5, 10, 25, 50].map(n => (
                    <button
                      key={n}
                      onClick={() => setMaxUses(n)}
                      className={clsx(
                        "flex-1 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider border transition-colors",
                        maxUses === n ? "bg-primary/20 border-primary/40 text-primary" : "bg-black border-border text-white/40 hover:text-white hover:border-white/20"
                      )}
                    >{n}</button>
                  ))}
                </div>
              </div>

              {/* Expiry */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-bold text-white/60 uppercase tracking-widest flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" /> Expiry Time
                  </label>
                  <button
                    onClick={() => setExpiryEnabled(v => !v)}
                    className={clsx(
                      "relative w-10 h-5 rounded-full transition-colors border",
                      expiryEnabled ? "bg-primary border-primary/50" : "bg-white/10 border-border"
                    )}
                  >
                    <span className={clsx(
                      "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all",
                      expiryEnabled ? "left-5" : "left-0.5"
                    )} />
                  </button>
                </div>
                {expiryEnabled ? (
                  <input
                    type="datetime-local"
                    value={expiryDate}
                    onChange={e => setExpiryDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full px-4 py-2.5 bg-black border border-border rounded-sm text-white text-sm font-mono focus:outline-none focus:border-primary transition-colors"
                  />
                ) : (
                  <div className="px-4 py-2.5 bg-black/40 border border-border/50 rounded-sm text-white/30 text-xs uppercase tracking-wider">
                    Never expires
                  </div>
                )}
              </div>

              {/* Warning for multi-use */}
              {maxUses > 1 && (
                <div className="flex items-start gap-2.5 p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-sm">
                  <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-500/80">
                    This code can be used by <strong>{maxUses} different users</strong>. Share it carefully.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowGenerateModal(false)}
                  className="flex-1 py-2.5 rounded-sm border border-border text-white/60 hover:text-white hover:bg-white/5 font-bold uppercase tracking-widest text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={generateCode.isPending || (expiryEnabled && !expiryDate)}
                  className="flex-1 py-2.5 rounded-sm bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-widest text-xs transition-all shadow-[0_0_20px_rgba(204,0,0,0.3)] hover:shadow-[0_0_30px_rgba(204,0,0,0.5)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {generateCode.isPending ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : <Plus className="w-4 h-4" />}
                  Generate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
