import { useState } from "react";
import { useLocation } from "wouter";
import { useGetAccessCodes, useGenerateAccessCode, useDeleteAccessCode, useGetStreams, useLogout } from "@workspace/api-client-react";
import { Plus, Trash2, Shield, Radio, Key, LogOut, CheckCircle2, Copy } from "lucide-react";
import { StreamCard } from "@/components/streams/StreamCard";
import { format } from "date-fns";
import { clsx } from "clsx";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"streams" | "codes">("streams");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const { data: codes, refetch: refetchCodes } = useGetAccessCodes();
  const { data: streams, isLoading: streamsLoading } = useGetStreams({
    query: { refetchInterval: 5000 }
  });

  const generateCode = useGenerateAccessCode({
    mutation: {
      onSuccess: () => refetchCodes()
    }
  });

  const deleteCode = useDeleteAccessCode({
    mutation: {
      onSuccess: () => refetchCodes()
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

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-sidebar border-r border-border p-6 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-white tracking-tight flex items-center gap-2 uppercase">
            <Shield className="w-6 h-6 text-primary" />
            Admin<span className="text-primary">Panel</span>
          </h1>
        </div>

        <nav className="flex-1 space-y-2">
          <button
            onClick={() => setActiveTab("streams")}
            className={clsx(
              "w-full flex items-center gap-3 px-4 py-3 rounded-sm font-bold uppercase tracking-wider transition-all text-xs",
              activeTab === "streams" ? "bg-primary/20 text-primary border-l-2 border-primary" : "text-white/60 hover:bg-white/5 hover:text-white"
            )}
          >
            <Radio className="w-4 h-4" /> Streams
          </button>
          <button
            onClick={() => setActiveTab("codes")}
            className={clsx(
              "w-full flex items-center gap-3 px-4 py-3 rounded-sm font-bold uppercase tracking-wider transition-all text-xs",
              activeTab === "codes" ? "bg-primary/20 text-primary border-l-2 border-primary" : "text-white/60 hover:bg-white/5 hover:text-white"
            )}
          >
            <Key className="w-4 h-4" /> Access Codes
          </button>
        </nav>

        <button
          onClick={() => logoutMutation.mutate()}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-sm font-bold uppercase tracking-wider text-white/60 hover:bg-destructive/10 hover:text-destructive transition-all text-xs"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto">
        {activeTab === "codes" && (
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8 border-b border-border pb-6">
              <div>
                <h2 className="text-3xl font-bold text-white uppercase tracking-wide">Access Codes</h2>
                <p className="text-white/60 mt-1 text-sm font-medium uppercase tracking-widest">Manage user access</p>
              </div>
              <button
                onClick={() => generateCode.mutate()}
                disabled={generateCode.isPending}
                className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-sm shadow-[0_0_15px_rgba(204,0,0,0.3)] hover:shadow-[0_0_25px_rgba(204,0,0,0.5)] transition-all flex items-center gap-2 uppercase tracking-widest text-xs"
              >
                <Plus className="w-4 h-4" /> Generate Code
              </button>
            </div>

            <div className="bg-card border border-border rounded-sm overflow-hidden shadow-xl">
              <table className="w-full text-left">
                <thead className="bg-black/80 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-bold text-white/50 uppercase tracking-widest">Code</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-white/50 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-white/50 uppercase tracking-widest">Created</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-white/50 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {codes?.map(code => (
                    <tr key={code.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <code className="bg-black px-3 py-1.5 rounded-sm text-primary font-mono text-base font-bold border border-border tracking-widest">
                            {code.code}
                          </code>
                          <button 
                            onClick={() => handleCopy(code.code, code.id)}
                            className="p-1.5 rounded-sm hover:bg-white/10 text-white/40 hover:text-white transition-colors border border-transparent hover:border-border"
                            title="Copy code"
                          >
                            {copiedId === code.id ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {code.used ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[10px] font-bold uppercase tracking-widest bg-primary/10 text-primary border border-primary/20">
                            <span className="w-1.5 h-1.5 rounded-sm bg-primary"></span> Used
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[10px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                            <span className="w-1.5 h-1.5 rounded-sm bg-emerald-500 animate-pulse"></span> Available
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-white/60 uppercase">
                        {format(new Date(code.createdAt), 'MMM dd, yyyy HH:mm')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => deleteCode.mutate({ id: code.id })}
                          className="p-2 rounded-sm border border-transparent text-white/40 hover:text-destructive hover:bg-destructive/10 hover:border-destructive/20 transition-all inline-flex"
                          title="Delete Code"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!codes || codes.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-white/40 text-xs font-bold uppercase tracking-widest">
                        No access codes generated.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "streams" && (
          <div className="max-w-7xl mx-auto">
            <div className="mb-8 border-b border-border pb-6">
              <h2 className="text-3xl font-bold text-white mb-1 uppercase tracking-wide">Stream Management</h2>
              <p className="text-white/60 text-sm font-medium uppercase tracking-widest">Monitor active broadcasts</p>
            </div>
            
            {streamsLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="glass-panel rounded-sm h-[340px] animate-pulse bg-white/5" />
                ))}
              </div>
            ) : streams?.length === 0 ? (
              <div className="p-12 text-center border border-border rounded-sm bg-card">
                <Radio className="w-12 h-12 text-white/10 mx-auto mb-4" />
                <p className="text-lg font-bold text-white/60 uppercase tracking-widest">No streams configured</p>
                <p className="text-xs text-white/40 mt-2 uppercase tracking-wider">Users need to create streams from their dashboard.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {streams?.map(stream => (
                  <StreamCard key={stream.id} stream={stream} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}