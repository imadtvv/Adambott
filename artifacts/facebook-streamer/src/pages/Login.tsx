import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";
import { clsx } from "clsx";

export default function Login() {
  const [code, setCode] = useState("");
  const [, setLocation] = useLocation();
  const [shake, setShake] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  const loginMutation = useLogin({
    mutation: {
      onSuccess: (res) => {
        if (res.token) {
          localStorage.setItem("stream_token", res.token);
          localStorage.setItem("stream_role", res.role);
          if (res.role === "admin") {
            setLocation("/admin");
          } else {
            setLocation("/");
          }
        }
      },
      onError: (err: any) => {
        setShake(true);
        setErrorMsg(err.message || "Invalid access code");
        setTimeout(() => setShake(false), 500);
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setErrorMsg("");
    loginMutation.mutate({ data: { code } });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[80%] bg-primary/20 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(204,0,0,0.03)_50%,transparent_75%,transparent_100%)] bg-[length:250px_250px] pointer-events-none" />
      
      {/* Red diagonal stripe */}
      <div className="absolute top-0 right-0 w-[40vw] h-full bg-primary/5 skew-x-[-15deg] translate-x-20 pointer-events-none border-l border-primary/20" />

      <div className={clsx("relative z-10 w-full max-w-md p-8 bg-card border border-border shadow-2xl rounded-sm", shake && "animate-shake")}>
        <div className="text-center mb-8">
          <h1 className="text-4xl font-display font-bold text-white tracking-tight uppercase">
            Stream<span className="text-primary">Control</span>
          </h1>
          <p className="text-muted-foreground mt-2 text-sm uppercase tracking-widest font-bold">Secure Access Required</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-white/80 mb-2 uppercase tracking-widest">Access Code</label>
            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full bg-black border border-border rounded-sm px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all font-mono tracking-widest text-center text-xl"
              placeholder="••••"
              disabled={loginMutation.isPending}
            />
          </div>

          {errorMsg && (
            <div className="text-center">
              <p className="text-primary text-sm font-bold uppercase tracking-wider">{errorMsg}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loginMutation.isPending || !code.trim()}
            className="w-full py-3 rounded-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(204,0,0,0.3)] hover:shadow-[0_0_30px_rgba(204,0,0,0.5)] uppercase tracking-widest text-sm"
          >
            {loginMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Authenticate"}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-border pt-6">
          <p className="text-xs text-white/40 uppercase tracking-wider font-bold">
            Admin access: contact your administrator
          </p>
        </div>
      </div>
    </div>
  );
}