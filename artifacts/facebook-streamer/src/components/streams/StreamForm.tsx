import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { clsx } from "clsx";
import { Shield, ShieldAlert, Link2, Key, Radio, Clock, Loader2 } from "lucide-react";
import { useStreamMutations } from "@/hooks/use-stream-mutations";
import { Stream } from "@workspace/api-client-react";

const formSchema = z.object({
  name: z.string().min(1, "Stream name is required"),
  sourceUrl: z.string().url("Must be a valid URL (e.g. http://.../stream.m3u8)"),
  primaryStreamKey: z.string().min(5, "Primary stream key is required"),
  backupStreamKey: z.string().optional(),
  rtmpsUrl: z.string().url("Must be a valid RTMPS URL").default("rtmps://live-api-s.facebook.com:443/rtmp/"),
  switchInterval: z.coerce.number().min(0, "Interval must be 0 or greater").default(0),
  copyrightProtection: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

interface StreamFormProps {
  initialData?: Stream | null;
  onSuccess: () => void;
}

export function StreamForm({ initialData, onSuccess }: StreamFormProps) {
  const { createStream, updateStream } = useStreamMutations();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      sourceUrl: initialData?.sourceUrl || "",
      primaryStreamKey: initialData?.primaryStreamKey || "",
      backupStreamKey: initialData?.backupStreamKey || "",
      rtmpsUrl: initialData?.rtmpsUrl || "rtmps://live-api-s.facebook.com:443/rtmp/",
      switchInterval: initialData?.switchInterval || 0,
      copyrightProtection: initialData?.copyrightProtection ?? true,
    },
  });

  const copyrightEnabled = form.watch("copyrightProtection");
  const isPending = createStream.isPending || updateStream.isPending;

  const onSubmit = (data: FormValues) => {
    if (initialData) {
      updateStream.mutate({ id: initialData.id, data }, { onSuccess });
    } else {
      createStream.mutate({ data }, { onSuccess });
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className="text-xs font-bold text-white/80 mb-2 block uppercase tracking-widest">Stream Title</label>
          <input
            {...form.register("name")}
            className="w-full bg-black border border-border rounded-sm px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
            placeholder="e.g. Gaming Tournament Live"
          />
          {form.formState.errors.name && (
            <p className="text-primary text-[10px] uppercase tracking-wider mt-1.5 font-bold">{form.formState.errors.name.message}</p>
          )}
        </div>

        {/* Source URL */}
        <div>
          <label className="text-xs font-bold text-white/80 mb-2 flex items-center gap-2 uppercase tracking-widest">
            <Link2 className="w-4 h-4 text-primary" /> Source Media URL
          </label>
          <input
            {...form.register("sourceUrl")}
            className="w-full bg-black border border-border rounded-sm px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all font-mono text-sm"
            placeholder="http://example.com/live/stream.m3u8"
          />
          {form.formState.errors.sourceUrl && (
            <p className="text-primary text-[10px] uppercase tracking-wider mt-1.5 font-bold">{form.formState.errors.sourceUrl.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Primary Key */}
          <div>
            <label className="text-xs font-bold text-white/80 mb-2 flex items-center gap-2 uppercase tracking-widest">
              <Key className="w-4 h-4 text-emerald-500" /> Primary Key (FB)
            </label>
            <input
              {...form.register("primaryStreamKey")}
              type="password"
              className="w-full bg-black border border-border rounded-sm px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-mono text-sm"
              placeholder="FB-12345..."
            />
            {form.formState.errors.primaryStreamKey && (
              <p className="text-primary text-[10px] uppercase tracking-wider mt-1.5 font-bold">{form.formState.errors.primaryStreamKey.message}</p>
            )}
          </div>

          {/* Backup Key */}
          <div>
            <label className="text-xs font-bold text-white/80 mb-2 flex items-center gap-2 uppercase tracking-widest">
              <Key className="w-4 h-4 text-amber-500" /> Backup Key (Optional)
            </label>
            <input
              {...form.register("backupStreamKey")}
              type="password"
              className="w-full bg-black border border-border rounded-sm px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all font-mono text-sm"
              placeholder="FB-98765..."
            />
          </div>
        </div>

        {/* RTMPS URL */}
        <div>
          <label className="text-xs font-bold text-white/80 mb-2 flex items-center gap-2 uppercase tracking-widest">
            <Radio className="w-4 h-4 text-primary" /> Destination RTMPS URL
          </label>
          <input
            {...form.register("rtmpsUrl")}
            className="w-full bg-black border border-border rounded-sm px-4 py-3 text-white/70 focus:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono text-sm"
          />
        </div>

        <div className="bg-black/50 border border-border rounded-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="flex items-center gap-2 font-bold text-white uppercase tracking-widest text-xs">
                {copyrightEnabled ? <Shield className="w-4 h-4 text-primary" /> : <ShieldAlert className="w-4 h-4 text-muted-foreground" />}
                Copyright Protection
              </h4>
              <p className="text-[10px] text-white/50 mt-1 uppercase tracking-wider font-bold">Enable dual-key switching to bypass detection.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" {...form.register("copyrightProtection")} className="sr-only peer" />
              <div className="w-11 h-6 bg-black border border-border peer-focus:outline-none rounded-sm peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-sm after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className={clsx("transition-all overflow-hidden duration-300", copyrightEnabled ? "max-h-24 opacity-100" : "max-h-0 opacity-0")}>
            <div className="pt-2">
              <label className="text-[10px] font-bold text-white/80 mb-2 flex items-center gap-2 uppercase tracking-widest">
                <Clock className="w-3.5 h-3.5" /> Auto-Switch Interval (seconds)
              </label>
              <div className="flex items-center gap-3">
                <input
                  {...form.register("switchInterval")}
                  type="number"
                  className="w-32 bg-black border border-border rounded-sm px-4 py-2 text-white font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
                  placeholder="0"
                />
                <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Set to 0 for manual switching. Recommended: 300s.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-6 flex justify-end gap-3 border-t border-border">
        <button
          type="button"
          onClick={onSuccess}
          className="px-5 py-2.5 rounded-sm font-bold text-white/70 hover:text-white hover:bg-white/5 transition-colors uppercase tracking-widest text-[10px] border border-transparent hover:border-border"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 rounded-sm font-bold bg-primary text-primary-foreground shadow-[0_0_15px_rgba(204,0,0,0.2)] hover:shadow-[0_0_25px_rgba(204,0,0,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 uppercase tracking-widest text-[10px]"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {initialData ? "Save Changes" : "Create Stream"}
        </button>
      </div>
    </form>
  );
}