// Hand-written to match supabase/migrations/*.sql. Once the project is
// linked, regenerate with:
//   npx supabase gen types typescript --linked > lib/supabase/types.ts

export type TransactionType = "expense" | "income" | "transfer";
export type TransactionStatus = "recorded" | "reconciled";
export type AccountType = "bank_account" | "wallet" | "credit_card";
export type PaymentModeKind = "upi" | "cheque" | "internet_banking" | "debit_card";
export type UserRole = "admin" | "member";
export type ToolId = "ledger" | "tasks";
export type TaskStatus = "todo" | "in_progress" | "done";
export type SprintStatus = "upcoming" | "active" | "closed";
export type TaskType = "bug" | "new_requirement" | "enhancement" | "other";
export type TaskPriority = "low" | "medium" | "high" | "critical";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          role: UserRole;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
          email: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      accounts: {
        Row: {
          id: string;
          name: string;
          account_type: AccountType;
          opening_balance: number;
          is_default: boolean;
          is_archived: boolean;
          sort_order: number;
          created_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["accounts"]["Row"]> & {
          name: string;
          account_type: AccountType;
        };
        Update: Partial<Database["public"]["Tables"]["accounts"]["Row"]>;
        Relationships: [];
      };
      payment_modes: {
        Row: {
          id: string;
          account_id: string;
          name: string;
          kind: PaymentModeKind;
          is_archived: boolean;
          sort_order: number;
          created_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["payment_modes"]["Row"]> & {
          account_id: string;
          name: string;
          kind: PaymentModeKind;
        };
        Update: Partial<Database["public"]["Tables"]["payment_modes"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "payment_modes_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          icon: string;
          sort_order: number;
          is_archived: boolean;
        };
        Insert: Partial<Database["public"]["Tables"]["categories"]["Row"]> & {
          name: string;
          icon: string;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Row"]>;
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          name: string;
          created_by: string | null;
          is_archived: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["projects"]["Row"]> & {
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["projects"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      tags: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["tags"]["Row"]> & {
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["tags"]["Row"]>;
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          transaction_type: TransactionType;
          amount: number;
          currency: string;
          date_time: string;
          created_at: string;
          created_by: string;
          category_id: string | null;
          project_id: string | null;
          account_id: string;
          destination_account_id: string | null;
          payment_mode_id: string | null;
          status: TransactionStatus;
          notes: string | null;
          description: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["transactions"]["Row"]> & {
          transaction_type: TransactionType;
          amount: number;
          date_time: string;
          account_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["transactions"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "transactions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_destination_account_id_fkey";
            columns: ["destination_account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_payment_mode_id_fkey";
            columns: ["payment_mode_id"];
            isOneToOne: false;
            referencedRelation: "payment_modes";
            referencedColumns: ["id"];
          },
        ];
      };
      transaction_tags: {
        Row: {
          transaction_id: string;
          tag_id: string;
        };
        Insert: Database["public"]["Tables"]["transaction_tags"]["Row"];
        Update: Partial<Database["public"]["Tables"]["transaction_tags"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "transaction_tags_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transaction_tags_tag_id_fkey";
            columns: ["tag_id"];
            isOneToOne: false;
            referencedRelation: "tags";
            referencedColumns: ["id"];
          },
        ];
      };
      receipts: {
        Row: {
          id: string;
          transaction_id: string;
          storage_path: string;
          file_name: string | null;
          content_type: string | null;
          size_bytes: number | null;
          uploaded_by: string | null;
          uploaded_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["receipts"]["Row"]> & {
          transaction_id: string;
          storage_path: string;
        };
        Update: Partial<Database["public"]["Tables"]["receipts"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "receipts_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "receipts_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      allowed_emails: {
        Row: {
          email: string;
          note: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["allowed_emails"]["Row"]> & {
          email: string;
        };
        Update: Partial<Database["public"]["Tables"]["allowed_emails"]["Row"]>;
        Relationships: [];
      };
      user_tool_access: {
        Row: {
          user_id: string;
          tool: ToolId;
          granted_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["user_tool_access"]["Row"]> & {
          user_id: string;
          tool: ToolId;
        };
        Update: Partial<Database["public"]["Tables"]["user_tool_access"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "user_tool_access_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      task_projects: {
        Row: {
          id: string;
          name: string;
          key_prefix: string;
          avatar_path: string | null;
          next_task_number: number;
          created_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["task_projects"]["Row"]> & {
          name: string;
          key_prefix: string;
        };
        Update: Partial<Database["public"]["Tables"]["task_projects"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "task_projects_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      task_project_members: {
        Row: {
          project_id: string;
          user_id: string;
          added_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["task_project_members"]["Row"]> & {
          project_id: string;
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["task_project_members"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "task_project_members_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "task_projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_project_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      tasks: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          assignee_id: string | null;
          sprint_id: string | null;
          title: string;
          description: string | null;
          due_at: string | null;
          status: TaskStatus;
          task_type: TaskType;
          priority: TaskPriority;
          number: number;
          completed_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["tasks"]["Row"]> & {
          project_id: string;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["tasks"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "task_projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_assignee_id_fkey";
            columns: ["assignee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_sprint_id_fkey";
            columns: ["sprint_id"];
            isOneToOne: false;
            referencedRelation: "sprints";
            referencedColumns: ["id"];
          },
        ];
      };
      sprints: {
        Row: {
          id: string;
          project_id: string;
          number: number;
          start_date: string;
          end_date: string;
          status: SprintStatus;
          created_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["sprints"]["Row"]> & {
          project_id: string;
          start_date: string;
          end_date: string;
        };
        Update: Partial<Database["public"]["Tables"]["sprints"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "sprints_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "task_projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sprints_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      task_attachments: {
        Row: {
          id: string;
          task_id: string;
          storage_path: string;
          file_name: string | null;
          content_type: string | null;
          size_bytes: number | null;
          uploaded_by: string | null;
          uploaded_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["task_attachments"]["Row"]> & {
          task_id: string;
          storage_path: string;
        };
        Update: Partial<Database["public"]["Tables"]["task_attachments"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "task_attachments_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_attachments_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      account_balances: {
        Row: {
          account_id: string;
          balance: number;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: true;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      set_default_account: {
        Args: { target_account_id: string };
        Returns: void;
      };
    };
  };
}
