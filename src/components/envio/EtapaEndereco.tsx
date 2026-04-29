import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { usePaciente } from "@/hooks/usePaciente";
import { mascaraCEP } from "@/lib/mascaras";

export type EnderecoColeta = {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
};

type Props = {
  onConfirmar: (e: EnderecoColeta) => void;
};

export const EtapaEndereco = ({ onConfirmar }: Props) => {
  const { paciente } = usePaciente();
  const [end, setEnd] = useState<EnderecoColeta>({
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
  });

  useEffect(() => {
    (async () => {
      if (!paciente?.id) return;
      const { data } = await supabase
        .from("pacientes")
        .select("cep,logradouro,numero,complemento,bairro,cidade,uf")
        .eq("id", paciente.id)
        .maybeSingle();
      if (data) {
        setEnd({
          cep: data.cep ?? "",
          logradouro: data.logradouro ?? "",
          numero: data.numero ?? "",
          complemento: data.complemento ?? "",
          bairro: data.bairro ?? "",
          cidade: data.cidade ?? "",
          uf: data.uf ?? "",
        });
      }
    })();
  }, [paciente?.id]);

  const set = (k: keyof EnderecoColeta, v: string) =>
    setEnd((s) => ({ ...s, [k]: v }));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-secondary">Confirmar endereço de coleta</h1>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-1">
          <Label>CEP</Label>
          <Input value={end.cep} onChange={(e) => set("cep", mascaraCEP(e.target.value))} />
        </div>
        <div className="col-span-1">
          <Label>UF</Label>
          <Input value={end.uf} maxLength={2} onChange={(e) => set("uf", e.target.value.toUpperCase())} />
        </div>
        <div className="col-span-2">
          <Label>Rua</Label>
          <Input value={end.logradouro} onChange={(e) => set("logradouro", e.target.value)} />
        </div>
        <div className="col-span-1">
          <Label>Número</Label>
          <Input value={end.numero} onChange={(e) => set("numero", e.target.value)} />
        </div>
        <div className="col-span-1">
          <Label>Complemento</Label>
          <Input value={end.complemento} onChange={(e) => set("complemento", e.target.value)} />
        </div>
        <div className="col-span-1">
          <Label>Bairro</Label>
          <Input value={end.bairro} onChange={(e) => set("bairro", e.target.value)} />
        </div>
        <div className="col-span-1">
          <Label>Cidade</Label>
          <Input value={end.cidade} onChange={(e) => set("cidade", e.target.value)} />
        </div>
      </div>

      <Button
        onClick={() => onConfirmar(end)}
        className="w-full bg-[#C8102E] hover:bg-[#a80d26] text-white"
      >
        Confirmar endereço
      </Button>
    </div>
  );
};
