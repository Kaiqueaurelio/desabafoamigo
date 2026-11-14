import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Contracts from checked-in migrations, not a claim that they are deployed.
type PendingDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables" | "Functions"> & {
    Tables: Database["public"]["Tables"] & {
      ai_user_memory: {
        Row: { user_id: string; memory_summary: string; expires_at: string; updated_at: string };
        Insert: {
          user_id: string;
          memory_summary: string;
          expires_at: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          memory_summary?: string;
          expires_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Functions: Database["public"]["Functions"] & {
      claim_queue_entry: {
        Args: { _queue_id: string };
        Returns: { user_id: string; appointment_id: string; conversation_id: string }[];
      };
    };
  };
};

// Preserve the authenticated client and RLS; unavailable migrations still fail normally.
export function withPendingDatabaseTypes(client: SupabaseClient<Database>) {
  return client as unknown as SupabaseClient<PendingDatabase>;
}
