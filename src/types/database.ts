export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type UserRole = 'master' | 'manager'
export type AgentStatus = 'idle' | 'running' | 'completed' | 'failed'

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          logo_url?: string | null
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          user_id: string
          org_id: string
          role: UserRole
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          org_id: string
          role?: UserRole
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          role?: UserRole
          full_name?: string | null
          avatar_url?: string | null
          updated_at?: string
        }
      }
      agents: {
        Row: {
          id: string
          org_id: string
          name: string
          type: string
          description: string | null
          config: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          name: string
          type: string
          description?: string | null
          config?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          type?: string
          description?: string | null
          config?: Json
          is_active?: boolean
          updated_at?: string
        }
      }
      agent_runs: {
        Row: {
          id: string
          agent_id: string
          org_id: string
          status: AgentStatus
          started_at: string
          ended_at: string | null
          items_processed: number
          tokens_used: number
          cost_usd: number
          error: string | null
          created_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          org_id: string
          status?: AgentStatus
          started_at?: string
          ended_at?: string | null
          items_processed?: number
          tokens_used?: number
          cost_usd?: number
          error?: string | null
          created_at?: string
        }
        Update: {
          status?: AgentStatus
          ended_at?: string | null
          items_processed?: number
          tokens_used?: number
          cost_usd?: number
          error?: string | null
        }
      }
      agent_logs: {
        Row: {
          id: string
          run_id: string
          org_id: string
          action: string
          details: Json | null
          items_count: number
          tokens_used: number
          created_at: string
        }
        Insert: {
          id?: string
          run_id: string
          org_id: string
          action: string
          details?: Json | null
          items_count?: number
          tokens_used?: number
          created_at?: string
        }
        Update: never
      }
    }
    Views: {}
    Functions: {}
    Enums: {
      user_role: UserRole
      agent_status: AgentStatus
    }
  }
}
