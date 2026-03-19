import { Link } from "wouter";
import { AlertCircle, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="glass-panel p-10 rounded-3xl max-w-md w-full text-center relative z-10 border-white/10">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center border border-destructive/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
            <AlertCircle className="w-10 h-10 text-destructive" />
          </div>
        </div>
        
        <h1 className="text-4xl font-display font-bold text-white mb-3">404</h1>
        <p className="text-xl text-white/80 font-medium mb-6">Signal Lost</p>
        <p className="text-sm text-white/50 mb-8 leading-relaxed">
          The transmission you're looking for doesn't exist or has been moved to another frequency.
        </p>
        
        <Link href="/" className="inline-flex items-center justify-center gap-2 px-6 py-3 w-full bg-white text-black rounded-xl font-semibold hover:bg-gray-200 transition-colors shadow-lg shadow-white/10 active:scale-[0.98]">
          <Home className="w-4 h-4" />
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
