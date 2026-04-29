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
      convenios_cache: {
        Row: {
          ativo: boolean | null
          codigo_shift: string
          id: string
          nome: string
          ultima_sincronizacao: string | null
        }
        Insert: {
          ativo?: boolean | null
          codigo_shift: string
          id?: string
          nome: string
          ultima_sincronizacao?: string | null
        }
        Update: {
          ativo?: boolean | null
          codigo_shift?: string
          id?: string
          nome?: string
          ultima_sincronizacao?: string | null
        }
        Relationships: []
      }
      exames_cache: {
        Row: {
          ativo: boolean | null
          codigo_shift: string
          id: string
          jejum: string | null
          material: string | null
          nome: string
          orientacao: string | null
          prazo_resultado: string | null
          preco_particular_centavos: number | null
          recipiente: string | null
          sinonimos: string | null
          slug: string
          ultima_sincronizacao: string | null
        }
        Insert: {
          ativo?: boolean | null
          codigo_shift: string
          id?: string
          jejum?: string | null
          material?: string | null
          nome: string
          orientacao?: string | null
          prazo_resultado?: string | null
          preco_particular_centavos?: number | null
          recipiente?: string | null
          sinonimos?: string | null
          slug: string
          ultima_sincronizacao?: string | null
        }
        Update: {
          ativo?: boolean | null
          codigo_shift?: string
          id?: string
          jejum?: string | null
          material?: string | null
          nome?: string
          orientacao?: string | null
          prazo_resultado?: string | null
          preco_particular_centavos?: number | null
          recipiente?: string | null
          sinonimos?: string | null
          slug?: string
          ultima_sincronizacao?: string | null
        }
        Relationships: []
      }
      pedidos: {
        Row: {
          aceito_em: string | null
          celular: string
          cpf: string | null
          created_at: string
          data_nascimento: string | null
          data_preferencial: string | null
          email: string
          exames: Json | null
          gestante: boolean | null
          id: string
          id_pagamento_externo: string | null
          metodo_pagamento: string | null
          nacionalidade: string | null
          nome_convenio: string | null
          nome_paciente: string
          nome_responsavel: string | null
          observacoes: string | null
          passaporte: string | null
          periodo_preferencial: string | null
          protocolo: string
          sexo_biologico: string | null
          status: string | null
          status_pagamento: string | null
          termos_aceitos: boolean | null
          tipo_solicitacao: string | null
          total_centavos: number | null
          unidade_id: string | null
          unidade_nome: string | null
          updated_at: string
          url_carteirinha_convenio: string | null
          url_guia_autorizacao: string | null
          url_identidade_frente: string | null
          url_identidade_responsavel: string | null
          url_identidade_verso: string | null
          url_pedido_medico: string | null
          url_relatorio_medico: string | null
          urls_pedidos_adicionais: Json | null
        }
        Insert: {
          aceito_em?: string | null
          celular: string
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          data_preferencial?: string | null
          email: string
          exames?: Json | null
          gestante?: boolean | null
          id?: string
          id_pagamento_externo?: string | null
          metodo_pagamento?: string | null
          nacionalidade?: string | null
          nome_convenio?: string | null
          nome_paciente: string
          nome_responsavel?: string | null
          observacoes?: string | null
          passaporte?: string | null
          periodo_preferencial?: string | null
          protocolo: string
          sexo_biologico?: string | null
          status?: string | null
          status_pagamento?: string | null
          termos_aceitos?: boolean | null
          tipo_solicitacao?: string | null
          total_centavos?: number | null
          unidade_id?: string | null
          unidade_nome?: string | null
          updated_at?: string
          url_carteirinha_convenio?: string | null
          url_guia_autorizacao?: string | null
          url_identidade_frente?: string | null
          url_identidade_responsavel?: string | null
          url_identidade_verso?: string | null
          url_pedido_medico?: string | null
          url_relatorio_medico?: string | null
          urls_pedidos_adicionais?: Json | null
        }
        Update: {
          aceito_em?: string | null
          celular?: string
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          data_preferencial?: string | null
          email?: string
          exames?: Json | null
          gestante?: boolean | null
          id?: string
          id_pagamento_externo?: string | null
          metodo_pagamento?: string | null
          nacionalidade?: string | null
          nome_convenio?: string | null
          nome_paciente?: string
          nome_responsavel?: string | null
          observacoes?: string | null
          passaporte?: string | null
          periodo_preferencial?: string | null
          protocolo?: string
          sexo_biologico?: string | null
          status?: string | null
          status_pagamento?: string | null
          termos_aceitos?: boolean | null
          tipo_solicitacao?: string | null
          total_centavos?: number | null
          unidade_id?: string | null
          unidade_nome?: string | null
          updated_at?: string
          url_carteirinha_convenio?: string | null
          url_guia_autorizacao?: string | null
          url_identidade_frente?: string | null
          url_identidade_responsavel?: string | null
          url_identidade_verso?: string | null
          url_pedido_medico?: string | null
          url_relatorio_medico?: string | null
          urls_pedidos_adicionais?: Json | null
        }
        Relationships: []
      }
      unidades_cache: {
        Row: {
          ativo: boolean | null
          bairro: string | null
          cep: string | null
          cidade: string | null
          codigo_shift: string
          endereco: string | null
          estado: string | null
          horario_funcionamento: string | null
          id: string
          latitude: number | null
          longitude: number | null
          nome: string
          telefone: string | null
          ultima_sincronizacao: string | null
        }
        Insert: {
          ativo?: boolean | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          codigo_shift: string
          endereco?: string | null
          estado?: string | null
          horario_funcionamento?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome: string
          telefone?: string | null
          ultima_sincronizacao?: string | null
        }
        Update: {
          ativo?: boolean | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          codigo_shift?: string
          endereco?: string | null
          estado?: string | null
          horario_funcionamento?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome?: string
          telefone?: string | null
          ultima_sincronizacao?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
