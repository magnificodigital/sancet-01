import * as Icons from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { Bloco } from "./tipos";
import { BlocoDepoimentos } from "./blocos/BlocoDepoimentos";
import { BlocoEstatisticas } from "./blocos/BlocoEstatisticas";
import { BlocoConvenios } from "./blocos/BlocoConvenios";
import { BlocoExamesDestaque } from "./blocos/BlocoExamesDestaque";

const VERMELHO = "#C8102E";
const AZUL = "#1B3A6B";

// Converte a URL do vídeo em um alvo embutível (YouTube/Vimeo → iframe; .mp4 → <video>).
const resolverVideo = (url: string): { modo: "iframe" | "video" | "vazio"; src: string } => {
  if (!url.trim()) return { modo: "vazio", src: "" };
  const yt = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/,
  );
  if (yt) return { modo: "iframe", src: `https://www.youtube.com/embed/${yt[1]}` };
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return { modo: "iframe", src: `https://player.vimeo.com/video/${vm[1]}` };
  if (/\.(mp4|webm|ogg)(\?|#|$)/i.test(url)) return { modo: "video", src: url };
  return { modo: "iframe", src: url };
};

export const RenderBloco = ({ bloco }: { bloco: Bloco }) => {
  switch (bloco.tipo) {
    case "hero": {
      const c = bloco.config;
      const alignClass = c.alinhamento === "centro" ? "text-center items-center" : "text-left items-start";
      return (
        <section
          className="relative w-full h-[500px] flex"
          style={{
            backgroundColor: "#1B3A6B",
            backgroundImage: c.imagem_url ? `url(${c.imagem_url})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative z-10 w-full max-w-[1200px] mx-auto px-6 flex flex-col justify-center">
            <div className={`flex flex-col gap-4 ${alignClass} max-w-2xl ${c.alinhamento === "centro" ? "mx-auto" : ""}`}>
              <h1 className="text-4xl md:text-5xl font-bold text-white">{c.titulo}</h1>
              {c.subtitulo && <p className="text-lg text-white/90">{c.subtitulo}</p>}
              {c.cta_texto && (
                <a
                  href={c.cta_link || "#"}
                  className="inline-block px-6 py-3 rounded-lg font-medium text-white transition hover:opacity-90 w-fit"
                  style={{ backgroundColor: VERMELHO }}
                >
                  {c.cta_texto}
                </a>
              )}
            </div>
          </div>
        </section>
      );
    }
    case "texto": {
      const c = bloco.config;
      return (
        <section className="w-full py-12 px-6 bg-white">
          <div className="max-w-[800px] mx-auto space-y-4">
            {c.titulo && <h2 className="text-3xl font-bold" style={{ color: AZUL }}>{c.titulo}</h2>}
            {c.conteudo && (
              <div className="text-base text-gray-700 whitespace-pre-line leading-relaxed">{c.conteudo}</div>
            )}
          </div>
        </section>
      );
    }
    case "servicos": {
      const c = bloco.config;
      return (
        <section className="w-full py-16 px-6" style={{ backgroundColor: "#F5F5F5" }}>
          <div className="max-w-[1200px] mx-auto">
            {c.titulo_secao && (
              <h2 className="text-3xl font-bold text-center mb-10" style={{ color: AZUL }}>
                {c.titulo_secao}
              </h2>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {c.cards.map((card, i) => {
                const IconCmp = (Icons as any)[card.icone] ?? Icons.Circle;
                return (
                  <div key={i} className="bg-white rounded-xl p-6 shadow-sm flex flex-col items-start gap-3">
                    <IconCmp className="h-8 w-8" style={{ color: VERMELHO }} />
                    <h3 className="text-lg font-semibold" style={{ color: AZUL }}>{card.titulo}</h3>
                    <p className="text-sm text-gray-600">{card.descricao}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      );
    }
    case "imagem-texto": {
      const c = bloco.config;
      const imgEsq = c.imagem_lado === "esquerda";
      return (
        <section className="w-full py-16 px-6 bg-white">
          <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div className={imgEsq ? "order-1" : "order-1 md:order-2"}>
              {c.imagem_url ? (
                <img src={c.imagem_url} alt={c.titulo} className="w-full h-auto rounded-xl object-cover" />
              ) : (
                <div className="w-full aspect-video rounded-xl bg-gray-200 flex items-center justify-center text-gray-400">
                  Sem imagem
                </div>
              )}
            </div>
            <div className={imgEsq ? "order-2" : "order-2 md:order-1"}>
              <h2 className="text-3xl font-bold mb-4" style={{ color: AZUL }}>{c.titulo}</h2>
              <p className="text-gray-700 whitespace-pre-line leading-relaxed">{c.texto}</p>
            </div>
          </div>
        </section>
      );
    }
    case "cta": {
      const c = bloco.config;
      const bg = c.cor_fundo === "azul" ? AZUL : VERMELHO;
      return (
        <section className="w-full py-16 px-6" style={{ backgroundColor: bg }}>
          <div className="max-w-[1200px] mx-auto text-center text-white space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold">{c.titulo}</h2>
            {c.subtitulo && <p className="text-lg opacity-90">{c.subtitulo}</p>}
            {c.botao_texto && (
              <a
                href={c.botao_link || "#"}
                className="inline-block px-7 py-3 rounded-lg font-medium bg-white transition hover:opacity-90"
                style={{ color: bg }}
              >
                {c.botao_texto}
              </a>
            )}
          </div>
        </section>
      );
    }
    case "faq": {
      const c = bloco.config;
      return (
        <section className="w-full py-16 px-6 bg-white">
          <div className="max-w-[800px] mx-auto">
            {c.titulo_secao && (
              <h2 className="text-3xl font-bold text-center mb-8" style={{ color: AZUL }}>
                {c.titulo_secao}
              </h2>
            )}
            <Accordion type="single" collapsible className="w-full">
              {c.perguntas.map((p, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger className="text-left">{p.pergunta}</AccordionTrigger>
                  <AccordionContent className="whitespace-pre-line">{p.resposta}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      );
    }
    case "depoimentos":
      return <BlocoDepoimentos config={bloco.config} />;
    case "estatisticas":
      return <BlocoEstatisticas config={bloco.config} />;
    case "convenios":
      return <BlocoConvenios config={bloco.config} />;
    case "exames_destaque":
      return <BlocoExamesDestaque config={bloco.config} />;
    case "imagem": {
      const c = bloco.config;
      const maxW = { pequena: "400px", media: "600px", grande: "900px", total: "1200px" }[
        c.largura
      ];
      const img = c.imagem_url ? (
        <img src={c.imagem_url} alt={c.legenda} className="w-full h-auto rounded-xl" />
      ) : (
        <div className="w-full aspect-video rounded-xl bg-gray-200 flex items-center justify-center text-gray-400">
          Sem imagem
        </div>
      );
      return (
        <section className="w-full py-8 px-6 bg-white">
          <figure className="mx-auto" style={{ maxWidth: maxW }}>
            {c.link ? (
              <a href={c.link} target="_blank" rel="noreferrer">
                {img}
              </a>
            ) : (
              img
            )}
            {c.legenda && (
              <figcaption className="mt-2 text-center text-sm text-gray-500">
                {c.legenda}
              </figcaption>
            )}
          </figure>
        </section>
      );
    }
    case "video": {
      const c = bloco.config;
      const v = resolverVideo(c.url);
      return (
        <section className="w-full py-8 px-6 bg-white">
          <div className="mx-auto max-w-[900px]">
            <div
              className="relative w-full overflow-hidden rounded-xl bg-black"
              style={{ aspectRatio: "16 / 9" }}
            >
              {v.modo === "iframe" && (
                <iframe
                  src={v.src}
                  title={c.legenda || "Vídeo"}
                  className="absolute inset-0 h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
              {v.modo === "video" && (
                <video src={v.src} controls className="absolute inset-0 h-full w-full" />
              )}
              {v.modo === "vazio" && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-white/60">
                  Adicione a URL do vídeo
                </div>
              )}
            </div>
            {c.legenda && (
              <p className="mt-2 text-center text-sm text-gray-500">{c.legenda}</p>
            )}
          </div>
        </section>
      );
    }
    case "espacador": {
      const c = bloco.config;
      return <div aria-hidden style={{ height: `${c.altura}px` }} className="w-full" />;
    }
    case "colunas": {
      const c = bloco.config;
      const gridCols =
        { 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-4" }[c.qtd_colunas] ??
        "md:grid-cols-3";
      return (
        <section className="w-full py-16 px-6 bg-white">
          <div className="max-w-[1200px] mx-auto">
            {c.titulo_secao && (
              <h2 className="text-3xl font-bold text-center mb-10" style={{ color: AZUL }}>
                {c.titulo_secao}
              </h2>
            )}
            <div className={`grid grid-cols-1 ${gridCols} gap-8`}>
              {c.colunas.map((col) => (
                <div key={col.id} className="flex flex-col gap-3">
                  {col.imagem_url && (
                    <img
                      src={col.imagem_url}
                      alt={col.titulo}
                      className="w-full h-auto rounded-xl object-cover"
                    />
                  )}
                  {col.titulo && (
                    <h3 className="text-lg font-semibold" style={{ color: AZUL }}>
                      {col.titulo}
                    </h3>
                  )}
                  {col.texto && (
                    <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">
                      {col.texto}
                    </p>
                  )}
                  {col.botao_texto && (
                    <a
                      href={col.botao_link || "#"}
                      className="mt-1 inline-block w-fit px-4 py-2 rounded-lg text-sm font-medium text-white transition hover:opacity-90"
                      style={{ backgroundColor: VERMELHO }}
                    >
                      {col.botao_texto}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    }
  }
};
