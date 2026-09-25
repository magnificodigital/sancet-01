import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Brain,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Plus,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { lerPedidoIA } from "@/lib/lerPedido";
import { AdicionarExameManual } from "@/components/catalogo/AdicionarExameManual";
import { useSacola, ItemSacola } from "@/stores/sacola";
import { UploadReceita } from "./UploadReceita";

type Etapa = "upload" | "lendo" | "sucesso" | "erro";

export const LeitorReceita = () => {
  const navigate = useNavigate();
  const { adicionar, setNaoAdicionados, tipo } = useSacola();
  const [etapa, setEtapa] = useState<Etapa>("upload");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [lidos, setLidos] = useState<ItemSacola[]>([]);
  const [naoEnc, setNaoEnc] = useState<string[]>([]);
  // Convênio lê contra o catálogo COMPLETO; particular contra o catálogo com preço.
  const origem = tipo === "convenio" ? "convenio" : "loja";
  const [progresso, setProgresso] = useState(10);

  // Animação da barra de progresso enquanto a IA processa
  useEffect(() => {
    if (etapa !== "lendo") return;
    setProgresso(10);
    const interval = setInterval(() => {
      setProgresso((p) => (p >= 90 ? 90 : p + Math.random() * 10));
    }, 600);
    return () => clearInterval(interval);
  }, [etapa]);

  const enviar = async () => {
    if (!arquivo) return;
    setEtapa("lendo");

    try {
      const r = await lerPedidoIA(arquivo, origem);
      r.itens.forEach((it) => adicionar(it));
      setNaoAdicionados(r.naoEncontrados ?? []);
      setLidos(r.itens);
      setNaoEnc(r.naoEncontrados ?? []);
      setProgresso(100);
      // Leu mas não achou nenhum exame -> mesma tela do erro (com busca manual).
      setEtapa(r.itens.length > 0 ? "sucesso" : "erro");
    } catch (err) {
      console.error("Erro ao ler pedido:", err);
      setLidos([]);
      setNaoEnc([]);
      setEtapa("erro");
    }
  };

  if (etapa === "lendo") {
    return (
      <div className="flex flex-col items-center text-center">
        <Brain size={48} className="mb-4 animate-pulse text-brand" />
        <h2 className="text-xl font-bold text-secondary">Lendo o pedido médico...</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Nossa IA está identificando os exames e vacinas
        </p>
        <div className="mt-6 w-full">
          <Progress value={progresso} className="h-2 [&>div]:bg-brand" />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Isso pode levar alguns segundos
        </p>
      </div>
    );
  }

  if (etapa === "sucesso") {
    return (
      <div className="flex flex-col items-center text-center">
        <CheckCircle2 size={48} className="mb-3 text-green-600" />
        <h2 className="text-xl font-bold text-secondary">Pedido lido com sucesso!</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Identificamos os seguintes procedimentos:
        </p>

        <div className="mt-5 w-full rounded-lg bg-[#F0FAF4] p-3 text-left">
          <p className="mb-2 text-sm font-semibold text-secondary">Adicionados à sacola</p>
          <ul className="space-y-1.5">
            {lidos.map((it) => (
              <li key={it.codigoShift} className="flex items-center gap-2 text-sm">
                <Plus className="h-4 w-4 shrink-0 text-green-600" />
                <span>{it.nome}</span>
              </li>
            ))}
          </ul>
        </div>

        {naoEnc.length > 0 && (
          <div className="mt-3 w-full rounded-lg border border-orange-300 bg-[#FFF8F0] p-3 text-left">
            <div className="mb-1 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <p className="text-sm font-semibold text-secondary">
                Não reconhecidos automaticamente
              </p>
            </div>
            <p className="text-sm text-muted-foreground">{naoEnc.join(", ")}</p>
          </div>
        )}

        <div className="mt-3 w-full rounded-lg border bg-card p-3 text-left">
          <AdicionarExameManual origem={origem} titulo="Faltou algum exame? Busque e inclua aqui:" />
        </div>

        <div className="mt-6 flex w-full flex-col gap-2">
          <Button
            className="w-full bg-brand text-white hover:bg-brand-hover"
            onClick={() => navigate("/sacola")}
          >
            Ver sacola
          </Button>
        </div>
      </div>
    );
  }

  if (etapa === "erro") {
    return (
      <div className="flex flex-col items-center text-center">
        <AlertCircle size={48} className="mb-3 text-brand" />
        <h2 className="text-xl font-bold text-secondary">
          Não conseguimos identificar os exames automaticamente
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tudo bem: se você sabe qual é o exame, é só buscar e incluir abaixo.
          Ou tente de novo com uma foto mais nítida.
        </p>

        {naoEnc.length > 0 && (
          <p className="mt-3 w-full rounded-lg border border-orange-300 bg-[#FFF8F0] p-3 text-left text-sm text-muted-foreground">
            Lemos no pedido, mas não achamos no catálogo: {naoEnc.join(", ")}.
          </p>
        )}

        <div className="mt-4 w-full rounded-lg border bg-card p-3 text-left">
          <AdicionarExameManual origem={origem} />
        </div>

        <div className="mt-6 flex w-full flex-col gap-2">
          <Button
            className="w-full bg-brand text-white hover:bg-brand-hover"
            onClick={() => navigate("/sacola")}
          >
            Ver sacola
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setArquivo(null);
              setLidos([]);
              setNaoEnc([]);
              setEtapa("upload");
            }}
          >
            Tentar ler de novo
          </Button>
        </div>
      </div>
    );
  }

  // Etapa upload
  return (
    <div>
      <h2 className="text-xl font-bold text-secondary">Enviar pedido médico</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Adicione exames e vacinas à sacola sem precisar digitar
      </p>

      <hr className="my-5 border-border" />

      <UploadReceita arquivo={arquivo} onArquivo={setArquivo} />

      <div className="mt-4 rounded-lg bg-[#F0FAF4] p-4">
        <p className="mb-2 text-sm font-bold text-secondary">Dicas</p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            <span>
              A imagem deve mostrar o documento inteiro, com o carimbo médico legível
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Camera className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            <span>Vai fotografar? Tire a foto em um lugar bem iluminado</span>
          </li>
          <li className="flex items-start gap-2">
            <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            <span>
              Para documentos digitais, é só enviar o arquivo ou uma captura de tela
            </span>
          </li>
        </ul>
      </div>

      <Button
        onClick={enviar}
        disabled={!arquivo}
        className="mt-5 w-full bg-brand text-white hover:bg-brand-hover disabled:opacity-50"
      >
        Continuar
      </Button>
    </div>
  );
};
