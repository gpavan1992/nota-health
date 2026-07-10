import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Case = Database["public"]["Tables"]["cases"]["Row"];
export type CaseType = Database["public"]["Enums"]["case_type_enum"];
export type CaseMember = Database["public"]["Tables"]["case_members"]["Row"];
export type CaseDocument = Database["public"]["Tables"]["case_documents"]["Row"];

export type CaseListItem = Case & {
  member_count: number;
  document_count: number;
  conversation_count: number;
};

export const CASE_TYPES: { value: CaseType; label: string }[] = [
  { value: "patient", label: "Patient Case" },
  { value: "department", label: "Department" },
  { value: "research", label: "Research" },
  { value: "general", label: "General" },
];

export function caseTypeLabel(t: CaseType) {
  return CASE_TYPES.find((x) => x.value === t)?.label ?? t;
}

async function fetchCasesWithCounts(): Promise<CaseListItem[]> {
  // RLS scopes rows to owner + members.
  const { data: rows, error } = await supabase
    .from("cases")
    .select(
      `
      *,
      case_members(count),
      case_documents(count),
      case_conversations(count)
    `,
    )
    .order("last_activity_at", { ascending: false });
  if (error) throw error;
  return (rows ?? []).map((r) => {
    const membersAgg = r.case_members as unknown as { count: number }[];
    const docsAgg = r.case_documents as unknown as { count: number }[];
    const convosAgg = r.case_conversations as unknown as { count: number }[];
    return {
      id: r.id,
      owner_id: r.owner_id,
      name: r.name,
      case_ref: r.case_ref,
      case_type: r.case_type,
      created_at: r.created_at,
      updated_at: r.updated_at,
      last_activity_at: r.last_activity_at,
      member_count: membersAgg?.[0]?.count ?? 0,
      document_count: docsAgg?.[0]?.count ?? 0,
      conversation_count: convosAgg?.[0]?.count ?? 0,
    };
  });
}

export function useCases() {
  return useQuery({
    queryKey: ["cases"],
    queryFn: fetchCasesWithCounts,
  });
}

export function useCase(caseId: string | undefined) {
  return useQuery({
    queryKey: ["case", caseId],
    enabled: !!caseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cases")
        .select("*")
        .eq("id", caseId as string)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useCaseMembers(caseId: string | undefined) {
  return useQuery({
    queryKey: ["case-members", caseId],
    enabled: !!caseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("case_members")
        .select("*")
        .eq("case_id", caseId as string)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useCaseDocuments(caseId: string | undefined) {
  return useQuery({
    queryKey: ["case-documents", caseId],
    enabled: !!caseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("case_documents")
        .select("*")
        .eq("case_id", caseId as string)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useCaseConversations(caseId: string | undefined) {
  return useQuery({
    queryKey: ["case-conversations", caseId],
    enabled: !!caseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("case_conversations")
        .select("*")
        .eq("case_id", caseId as string)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export type CreateCaseInput = {
  name: string;
  case_ref: string | null;
  case_type: CaseType;
  member_emails: string[];
  document_names: string[];
};

export function useCreateCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCaseInput) => {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (!userId) throw new Error("Not signed in");

      const { data: created, error } = await supabase
        .from("cases")
        .insert({
          owner_id: userId,
          name: input.name.trim(),
          case_ref: input.case_ref?.trim() || null,
          case_type: input.case_type,
        })
        .select()
        .single();
      if (error) throw error;

      const caseId = created.id;

      if (input.member_emails.length) {
        const rows = input.member_emails.map((email) => ({
          case_id: caseId,
          member_email: email.trim().toLowerCase(),
          added_by: userId,
        }));
        const { error: memErr } = await supabase
          .from("case_members")
          .insert(rows);
        if (memErr) throw memErr;
      }

      if (input.document_names.length) {
        const rows = input.document_names.map((name) => ({
          case_id: caseId,
          name: name.trim(),
        }));
        const { error: docErr } = await supabase
          .from("case_documents")
          .insert(rows);
        if (docErr) throw docErr;
      }

      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cases"] });
    },
  });
}

export function useRenameCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      caseId: string;
      name: string;
      case_ref: string | null;
    }) => {
      const { data, error } = await supabase
        .from("cases")
        .update({
          name: input.name.trim(),
          case_ref: input.case_ref?.trim() || null,
        })
        .eq("id", input.caseId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["cases"] });
      qc.invalidateQueries({ queryKey: ["case", vars.caseId] });
    },
  });
}

export function useDeleteCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (caseId: string) => {
      const { error } = await supabase.from("cases").delete().eq("id", caseId);
      if (error) throw error;
      return caseId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cases"] });
    },
  });
}
