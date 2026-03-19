import { useQueryClient } from "@tanstack/react-query";
import { 
  useCreateStream as useGenCreateStream,
  useUpdateStream as useGenUpdateStream,
  useDeleteStream as useGenDeleteStream,
  useStartStream as useGenStartStream,
  useStopStream as useGenStopStream,
  useSwitchStreamKey as useGenSwitchStreamKey,
  getGetStreamsQueryKey,
  getGetStreamQueryKey,
  getGetStreamStatusQueryKey
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export function useStreamMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidateLists = () => {
    queryClient.invalidateQueries({ queryKey: getGetStreamsQueryKey() });
  };

  const invalidateItem = (id: number) => {
    queryClient.invalidateQueries({ queryKey: getGetStreamQueryKey(id) });
    queryClient.invalidateQueries({ queryKey: getGetStreamStatusQueryKey(id) });
    invalidateLists();
  };

  const createStream = useGenCreateStream({
    mutation: {
      onSuccess: () => {
        toast({ title: "Stream created successfully" });
        invalidateLists();
      },
      onError: (error: any) => {
        toast({ 
          title: "Failed to create stream", 
          description: error?.message || "An unexpected error occurred",
          variant: "destructive"
        });
      }
    }
  });

  const updateStream = useGenUpdateStream({
    mutation: {
      onSuccess: (_, variables) => {
        toast({ title: "Stream updated successfully" });
        invalidateItem(variables.id);
      },
      onError: (error: any) => {
        toast({ 
          title: "Failed to update stream", 
          description: error?.message || "An unexpected error occurred",
          variant: "destructive"
        });
      }
    }
  });

  const deleteStream = useGenDeleteStream({
    mutation: {
      onSuccess: () => {
        toast({ title: "Stream deleted successfully" });
        invalidateLists();
      },
      onError: (error: any) => {
        toast({ 
          title: "Failed to delete stream", 
          description: error?.message || "An unexpected error occurred",
          variant: "destructive"
        });
      }
    }
  });

  const startStream = useGenStartStream({
    mutation: {
      onSuccess: (_, variables) => {
        toast({ title: "Stream broadcast started", className: "bg-emerald-600 text-white border-none" });
        invalidateItem(variables.id);
      },
      onError: (error: any) => {
        toast({ 
          title: "Failed to start stream", 
          description: error?.message || "Verify your URLs and keys.",
          variant: "destructive"
        });
      }
    }
  });

  const stopStream = useGenStopStream({
    mutation: {
      onSuccess: (_, variables) => {
        toast({ title: "Stream broadcast stopped" });
        invalidateItem(variables.id);
      },
      onError: (error: any) => {
        toast({ 
          title: "Failed to stop stream", 
          variant: "destructive"
        });
      }
    }
  });

  const switchKey = useGenSwitchStreamKey({
    mutation: {
      onSuccess: (_, variables) => {
        toast({ 
          title: "Stream Key Switched", 
          description: "Successfully transitioned to alternate key to bypass detection.",
          className: "bg-accent text-white border-none"
        });
        invalidateItem(variables.id);
      },
      onError: (error: any) => {
        toast({ 
          title: "Failed to switch key", 
          variant: "destructive"
        });
      }
    }
  });

  return {
    createStream,
    updateStream,
    deleteStream,
    startStream,
    stopStream,
    switchKey
  };
}
