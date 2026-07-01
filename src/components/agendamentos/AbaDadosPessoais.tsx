import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePaciente } from "@/hooks/usePaciente";
import { mascaraCelular, mascaraCEP, mascaraCPF } from "@/lib/mascaras";

type Dados = {
  cpf: string;
  nome: string;
  email: string;
  celular: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
};
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
};

const VAZIO: Dados = {
  cpf: "",
  nome: "",
  email: "",
  celular: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
};

export const AbaDadosPessoais = () => {
  const { paciente } = usePaciente();
  const [dados, setDados] = useState<Dados>(VAZIO);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    (async () => {
      if (!paciente?.id) return;
      const { data } = await supabase.rpc("meu_perfil_auth");
      const row = data as any;
      if (row) {
        setDados({
          cpf: row.cpf ?? "",
          nome: row.nome ?? "",
          email: row.email ?? "",
          celular: row.celular ?? "",
          cep: row.cep ?? "",
          logradouro: row.logradouro ?? "",
          numero: row.numero ?? "",
          complemento: row.complemento ?? "",
          bairro: row.bairro ?? "",
          cidade: row.cidade ?? "",
          uf: row.uf ?? "",
        });
      }
    })();
  }, [paciente?.id]);

  const set = (k: keyof Dados, v: string) => setDados((s) => ({ ...s, [k]: v }));

  const salvar = async () => {
    if (!paciente?.id) return;
    setSalvando(true);
    const { cpf: _cpf, ...patch } = dados;
    const { error } = await supabase.rpc("atualizar_meu_perfil_auth", {
      p_patch: patch as any,
    });
    setSalvando(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Dados atualizados!");
  };


  return (
    <div className="space-y-4 max-w-2xl">
      <h2 className="text-xl font-bold text-secondary">Dados pessoais</h2>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label>Nome</Label>
          <Input value={dados.nome} onChange={(e) => set("nome", e.target.value)} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label>E-mail</Label>
          <Input type="email" value={dados.email} onChange={(e) => set("email", e.target.value)} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label>Celular</Label>
          <Input
            value={dados.celular}
            onChange={(e) => set("celular", mascaraCelular(e.target.value))}
          />
        </div>
        <div className="col-span-1">
          <Label>CEP</Label>
          <Input value={dados.cep} onChange={(e) => set("cep", mascaraCEP(e.target.value))} />
        </div>
        <div className="col-span-1">
          <Label>UF</Label>
          <Input
            value={dados.uf}
            maxLength={2}
            onChange={(e) => set("uf", e.target.value.toUpperCase())}
          />
        </div>
        <div className="col-span-2">
          <Label>Rua</Label>
          <Input value={dados.logradouro} onChange={(e) => set("logradouro", e.target.value)} />
        </div>
        <div className="col-span-1">
          <Label>Número</Label>
          <Input value={dados.numero} onChange={(e) => set("numero", e.target.value)} />
        </div>
        <div className="col-span-1">
          <Label>Complemento</Label>
          <Input
            value={dados.complemento}
            onChange={(e) => set("complemento", e.target.value)}
          />
        </div>
        <div className="col-span-1">
          <Label>Bairro</Label>
          <Input value={dados.bairro} onChange={(e) => set("bairro", e.target.value)} />
        </div>
        <div className="col-span-1">
          <Label>Cidade</Label>
          <Input value={dados.cidade} onChange={(e) => set("cidade", e.target.value)} />
        </div>
      </div>

      <Button
        onClick={salvar}
        disabled={salvando}
        className="bg-[#C8102E] hover:bg-[#a80d26] text-white"
      >
        {salvando ? "Salvando..." : "Salvar alterações"}
      </Button>
    </div>
  );
};
