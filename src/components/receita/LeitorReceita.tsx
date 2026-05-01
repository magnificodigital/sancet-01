import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { supabase } from "@/integrations/supabase/client";
import { useSacola, ItemSacola } from "@/stores/sacola";
import { UploadReceita } from "./UploadReceita";

type Etapa = "upload" | "lendo" | "sucesso" | "erro";

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

type CatalogoItem = {
  codigo_shift: string;
  tipo: "exame" | "vacina";
  nome: string;
  outros_nomes: string[] | null;
  preco_centavos: number | null;
  prazo_resultado: string | null;
  preparo: string | null;
  disponivel_na_unidade: boolean;
  disponivel_em_casa: boolean;
};

type Resultado = {
  encontrados: string[];
  nao_encontrados: string[];
};

export const LeitorReceita = () => {
  const navigate = useNavigate();
  const { adicionar, setNaoAdicionados } = useSacola();
  const [etapa, setEtapa] = useState<Etapa>("upload");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [catalogo, setCatalogo] = useState<CatalogoItem[]>([]);
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
      // 1. Buscar catálogo
      const [exRes, vacRes] = await Promise.all([
        supabase
          .from("exames_cache")
          .select(
            "codigo_shift, nome, outros_nomes, preco_centavos, prazo_resultado, preparo, disponivel_na_unidade, disponivel_em_casa",
          )
          .eq("ativo", true),
        supabase
          .from("vacinas_cache")
          .select(
            "codigo_shift, nome, outros_nomes, preco_centavos, prazo_resultado, preparo, disponivel_na_unidade, disponivel_em_casa",
          )
          .eq("ativo", true),
      ]);

      if (exRes.error) throw exRes.error;
      if (vacRes.error) throw vacRes.error;

      const cat: CatalogoItem[] = [
        ...(exRes.data ?? []).map((e) => ({ ...e, tipo: "exame" as const })),
        ...(vacRes.data ?? []).map((v) => ({ ...v, tipo: "vacina" as const })),
      ];
      setCatalogo(cat);

      // Catálogo enxuto p/ IA
      const catalogoEnxuto = cat.map((c) => ({
        codigo_shift: c.codigo_shift,
        nome: c.nome,
        outros_nomes: c.outros_nomes ?? [],
      }));

      const fileBase64 = await toBase64(arquivo);
      const { data, error } = await supabase.functions.invoke(
        "sancet-ler-receita",
        {
          body: {
            fileBase64,
            mimeType: arquivo.type || "image/jpeg",
            catalogo: catalogoEnxuto,
          },
        },
      );

      if (error) throw error;
      if (!data || !Array.isArray(data.encontrados)) {
        throw new Error("Resposta inválida");
      }

      const res: Resultado = {
        encontrados: data.encontrados ?? [],
        nao_encontrados: data.nao_encontrados ?? [],
      };

      // Adicionar à sacola
      for (const codigo of res.encontrados) {
        const it = cat.find((c) => c.codigo_shift === codigo);
        if (!it) continue;
        const item: ItemSacola = {
          codigoShift: it.codigo_shift,
          tipo: it.tipo,
          nome: it.nome,
          outrosNomes: (it.outros_nomes ?? []).join(", "),
          precoCentavos: it.preco_centavos,
          prazoResultado: it.prazo_resultado,
          preparo: it.preparo,
          disponivelNaUnidade: it.disponivel_na_unidade,
          disponivelEmCasa: it.disponivel_em_casa,
        };
        adicionar(item);
      }
      setNaoAdicionados(res.nao_encontrados ?? []);

      setProgresso(100);
      setResultado(res);
      setEtapa("sucesso");
    } catch (err) {
      console.error("Erro ao ler pedido:", err);
      setEtapa("erro");
    }
  };

  if (etapa === "lendo") {
    return (
      <div className="flex flex-col items-center text-center">
        <Brain size={48} className="mb-4 animate-pulse text-[#C8102E]" />
        <h2 className="text-xl font-bold text-secondary">Lendo o pedido médico...</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Nossa IA está identificando os exames e vacinas
        </p>
        <div className="mt-6 w-full">
          <Progress value={progresso} className="h-2 [&>div]:bg-[#C8102E]" />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Isso pode levar alguns segundos
        </p>
      </div>
    );
  }

  if (etapa === "sucesso" && resultado) {
    const encontradosItens = resultado.encontrados
      .map((cod) => catalogo.find((c) => c.codigo_shift === cod))
      .filter(Boolean) as CatalogoItem[];

    return (
      <div className="flex flex-col items-center text-center">
        <CheckCircle2 size={48} className="mb-3 text-green-600" />
        <h2 className="text-xl font-bold text-secondary">Pedido lido com sucesso!</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Identificamos os seguintes procedimentos:
        </p>

        {encontradosItens.length > 0 && (
          <div className="mt-5 w-full rounded-lg bg-[#F0FAF4] p-3 text-left">
            <p className="mb-2 text-sm font-semibold text-secondary">
              Adicionados à sacola
            </p>
            <ul className="space-y-1.5">
              {encontradosItens.map((it) => (
                <li key={it.codigo_shift} className="flex items-center gap-2 text-sm">
                  <Plus className="h-4 w-4 shrink-0 text-green-600" />
                  <span>{it.nome}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {resultado.nao_encontrados.length > 0 && (
          <div className="mt-3 w-full rounded-lg border border-orange-300 bg-[#FFF8F0] p-3 text-left">
            <div className="mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <p className="text-sm font-semibold text-secondary">
                Não encontrados no catálogo
              </p>
            </div>
            <ul className="space-y-1.5">
              {resultado.nao_encontrados.map((nome) => (
                <li
                  key={nome}
                  className="flex flex-wrap items-center justify-between gap-2 text-sm"
                >
                  <span>{nome}</span>
                  <Link
                    to={`/exames?q=${encodeURIComponent(nome)}`}
                    className="text-xs font-medium text-[#C8102E] underline"
                  >
                    Buscar manualmente
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 flex w-full flex-col gap-2">
          <Button
            className="w-full bg-[#C8102E] text-white hover:bg-[#a80d26]"
            onClick={() => navigate("/sacola")}
          >
            Ver sacola
          </Button>
          <Button variant="outline" className="w-full" onClick={() => navigate("/exames")}>
            Adicionar mais exames
          </Button>
        </div>
      </div>
    );
  }

  if (etapa === "erro") {
    return (
      <div className="flex flex-col items-center text-center">
        <AlertCircle size={48} className="mb-3 text-[#C8102E]" />
        <h2 className="text-xl font-bold text-secondary">Não conseguimos ler o pedido</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tente uma foto mais nítida ou adicione os exames manualmente
        </p>
        <div className="mt-6 flex w-full flex-col gap-2">
          <Button
            className="w-full bg-[#C8102E] text-white hover:bg-[#a80d26]"
            onClick={() => {
              setArquivo(null);
              setResultado(null);
              setEtapa("upload");
            }}
          >
            Tentar novamente
          </Button>
          <Button variant="outline" className="w-full" onClick={() => navigate("/exames")}>
            Buscar manualmente
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
        className="mt-5 w-full bg-[#C8102E] text-white hover:bg-[#a80d26] disabled:opacity-50"
      >
        Continuar
      </Button>
    </div>
  );
};
