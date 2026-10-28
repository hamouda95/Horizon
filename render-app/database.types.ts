export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      bank_accounts: {
        Row: {
          account_type: string
          balance_as_of: string | null
          balance_cents: number | null
          created_at: string
          currency: string
          external_account_id: string
          household_id: string
          id: string
          name: string
          owner_user_id: string
          owner_person_id: string | null
          provider: string
          provider_item_id: string | null
          source_name: string | null
          status: string
          updated_at: string
        }
        Insert: {
          account_type: string
          balance_as_of?: string | null
          balance_cents?: number | null
          created_at?: string
          currency?: string
          external_account_id: string
          household_id: string
          id?: string
          name: string
          owner_user_id: string
          owner_person_id?: string | null
          provider: string
          provider_item_id?: string | null
          source_name?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          account_type?: string
          balance_as_of?: string | null
          balance_cents?: number | null
          created_at?: string
          currency?: string
          external_account_id?: string
          household_id?: string
          id?: string
          name?: string
          owner_user_id?: string
          owner_person_id?: string | null
          provider?: string
          provider_item_id?: string | null
          source_name?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_owner_person_id_fkey"
            columns: ["owner_person_id"]
            isOneToOne: false
            referencedRelation: "household_people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_accounts_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_provider_users: {
        Row: {
          created_at: string
          provider: string
          provider_user_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          provider: string
          provider_user_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          provider?: string
          provider_user_id?: string
          user_id?: string
        }
        Relationships: []
      }
      bank_transactions: {
        Row: {
          amount_cents: number
          bank_account_id: string
          created_at: string
          currency: string
          external_id: string | null
          fingerprint: string
          household_id: string
          id: string
          label: string
          transaction_date: string
          value_date: string | null
          source_metadata: Json
        }
        Insert: {
          amount_cents: number
          bank_account_id: string
          created_at?: string
          currency: string
          external_id?: string | null
          fingerprint: string
          household_id: string
          id?: string
          label: string
          transaction_date: string
          value_date?: string | null
          source_metadata?: Json
        }
        Update: {
          amount_cents?: number
          bank_account_id?: string
          created_at?: string
          currency?: string
          external_id?: string | null
          fingerprint?: string
          household_id?: string
          id?: string
          label?: string
          transaction_date?: string
          value_date?: string | null
          source_metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_account_scope"
            columns: ["bank_account_id", "household_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "bank_transactions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          active: boolean
          created_at: string
          household_id: string
          id: string
          kind: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          household_id: string
          id?: string
          kind: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          household_id?: string
          id?: string
          kind?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      entries: {
        Row: {
          amount_cents: number
          bank_transaction_id: string | null
          category_id: string
          created_at: string
          entry_date: string
          expense_type: string | null
          frequency: string
          household_id: string
          id: string
          income_allocation: string
          kind: string
          label: string
          person_id: string | null
          subcategory_id: string | null
          flow_type: string
        }
        Insert: {
          amount_cents: number
          bank_transaction_id?: string | null
          category_id: string
          created_at?: string
          entry_date: string
          expense_type?: string | null
          frequency?: string
          household_id: string
          id?: string
          income_allocation?: string
          kind: string
          label: string
          person_id?: string | null
          subcategory_id?: string | null
          flow_type?: string
        }
        Update: {
          amount_cents?: number
          bank_transaction_id?: string | null
          category_id?: string
          created_at?: string
          entry_date?: string
          expense_type?: string | null
          frequency?: string
          household_id?: string
          id?: string
          income_allocation?: string
          kind?: string
          label?: string
          person_id?: string | null
          subcategory_id?: string | null
          flow_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "entries_bank_transaction_scope"
            columns: ["bank_transaction_id", "household_id"]
            isOneToOne: false
            referencedRelation: "bank_transactions"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "entries_category_id_household_id_kind_fkey"
            columns: ["category_id", "household_id", "kind"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "household_id", "kind"]
          },
          {
            foreignKeyName: "entries_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entries_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "household_people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_subcategory_fk"
            columns: ["subcategory_id", "category_id", "household_id", "kind"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id", "category_id", "household_id", "kind"]
          },
        ]
      }
      household_documents: {
        Row: {
          created_at: string
          document_type: string
          file_name: string
          file_size_bytes: number
          household_id: string
          id: string
          mime_type: string
          note: string | null
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          document_type: string
          file_name: string
          file_size_bytes: number
          household_id: string
          id?: string
          mime_type: string
          note?: string | null
          storage_path: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          document_type?: string
          file_name?: string
          file_size_bytes?: number
          household_id?: string
          id?: string
          mime_type?: string
          note?: string | null
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_documents_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          created_by: string
          expires_at: string
          household_id: string
          id: string
          invited_email: string | null
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by: string
          expires_at: string
          household_id: string
          id?: string
          invited_email?: string | null
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string
          expires_at?: string
          household_id?: string
          id?: string
          invited_email?: string | null
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_invites_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          household_id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          household_id: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          household_id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_merchant_rules: {
        Row: {
          category_id: string
          created_at: string
          created_by: string | null
          household_id: string
          id: string
          kind: string
          merchant_key: string
          merchant_label: string
          sample_count: number
          subcategory_id: string | null
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          created_by?: string | null
          household_id: string
          id?: string
          kind: string
          merchant_key: string
          merchant_label: string
          sample_count?: number
          subcategory_id?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          created_by?: string | null
          household_id?: string
          id?: string
          kind?: string
          merchant_key?: string
          merchant_label?: string
          sample_count?: number
          subcategory_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_merchant_rules_category_scope_fkey"
            columns: ["category_id", "household_id", "kind"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "household_id", "kind"]
          },
          {
            foreignKeyName: "household_merchant_rules_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_merchant_rules_subcategory_scope_fkey"
            columns: ["subcategory_id", "category_id", "household_id", "kind"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id", "category_id", "household_id", "kind"]
          },
        ]
      }
      household_people: {
        Row: {
          active: boolean
          created_at: string
          household_id: string
          id: string
          is_primary: boolean
          name: string
          relationship: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          household_id: string
          id?: string
          is_primary?: boolean
          name: string
          relationship?: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          household_id?: string
          id?: string
          is_primary?: boolean
          name?: string
          relationship?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "household_people_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_obligations: {
        Row: {
          active: boolean
          amount_cents: number
          category_id: string | null
          created_at: string
          due_day: number
          due_month: number | null
          frequency: string
          household_id: string
          id: string
          note: string | null
          title: string
        }
        Insert: {
          active?: boolean
          amount_cents: number
          category_id?: string | null
          created_at?: string
          due_day: number
          due_month?: number | null
          frequency: string
          household_id: string
          id?: string
          note?: string | null
          title: string
        }
        Update: {
          active?: boolean
          amount_cents?: number
          category_id?: string | null
          created_at?: string
          due_day?: number
          due_month?: number | null
          frequency?: string
          household_id?: string
          id?: string
          note?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_obligations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_obligations_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_savings_goals: {
        Row: {
          created_at: string
          household_id: string
          id: string
          target_cents: number
          target_date: string | null
          title: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          target_cents: number
          target_date?: string | null
          title: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          target_cents?: number
          target_date?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_savings_goals_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          currency: string
          id: string
          name: string
          owner_id: string
          savings_rate_bps: number | null
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          name: string
          owner_id: string
          savings_rate_bps?: number | null
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          name?: string
          owner_id?: string
          savings_rate_bps?: number | null
        }
        Relationships: []
      }
      monthly_budgets: {
        Row: {
          expense_cents: number
          household_id: string
          id: string
          income_cents: number
          month: string
        }
        Insert: {
          expense_cents?: number
          household_id: string
          id?: string
          income_cents?: number
          month: string
        }
        Update: {
          expense_cents?: number
          household_id?: string
          id?: string
          income_cents?: number
          month?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_budgets_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_category_budgets: {
        Row: {
          amount_cents: number
          category_id: string
          created_at: string
          household_id: string
          id: string
          month: string
        }
        Insert: {
          amount_cents: number
          category_id: string
          created_at?: string
          household_id: string
          id?: string
          month: string
        }
        Update: {
          amount_cents?: number
          category_id?: string
          created_at?: string
          household_id?: string
          id?: string
          month?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_category_budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_category_budgets_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      savings_movements: {
        Row: {
          amount_cents: number
          created_at: string
          goal_id: string | null
          household_id: string
          id: string
          movement_date: string
          movement_type: string
          note: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          goal_id?: string | null
          household_id: string
          id?: string
          movement_date: string
          movement_type: string
          note?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          goal_id?: string | null
          household_id?: string
          id?: string
          movement_date?: string
          movement_type?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "savings_movements_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "household_savings_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "savings_movements_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      subcategories: {
        Row: {
          active: boolean
          category_id: string
          household_id: string
          id: string
          kind: string
          name: string
        }
        Insert: {
          active?: boolean
          category_id: string
          household_id: string
          id?: string
          kind: string
          name: string
        }
        Update: {
          active?: boolean
          category_id?: string
          household_id?: string
          id?: string
          kind?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_household_id_kind_fkey"
            columns: ["category_id", "household_id", "kind"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "household_id", "kind"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_household_invite: {
        Args: { p_token: string }
        Returns: {
          household_id: string
          household_name: string
        }[]
      }
      create_household_invite: {
        Args: { p_household_id: string; p_invited_email?: string }
        Returns: {
          expires_at: string
          invite_id: string
          invite_token: string
        }[]
      }
      import_bank_transactions: {
        Args: { p_bank_account_id: string; p_transactions: Json }
        Returns: Json
      }
      delete_bank_data: {
        Args: { p_household_id: string; p_month?: string | null; p_scope?: string; p_bank_account_id?: string | null }
        Returns: Json
      }
      delete_imported_bank_transaction: {
        Args: { p_bank_transaction_id: string }
        Returns: undefined
      }
      list_household_members: {
        Args: { p_household_id: string }
        Returns: {
          email: string
          joined_at: string
          role: string
          user_id: string
        }[]
      }
      remove_household_member: {
        Args: { p_household_id: string; p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
