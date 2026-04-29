import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useSacola } from "@/stores/sacola";
import { formatarPreco } from "@/components/catalogo/types";
import { Unidade } from "./ListaUnidades";
import { EnderecoColeta } from "./EtapaEndereco";

type Props = {
  tipo: "particular" | "convenio";
  modalidade: "domicilio" | "unidade";
  unidade: Unidade | null;
  endereco: EnderecoColeta | null;
  enviando: boolean;
  onConfirmar: (extras: {
    numeroCarteirinha: string;
    convenioNome: string;
    arquivoCarteirinha: File | null;
  }) => void;
};

export const EtapaConfirmacao = ({
  tipo,
  modalidade,
  unidade,
  endereco,
  enviando,
  onConfirmar,
}: Props) => {
  const { itens, total } = useSacola();
  const [numeroCarteirinha, setNumeroCarteirinha] = useState("");
  const [convenioNome, setConvenioNome] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [aceito, setAceito] = useState(false);

  const podeConfirmar =
    aceito &&
    !enviando &&
    (tipo !== "convenio" || (numeroCarteirinha.trim() && convenioNome.trim()));

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-secondary">Confirmar pedido</h1>

      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div>
          <h3 className="font-semibold mb-2 text-secondary">Itens</h3>
          <ul className="space-y-1 text-sm">
            {itens.map((i) => (
              <li key={i.codigoShift} className="flex justify-between gap-2">
                <span className="truncate">{i.nome}</span>
                <span className="text-muted-foreground whitespace-nowrap">
                  {i.precoCentavos != null ? formatarPreco(i.precoCentavos) : "—"}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="text-sm space-y-1 border-t pt-3">
          <p>
            <span className="text-muted-foreground">Tipo:</span>{" "}
            <span className="font-medium">{tipo === "convenio" ? "Convênio" : "Particular"}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Modalidade:</span>{" "}
            <span className="font-medium">
              {modalidade === "domicilio"
                ? "Em casa"
                : `Unidade ${unidade?.nome ?? ""}`}
            </span>
          </p>
          {modalidade === "domicilio" && endereco && (
            <p className="text-muted-foreground">
              {endereco.logradouro}, {endereco.numero} — {endereco.bairro}, {endereco.cidade}/{endereco.uf}
            </p>
          )}
        </div>

        <div className="border-t pt-3 flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-xl font-bold text-[#C8102E]">{formatarPreco(total())}</span>
        </div>
      </div>

      {tipo === "convenio" && (
        <div className="space-y-3">
          <div>
            <Label>Convênio</Label>
            <Input
              value={convenioNome}
              onChange={(e) => setConvenioNome(e.target.value)}
              placeholder="Nome do convênio"
            />
          </div>
          <div>
            <Label>Número da carteirinha</Label>
            <Input
              value={numeroCarteirinha}
              onChange={(e) => setNumeroCarteirinha(e.target.value)}
            />
          </div>
          <div>
            <Label>Carteirinha do convênio</Label>
            <Input
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
      )}

      <label className="flex items-start gap-3 text-sm">
        <Checkbox
          checked={aceito}
          onCheckedChange={(v) => setAceito(v === true)}
          className="mt-0.5"
        />
        <span className="text-muted-foreground">
          Concordo com os <span className="text-[#C8102E] underline">Termos de uso</span> e
          autorizo o tratamento dos meus dados conforme a LGPD.
        </span>
      </label>

      <Button
        disabled={!podeConfirmar}
        onClick={() =>
          onConfirmar({
            numeroCarteirinha,
            convenioNome,
            arquivoCarteirinha: arquivo,
          })
        }
        className="w-full bg-[#C8102E] hover:bg-[#a80d26] text-white"
      >
        {enviando ? "Enviando..." : "Confirmar pedido"}
      </Button>
    </div>
  );
};
