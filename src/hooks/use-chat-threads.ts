import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ChatThread = Database["public"]["Tables"]["chat_threads"]["Row"];
export type ChatMessage = Database["public"]["Tables"]["chat_messages"]["Row"];

export function useChatThreads(userId: string | undefined) {
  return useQuery({
    queryKey: ["chat_threads", userId],
    enabled: !!userId,
    queryFn: async (): Promise<ChatThread[]> => {
      const { data, error } = await supabase
        .from("chat_threads")
        .select("*")
        .eq("user_id", userId!)
        .order("updated_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useChatMessages(threadId: string | undefined) {
  return useQuery({
    queryKey: ["chat_messages", threadId],
    enabled: !!threadId,
    queryFn: async (): Promise<ChatMessage[]> => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("thread_id", threadId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateThread(userId: string) {
  const qc = useQueryClient();
  return useMutation<ChatThread, Error, string | undefined>({
    mutationFn: async (title) => {
      const { data, error } = await supabase
        .from("chat_threads")
        .insert({ user_id: userId, title: title ?? "New conversation" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat_threads", userId] });
    },
  });
}

export function useDeleteThread(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (threadId: string) => {
      const { error } = await supabase
        .from("chat_threads")
        .delete()
        .eq("id", threadId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat_threads", userId] });
    },
  });
}

export function useRenameThread(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ threadId, title }: { threadId: string; title: string }) => {
      const { error } = await supabase
        .from("chat_threads")
        .update({ title })
        .eq("id", threadId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat_threads", userId] });
    },
  });
}

