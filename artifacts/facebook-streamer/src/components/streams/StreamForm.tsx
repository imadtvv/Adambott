import { useState, useEffect } from "react";
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
  rtmpUrl: z.string().url("Must be a valid RTMP URL").default("rtmp://live-api-s.facebook.com:80/rtmp/"),
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
      rtmpUrl: initialData?.rtmpUrl || "rtmp://live-api-s.facebook.com:80/rtmp/",
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
          <label className="text-sm font-medium text-white/80 mb-1.5 block">Stream Title</label>
          <input
            {...form.register("name")}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            placeholder="e.g. Gaming Tournament Live"
          />
          {form.formState.errors.name && (
            <p className="text-destructive text-xs mt-1.5 font-medium">{form.formState.errors.name.message}</p>
          )}
        </div>

        {/* Source URL */}
        <div>
          <label className="text-sm font-medium text-white/80 mb-1.5 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-primary" /> Source Media URL
          </label>
          <input
            {...form.register("sourceUrl")}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            placeholder="http://example.com/live/stream.m3u8"
          />
          {form.formState.errors.sourceUrl && (
            <p className="text-destructive text-xs mt-1.5 font-medium">{form.formState.errors.sourceUrl.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Primary Key */}
          <div>
            <label className="text-sm font-medium text-white/80 mb-1.5 flex items-center gap-2">
              <Key className="w-4 h-4 text-emerald-400" /> Primary Key (FB)
            </label>
            <input
              {...form.register("primaryStreamKey")}
              type="password"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-mono text-sm"
              placeholder="FB-12345..."
            />
            {form.formState.errors.primaryStreamKey && (
              <p className="text-destructive text-xs mt-1.5 font-medium">{form.formState.errors.primaryStreamKey.message}</p>
            )}
          </div>

          {/* Backup Key */}
          <div>
            <label className="text-sm font-medium text-white/80 mb-1.5 flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-400" /> Backup Key (Optional)
            </label>
            <input
              {...form.register("backupStreamKey")}
              type="password"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all font-mono text-sm"
              placeholder="FB-98765..."
            />
          </div>
        </div>

        {/* RTMP URL */}
        <div>
          <label className="text-sm font-medium text-white/80 mb-1.5 flex items-center gap-2">
            <Radio className="w-4 h-4 text-primary" /> Destination RTMP
          </label>
          <input
            {...form.register("rtmpUrl")}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white/70 focus:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono text-sm"
          />
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="flex items-center gap-2 font-medium text-white">
                {copyrightEnabled ? <Shield className="w-5 h-5 text-primary" /> : <ShieldAlert className="w-5 h-5 text-muted-foreground" />}
                Copyright Protection
              </h4>
              <p className="text-sm text-white/50 mt-1">Enable dual-key switching to bypass content detection.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" {...form.register("copyrightProtection")} className="sr-only peer" />
              <div className="w-11 h-6 bg-black/50 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary border border-white/10"></div>
            </label>
          </div>

          <div className={clsx("transition-all overflow-hidden duration-300", copyrightEnabled ? "max-h-24 opacity-100" : "max-h-0 opacity-0")}>
            <div className="pt-2">
              <label className="text-sm font-medium text-white/80 mb-1.5 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Auto-Switch Interval (seconds)
              </label>
              <div className="flex items-center gap-3">
                <input
                  {...form.register("switchInterval")}
                  type="number"
                  className="w-32 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  placeholder="0"
                />
                <span className="text-xs text-white/40">Set to 0 for manual switching only. Recommended: 300s (5m).</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-2 flex justify-end gap-3">
        <button
          type="button"
          onClick={onSuccess}
          className="px-5 py-2.5 rounded-xl font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 rounded-xl font-semibold bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {initialData ? "Save Changes" : "Create Stream"}
        </button>
      </div>
    </form>
  );
}
