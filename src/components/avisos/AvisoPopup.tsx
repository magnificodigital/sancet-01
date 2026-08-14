import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Aviso = {
  id: string;
  titulo: string;
  conteudo_html: string;
  imagem_url: string | null;
  link_url: string | null;
  link_texto: string | null;
  alvo: string[];
  frequencia: string; // 'sempre' | 'sessao' | 'dia'
  inicio: string | null;
  fim: string | null;
};

const SELECT_COLS =
  "id, titulo, conteudo_html, imagem_url, link_url, link_texto, alvo, frequencia, inicio, fim, ordem";

// Já foi visto o suficiente para não mostrar de novo agora?
const jaVisto = (a: Aviso): boolean => {
  if (a.frequencia === "sempre") return false;
  const key = `aviso_visto_${a.id}`;
  if (a.frequencia === "sessao") return sessionStorage.getItem(key) === "1";
  const ts = localStorage.getItem(key); // 'dia'
  return !!ts && Date.now() - Number(ts) < 24 * 60 * 60 * 1000;
};

const marcarVisto = (a: Aviso) => {
  const key = `aviso_visto_${a.id}`;
  if (a.frequencia === "sessao") sessionStorage.setItem(key, "1");
  else if (a.frequencia === "dia") localStorage.setItem(key, String(Date.now()));
};

const casaComRota = (alvo: string[], path: string): boolean => {
  if (!Array.isArray(alvo) || alvo.length === 0) return false;
  if (alvo.includes("*")) return true;
  return alvo.some((p) => p === path);
};

const dentroDoPeriodo = (a: Aviso): boolean => {
  const now = Date.now();
  if (a.inicio && now < new Date(a.inicio).getTime()) return false;
  if (a.fim && now > new Date(a.fim).getTime()) return false;
  return true;
};

export const AvisoPopup = () => {
  const location = useLocation();
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    // Nunca mostra avisos dentro do painel interno.
    if (location.pathname.startsWith("/staff")) return;
    let cancelado = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("avisos")
        .select(SELECT_COLS)
        .eq("ativo", true)
        .order("ordem", { ascending: true });
      if (cancelado || !data) return;
      const elegivel = (data as Aviso[]).find(
        (a) =>
          casaComRota(a.alvo, location.pathname) &&
          dentroDoPeriodo(a) &&
          !jaVisto(a),
      );
      if (elegivel) {
        setAviso(elegivel);
        setAberto(true);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [location.pathname]);

  const fechar = () => {
    if (aviso) marcarVisto(aviso);
    setAberto(false);
  };

  if (!aviso) return null;

  const externo = !!aviso.link_url && /^https?:\/\//.test(aviso.link_url);

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && fechar()}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
        {aviso.imagem_url && (
          <img
            src={aviso.imagem_url}
            alt=""
            className="max-h-72 w-full object-cover"
          />
        )}
        <div className="p-6">
          {aviso.titulo && (
            <h2 className="mb-2 text-xl font-bold text-secondary">
              {aviso.titulo}
            </h2>
          )}
          {aviso.conteudo_html && (
            <div
              className="prose prose-sm max-w-none prose-a:text-brand"
              dangerouslySetInnerHTML={{ __html: aviso.conteudo_html }}
            />
          )}
          {aviso.link_url && (
            <Button
              asChild
              className="mt-5 w-full bg-brand text-white hover:bg-brand-hover"
            >
              <a
                href={aviso.link_url}
                target={externo ? "_blank" : undefined}
                rel={externo ? "noopener noreferrer" : undefined}
                onClick={fechar}
              >
                {aviso.link_texto || "Saiba mais"}
              </a>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
