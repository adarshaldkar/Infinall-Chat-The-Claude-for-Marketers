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
      };
    };
  };
}
