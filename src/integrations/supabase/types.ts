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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      configuracoes: {
        Row: {
          atualizado_em: string
          chave: string
          created_at: string
          id: string
          valor: string
        }
        Insert: {
          atualizado_em?: string
          chave: string
          created_at?: string
          id?: string
          valor?: string
        }
        Update: {
          atualizado_em?: string
          chave?: string
          created_at?: string
          id?: string
          valor?: string
        }
        Relationships: []
      }
      convenios_cache: {
        Row: {
          ativo: boolean
          atualizado_em: string | null
          codigo_shift: string
          created_at: string | null
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string | null
          codigo_shift: string
          created_at?: string | null
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string | null
          codigo_shift?: string
          created_at?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      exames_cache: {
        Row: {
          ativo: boolean
          atualizado_em: string | null
          categoria: string | null
          codigo_shift: string
          created_at: string | null
          descricao: string | null
          disponivel_em_casa: boolean
          disponivel_na_unidade: boolean
          id: string
          imagem_url: string | null
          nome: string
          outros_nomes: string[] | null
          prazo_resultado: string | null
          preco_centavos: number | null
          preparo: string | null
          slug: string | null
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string | null
          categoria?: string | null
          codigo_shift: string
          created_at?: string | null
          descricao?: string | null
          disponivel_em_casa?: boolean
          disponivel_na_unidade?: boolean
          id?: string
          imagem_url?: string | null
          nome: string
          outros_nomes?: string[] | null
          prazo_resultado?: string | null
          preco_centavos?: number | null
          preparo?: string | null
          slug?: string | null
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string | null
          categoria?: string | null
          codigo_shift?: string
          created_at?: string | null
          descricao?: string | null
          disponivel_em_casa?: boolean
          disponivel_na_unidade?: boolean
          id?: string
          imagem_url?: string | null
          nome?: string
          outros_nomes?: string[] | null
          prazo_resultado?: string | null
          preco_centavos?: number | null
          preparo?: string | null
          slug?: string | null
        }
        Relationships: []
      }
      landing_pages: {
        Row: {
          blocos: Json
          created_at: string
          id: string
          meta_descricao: string | null
          publicado: boolean
          slug: string
          titulo: string
          updated_at: string
        }
        Insert: {
          blocos?: Json
          created_at?: string
          id?: string
          meta_descricao?: string | null
          publicado?: boolean
          slug: string
          titulo: string
          updated_at?: string
        }
        Update: {
          blocos?: Json
          created_at?: string
          id?: string
          meta_descricao?: string | null
          publicado?: boolean
          slug?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      pacientes: {
        Row: {
          bairro: string | null
          celular: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          cpf: string
          created_at: string | null
          data_nascimento: string
          email: string | null
          id: string
          logradouro: string | null
          nome: string | null
          numero: string | null
          sexo: string | null
          uf: string | null
          updated_at: string | null
        }
        Insert: {
          bairro?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf: string
          created_at?: string | null
          data_nascimento: string
          email?: string | null
          id?: string
          logradouro?: string | null
          nome?: string | null
          numero?: string | null
          sexo?: string | null
          uf?: string | null
          updated_at?: string | null
        }
        Update: {
          bairro?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf?: string
          created_at?: string | null
          data_nascimento?: string
          email?: string | null
          id?: string
          logradouro?: string | null
          nome?: string | null
          numero?: string | null
          sexo?: string | null
          uf?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pedidos: {
        Row: {
          convenio_codigo_shift: string | null
          convenio_nome: string | null
          created_at: string | null
          endereco_coleta: Json | null
          id: string
          itens: Json
          modalidade_coleta: string
          numero_carteirinha: string | null
          observacoes: string | null
          paciente_cpf: string
          paciente_id: string | null
          paciente_nome: string | null
          protocolo: string
          status: string
          status_pagamento: string
          termos_aceitos: boolean
          termos_aceitos_em: string | null
          tipo_solicitacao: string
          unidade_codigo_shift: string | null
          unidade_nome: string | null
          updated_at: string | null
          url_carteirinha: string | null
          url_identidade: string | null
          url_pedido_medico: string | null
          url_receita: string | null
          valor_total_centavos: number | null
        }
        Insert: {
          convenio_codigo_shift?: string | null
          convenio_nome?: string | null
          created_at?: string | null
          endereco_coleta?: Json | null
          id?: string
          itens?: Json
          modalidade_coleta?: string
          numero_carteirinha?: string | null
          observacoes?: string | null
          paciente_cpf: string
          paciente_id?: string | null
          paciente_nome?: string | null
          protocolo?: string
          status?: string
          status_pagamento?: string
          termos_aceitos?: boolean
          termos_aceitos_em?: string | null
          tipo_solicitacao?: string
          unidade_codigo_shift?: string | null
          unidade_nome?: string | null
          updated_at?: string | null
          url_carteirinha?: string | null
          url_identidade?: string | null
          url_pedido_medico?: string | null
          url_receita?: string | null
          valor_total_centavos?: number | null
        }
        Update: {
          convenio_codigo_shift?: string | null
          convenio_nome?: string | null
          created_at?: string | null
          endereco_coleta?: Json | null
          id?: string
          itens?: Json
          modalidade_coleta?: string
          numero_carteirinha?: string | null
          observacoes?: string | null
          paciente_cpf?: string
          paciente_id?: string | null
          paciente_nome?: string | null
          protocolo?: string
          status?: string
          status_pagamento?: string
          termos_aceitos?: boolean
          termos_aceitos_em?: string | null
          tipo_solicitacao?: string
          unidade_codigo_shift?: string | null
          unidade_nome?: string | null
          updated_at?: string | null
          url_carteirinha?: string | null
          url_identidade?: string | null
          url_pedido_medico?: string | null
          url_receita?: string | null
          valor_total_centavos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      resultados: {
        Row: {
          arquivo_url: string
          created_at: string | null
          id: string
          nome_arquivo: string
          observacao: string | null
          paciente_cpf: string
          pedido_protocolo: string
        }
        Insert: {
          arquivo_url: string
          created_at?: string | null
          id?: string
          nome_arquivo: string
          observacao?: string | null
          paciente_cpf: string
          pedido_protocolo: string
        }
        Update: {
          arquivo_url?: string
          created_at?: string | null
          id?: string
          nome_arquivo?: string
          observacao?: string | null
          paciente_cpf?: string
          pedido_protocolo?: string
        }
        Relationships: []
      }
      unidades_cache: {
        Row: {
          aceita_domicilio: boolean
          ativo: boolean
          atualizado_em: string | null
          bairro: string | null
          cep: string | null
          cidade: string | null
          codigo_shift: string
          created_at: string | null
          email: string | null
          endereco: string | null
          foto_url: string | null
          horarios: Json | null
          id: string
          latitude: number | null
          longitude: number | null
          nome: string
          slug: string | null
          telefone: string | null
          uf: string | null
        }
        Insert: {
          aceita_domicilio?: boolean
          ativo?: boolean
          atualizado_em?: string | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          codigo_shift: string
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          foto_url?: string | null
          horarios?: Json | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome: string
          slug?: string | null
          telefone?: string | null
          uf?: string | null
        }
        Update: {
          aceita_domicilio?: boolean
          ativo?: boolean
          atualizado_em?: string | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          codigo_shift?: string
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          foto_url?: string | null
          horarios?: Json | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome?: string
          slug?: string | null
          telefone?: string | null
          uf?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          ativo: boolean | null
          created_at: string
          email: string | null
          id: string
          nome: string | null
          permissoes: Json | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string | null
          permissoes?: Json | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string | null
          permissoes?: Json | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vacinas_cache: {
        Row: {
          ativo: boolean
          atualizado_em: string | null
          categoria: string | null
          codigo_shift: string
          created_at: string | null
          descricao: string | null
          disponivel_em_casa: boolean
          disponivel_na_unidade: boolean
          id: string
          imagem_url: string | null
          nome: string
          outros_nomes: string[] | null
          prazo_resultado: string | null
          preco_centavos: number | null
          preparo: string | null
          slug: string | null
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string | null
          categoria?: string | null
          codigo_shift: string
          created_at?: string | null
          descricao?: string | null
          disponivel_em_casa?: boolean
          disponivel_na_unidade?: boolean
          id?: string
          imagem_url?: string | null
          nome: string
          outros_nomes?: string[] | null
          prazo_resultado?: string | null
          preco_centavos?: number | null
          preparo?: string | null
          slug?: string | null
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string | null
          categoria?: string | null
          codigo_shift?: string
          created_at?: string | null
          descricao?: string | null
          disponivel_em_casa?: boolean
          disponivel_na_unidade?: boolean
          id?: string
          imagem_url?: string | null
          nome?: string
          outros_nomes?: string[] | null
          prazo_resultado?: string | null
          preco_centavos?: number | null
          preparo?: string | null
          slug?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      gerar_protocolo_sancet: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "staff"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "staff"],
    },
  },
} as const
