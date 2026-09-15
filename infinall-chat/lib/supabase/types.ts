export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          slug: string | null;
          description: string | null;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          slug?: string | null;
          description?: string | null;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          slug?: string | null;
          description?: string | null;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      project_members: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'editor' | 'viewer';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          role?: 'owner' | 'admin' | 'editor' | 'viewer';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          role?: 'owner' | 'admin' | 'editor' | 'viewer';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      chat_sessions: {
        Row: {
          id: string;
          user_id: string | null;
          title: string;
          model_id: string;
          is_pinned: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          title: string;
          model_id?: string;
          is_pinned?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          title?: string;
          model_id?: string;
          is_pinned?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      chat_messages: {
        Row: {
          id: string;
          session_id: string;
          role: 'user' | 'assistant';
          content: Json;
          thinking: string | null;
          tokens: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          role: 'user' | 'assistant';
          content: Json;
          thinking?: string | null;
          tokens?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          role?: 'user' | 'assistant';
          content?: Json;
          thinking?: string | null;
          tokens?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      doc_artifacts: {
        Row: {
          id: string;
          session_id: string;
          title: string;
          type: string;
          language: string | null;
          content: string;
          version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          title: string;
          type: string;
          language?: string | null;
          content: string;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          title?: string;
          type?: string;
          language?: string | null;
          content?: string;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      mcp_connectors: {
        Row: {
          id: string;
          name: string;
          category: string;
          server_endpoint: string;
          status: string;
          latency_ms: number;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          category: string;
          server_endpoint: string;
          status?: string;
          latency_ms?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          category?: string;
          server_endpoint?: string;
          status?: string;
          latency_ms?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      approval_audit_log: {
        Row: {
          id: string;
          action: string;
          tool_name: string;
          args: Json;
          hmac_hash: string;
          user_id: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          action: string;
          tool_name: string;
          args: Json;
          hmac_hash: string;
          user_id?: string | null;
          status: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          action?: string;
          tool_name?: string;
          args?: Json;
          hmac_hash?: string;
          user_id?: string | null;
          status?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      knowledge_documents: {
        Row: {
          id: string;
          project_id: string | null;
          user_id: string;
          title: string;
          file_name: string;
          file_size_bytes: number;
          mime_type: string;
          source_type: string;
          storage_path: string | null;
          status: string;
          page_count: number;
          slide_count: number;
          sheet_count: number;
          chunk_count: number;
          error_message: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          user_id: string;
          title: string;
          file_name: string;
          file_size_bytes?: number;
          mime_type: string;
          source_type?: string;
          storage_path?: string | null;
          status?: string;
          page_count?: number;
          slide_count?: number;
          sheet_count?: number;
          chunk_count?: number;
          error_message?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string | null;
          user_id?: string;
          title?: string;
          file_name?: string;
          file_size_bytes?: number;
          mime_type?: string;
          source_type?: string;
          storage_path?: string | null;
          status?: string;
          page_count?: number;
          slide_count?: number;
          sheet_count?: number;
          chunk_count?: number;
          error_message?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      knowledge_chunks: {
        Row: {
          id: string;
          document_id: string;
          project_id: string | null;
          user_id: string;
          chunk_index: number;
          content: string;
          token_count: number;
          breadcrumb: Json;
          embedding: string | null;
          content_tsv: unknown;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          project_id?: string | null;
          user_id: string;
          chunk_index: number;
          content: string;
          token_count?: number;
          breadcrumb?: Json;
          embedding?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          project_id?: string | null;
          user_id?: string;
          chunk_index?: number;
          content?: string;
          token_count?: number;
          breadcrumb?: Json;
          embedding?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      brand_memories: {
        Row: {
          id: string;
          project_id: string | null;
          user_id: string;
          key?: string;
          memory_key?: string;
          category: string;
          value?: string;
          memory_value?: string;
          confidence: number;
          status: string;
          provenance?: Json;
          superseded_by?: string | null;
          conflict_with?: string[] | null;
          metadata?: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          user_id?: string | null;
          session_id?: string | null;
          key?: string;
          memory_key?: string;
          category?: string;
          value?: string;
          memory_value?: string;
          confidence?: number;
          status?: string;
          embedding?: number[] | string | null;
          provenance?: Json;
          superseded_by?: string | null;
          conflict_with?: string[] | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string | null;
          user_id?: string | null;
          session_id?: string | null;
          key?: string;
          memory_key?: string;
          category?: string;
          value?: string;
          memory_value?: string;
          confidence?: number;
          status?: string;
          embedding?: number[] | string | null;
          provenance?: Json;
          superseded_by?: string | null;
          conflict_with?: string[] | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ingestion_jobs: {
        Row: {
          id: string;
          document_id: string;
          project_id: string | null;
          user_id: string;
          status: string;
          progress_percent: number;
          current_step: string;
          total_steps: number;
          retry_count: number;
          max_retries: number;
          error_message: string | null;
          retryable: boolean;
          started_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          document_id: string;
          project_id?: string | null;
          user_id: string;
          status?: string;
          progress_percent?: number;
          current_step?: string;
          total_steps?: number;
          retry_count?: number;
          max_retries?: number;
          error_message?: string | null;
          retryable?: boolean;
          started_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          document_id?: string;
          project_id?: string | null;
          user_id?: string;
          status?: string;
          progress_percent?: number;
          current_step?: string;
          total_steps?: number;
          retry_count?: number;
          max_retries?: number;
          error_message?: string | null;
          retryable?: boolean;
          started_at?: string;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      ingestion_events: {
        Row: {
          id: string;
          job_id: string;
          document_id: string;
          step: string;
          message: string;
          metadata: Json;
          timestamp: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          document_id: string;
          step: string;
          message: string;
          metadata?: Json;
          timestamp?: string;
        };
        Update: {
          id?: string;
          job_id?: string;
          document_id?: string;
          step?: string;
          message?: string;
          metadata?: Json;
          timestamp?: string;
        };
        Relationships: [];
      };
      campaigns: {
        Row: {
          id: string;
          project_id: string | null;
          user_id: string;
          name: string;
          description: string | null;
          status: string;
          channels: Json;
          budget_cents: number;
          currency: string;
          start_date: string | null;
          end_date: string | null;
          target_kpis: Json;
          actual_metrics: Json;
          deliverables: Json;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          user_id: string;
          name: string;
          description?: string | null;
          status?: string;
          channels?: Json;
          budget_cents?: number;
          currency?: string;
          start_date?: string | null;
          end_date?: string | null;
          target_kpis?: Json;
          actual_metrics?: Json;
          deliverables?: Json;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string | null;
          user_id?: string;
          name?: string;
          description?: string | null;
          status?: string;
          channels?: Json;
          budget_cents?: number;
          currency?: string;
          start_date?: string | null;
          end_date?: string | null;
          target_kpis?: Json;
          actual_metrics?: Json;
          deliverables?: Json;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      approval_requests: {
        Row: {
          id: string;
          project_id: string | null;
          campaign_id: string | null;
          requester_id: string;
          reviewer_id: string | null;
          action_type: string;
          tool_name: string;
          title: string;
          description: string | null;
          payload: Json;
          impact_level: string;
          estimated_cost_cents: number;
          status: string;
          rejection_reason: string | null;
          approval_notes: string | null;
          hmac_signature: string | null;
          executed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          campaign_id?: string | null;
          requester_id: string;
          reviewer_id?: string | null;
          action_type: string;
          tool_name: string;
          title: string;
          description?: string | null;
          payload?: Json;
          impact_level?: string;
          estimated_cost_cents?: number;
          status?: string;
          rejection_reason?: string | null;
          approval_notes?: string | null;
          hmac_signature?: string | null;
          executed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string | null;
          campaign_id?: string | null;
          requester_id?: string;
          reviewer_id?: string | null;
          action_type?: string;
          tool_name?: string;
          title?: string;
          description?: string | null;
          payload?: Json;
          impact_level?: string;
          estimated_cost_cents?: number;
          status?: string;
          rejection_reason?: string | null;
          approval_notes?: string | null;
          hmac_signature?: string | null;
          executed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      hybrid_match_knowledge_chunks: {
        Args: {
          query_text: string;
          query_embedding: number[];
          match_count?: number;
          vector_candidates_limit?: number;
          fts_candidates_limit?: number;
          filter_user_id?: string | null;
          filter_project_id?: string | null;
          rrf_k?: number;
        };
        Returns: Array<{
          chunk_id: string;
          document_id: string;
          document_title: string;
          content: string;
          breadcrumb: Json;
          source_type: string;
          rrf_score: number;
          vector_rank: number | null;
          vector_score: number | null;
          fts_rank: number | null;
          fts_score: number | null;
        }>;
      };
      get_active_brand_memories: {
        Args: {
          p_user_id: string;
          p_project_id?: string | null;
          p_min_confidence?: number;
        };
        Returns: Array<{
          id: string;
          project_id: string | null;
          user_id: string;
          key: string;
          category: string;
          value: string;
          confidence: number;
          provenance: Json;
          created_at: string;
          updated_at: string;
        }>;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
