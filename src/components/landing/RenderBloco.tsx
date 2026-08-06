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
import { FormularioContato } from "./blocos/FormularioContato";
import { BlocoUnidades } from "./blocos/BlocoUnidades";
import { AutocompleteExames } from "@/components/catalogo/AutocompleteExames";

const VERMELHO = "hsl(var(--brand))";
const AZUL = "hsl(var(--brand-2))";

// Marcador da linha do tempo: bolinha (padrão) ou ícone (gota de sangue, estrela, relógio).
const iconeMarco = (icone: string | undefined) => {
  const cls = "h-3.5 w-3.5";
  const st = { color: VERMELHO };
  // Gota e estrela preenchidas (senão o ícone fica "vazado"); relógio fica em contorno.
  if (icone === "sangue")
    return <Icons.Droplet className={cls} style={st} fill="currentColor" />;
  if (icone === "estrela")
    return <Icons.Star className={cls} style={st} fill="currentColor" />;
  if (icone === "relogio") return <Icons.Clock className={cls} style={st} />;
  return null;
};

const marcador = (icone: string | undefined, orient: "v" | "h") => {
  const ic = iconeMarco(icone);
  if (!ic) {
    const pos = orient === "v" ? "-left-[41px] top-1" : "-top-[9px] left-0";
    return (
      <span
        className={`absolute ${pos} h-4 w-4 rounded-full ring-4 ring-white`}
        style={{ backgroundColor: VERMELHO }}
      />
    );
  }
  const pos = orient === "v" ? "-left-[44px] top-0" : "-top-[12px] left-0";
  return (
    <span
      className={`absolute ${pos} flex h-6 w-6 items-center justify-center rounded-full border-2 bg-white ring-4 ring-white`}
      style={{ borderColor: VERMELHO }}
    >
      {ic}
    </span>
  );
};

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
          className="relative w-full -mt-28 min-h-[88vh] flex flex-col justify-center bg-no-repeat"
          style={{
            backgroundColor: "hsl(var(--brand-2))",
            backgroundImage: c.imagem_url
              ? `linear-gradient(90deg, rgba(15,35,71,0.85) 0%, rgba(15,35,71,0.55) 40%, rgba(15,35,71,0.1) 70%, rgba(15,35,71,0) 100%), url(${c.imagem_url})`
              : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center center",
          }}
        >
          {/* pt-28 garante que o conteúdo fique abaixo do cabeçalho (que flutua no topo) */}
          <div className="relative z-10 w-full max-w-[1200px] mx-auto px-6 pt-28 pb-16 md:pt-32 md:pb-20">
            <div className={`flex flex-col gap-4 ${alignClass} max-w-3xl ${c.alinhamento === "centro" ? "mx-auto" : ""}`}>
              {c.selo && (
                <span className="inline-flex w-fit items-center gap-2 rounded-pill bg-white/10 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur">
                  <Icons.FlaskConical className="h-4 w-4" /> {c.selo}
                </span>
              )}
              <h1 className="font-bold tracking-tight text-white text-[36px] md:text-[56px] leading-[1.1]">{c.titulo}</h1>
              {c.subtitulo && <p className="text-lg md:text-xl text-white/70 max-w-2xl">{c.subtitulo}</p>}
              {c.mostrar_busca ? (
                <div className={`flex w-full flex-col gap-3 sm:flex-row ${c.alinhamento === "centro" ? "justify-center" : ""}`}>
                  <div className="max-w-md flex-1">
                    <AutocompleteExames placeholder="Digite o exame (ex: Hemograma)" />
                  </div>
                  {c.escanear_link && (
                    <a
                      href={c.escanear_link}
                      className="inline-flex h-14 shrink-0 items-center justify-center gap-2 rounded-pill px-5 font-medium text-white transition hover:opacity-90"
                      style={{ backgroundColor: VERMELHO }}
                    >
                      <Icons.ScanLine className="h-5 w-5" /> Escanear pedido
                    </a>
                  )}
                </div>
              ) : c.cta_texto ? (
                <a
                  href={c.cta_link || "#"}
                  className="inline-block w-fit rounded-lg px-6 py-3 font-medium text-white transition hover:opacity-90"
                  style={{ backgroundColor: VERMELHO }}
                >
                  {c.cta_texto}
                </a>
              ) : null}
              {c.pills && c.pills.length > 0 && (
                <div className={`mt-2 flex flex-wrap gap-2 ${c.alinhamento === "centro" ? "justify-center" : ""}`}>
                  {c.pills.map((p, i) => {
                    const PillIcon = (Icons as any)[p.icone] ?? Icons.Check;
                    return (
                      <span key={i} className="inline-flex items-center gap-2 rounded-pill bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur">
                        <PillIcon className="h-4 w-4" /> {p.label}
                      </span>
                    );
                  })}
                </div>
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
      const cols = { 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-4" }[c.colunas ?? 3] ?? "md:grid-cols-3";
      return (
        <section className="w-full py-16 px-6" style={{ backgroundColor: "#F5F5F5" }}>
          <div className="max-w-[1200px] mx-auto">
            {c.titulo_tag && (
              <p className="text-center text-xs font-bold uppercase tracking-wider mb-2" style={{ color: VERMELHO }}>
                {c.titulo_tag}
              </p>
            )}
            {c.titulo_secao && (
              <h2 className="text-3xl font-bold text-center mb-10" style={{ color: AZUL }}>
                {c.titulo_secao}
              </h2>
            )}
            <div className={`grid grid-cols-1 ${cols} gap-6`}>
              {c.cards.map((card, i) => {
                const IconCmp = (Icons as any)[card.icone] ?? Icons.Circle;
                const conteudo = (
                  <>
                    {card.badge && (
                      <span className="absolute -top-3 left-6 rounded-full px-3 py-1 text-[11px] font-semibold text-white" style={{ backgroundColor: VERMELHO }}>
                        {card.badge}
                      </span>
                    )}
                    <IconCmp className="h-10 w-10" style={{ color: VERMELHO }} />
                    <h3 className="text-lg font-semibold" style={{ color: AZUL }}>{card.titulo}</h3>
                    <p className="text-sm text-gray-600">{card.descricao}</p>
                    {card.botao_texto && (
                      <a
                        href={card.botao_link || "#"}
                        className="mt-2 inline-block w-fit rounded-lg px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                        style={{ backgroundColor: VERMELHO }}
                      >
                        {card.botao_texto}
                      </a>
                    )}
                  </>
                );
                const base = `relative bg-white rounded-xl p-6 shadow-sm flex flex-col items-start gap-3 ${card.destaque ? "border-2" : "border border-transparent"}`;
                const style = card.destaque ? { borderColor: VERMELHO } : undefined;
                return card.link && !card.botao_texto ? (
                  <a key={i} href={card.link} className={`${base} transition hover:shadow-md`} style={style}>
                    {conteudo}
                  </a>
                ) : (
                  <div key={i} className={base} style={style}>
                    {conteudo}
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
      const duasColunas = c.colunas === 2;
      return (
        <section className="w-full py-16 px-6" style={{ backgroundColor: "#F5F5F5" }}>
          <div className={duasColunas ? "max-w-[1100px] mx-auto" : "max-w-[800px] mx-auto"}>
            {c.titulo_secao && (
              <h2 className="text-3xl font-bold text-center mb-8" style={{ color: AZUL }}>
                {c.titulo_secao}
              </h2>
            )}
            <Accordion
              type="single"
              collapsible
              className={duasColunas ? "grid md:grid-cols-2 gap-x-6" : "w-full"}
            >
              {c.perguntas.map((p, i) => (
                <AccordionItem
                  key={i}
                  value={`item-${i}`}
                  className="rounded-lg border bg-white px-4 mb-3"
                >
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
              {c.colunas.map((col) => {
                const tipoCol = col.tipo ?? "conteudo";
                if (tipoCol === "imagem") {
                  return (
                    <div key={col.id} className="flex flex-col gap-2">
                      {col.imagem_url ? (
                        <img src={col.imagem_url} alt={col.titulo} className="w-full h-auto rounded-xl" />
                      ) : (
                        <div className="w-full aspect-video rounded-xl bg-gray-200 flex items-center justify-center text-gray-400 text-sm">
                          Sem imagem
                        </div>
                      )}
                      {col.titulo && (
                        <p className="text-center text-sm text-gray-500">{col.titulo}</p>
                      )}
                    </div>
                  );
                }
                if (tipoCol === "video") {
                  const v = resolverVideo(col.video_url ?? "");
                  return (
                    <div key={col.id} className="flex flex-col gap-2">
                      <div
                        className="relative w-full overflow-hidden rounded-xl bg-black"
                        style={{ aspectRatio: "16 / 9" }}
                      >
                        {v.modo === "iframe" && (
                          <iframe
                            src={v.src}
                            title={col.titulo || "Vídeo"}
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
                      {col.titulo && (
                        <p className="text-center text-sm text-gray-500">{col.titulo}</p>
                      )}
                    </div>
                  );
                }
                if (tipoCol === "formulario") {
                  return (
                    <FormularioContato
                      key={col.id}
                      titulo={col.titulo}
                      botaoTexto={col.botao_texto}
                    />
                  );
                }
                return (
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
                );
              })}
            </div>
          </div>
        </section>
      );
    }
    case "linha_tempo": {
      const c = bloco.config;
      const horizontal = c.orientacao === "horizontal";
      return (
        <section className="w-full py-16 px-6 bg-white">
          <div className="max-w-[1200px] mx-auto">
            {c.titulo_secao && (
              <h2 className="text-3xl font-bold text-center mb-10" style={{ color: AZUL }}>
                {c.titulo_secao}
              </h2>
            )}
            {horizontal ? (
              // pt/px extras: o container com overflow-x recorta o eixo Y, então
              // damos folga para o marcador (que sobe acima da linha) não ser cortado.
              <div className="overflow-x-auto pt-5 pb-4 px-1">
                <ol className="flex gap-6 min-w-min">
                  {c.marcos.map((m) => (
                    <li
                      key={m.id}
                      className="relative w-64 shrink-0 border-t-2 pt-5"
                      style={{ borderColor: VERMELHO }}
                    >
                      {marcador(m.icone, "h")}
                      <div className="text-sm font-bold uppercase tracking-wide" style={{ color: VERMELHO }}>
                        {m.ano}
                      </div>
                      {m.titulo && (
                        <h3 className="mt-0.5 text-lg font-semibold" style={{ color: AZUL }}>
                          {m.titulo}
                        </h3>
                      )}
                      {m.texto && (
                        <p className="mt-1 text-sm text-gray-600 whitespace-pre-line leading-relaxed">
                          {m.texto}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              <ol className="relative border-l-2 pl-8 space-y-8 max-w-[800px] mx-auto" style={{ borderColor: VERMELHO }}>
                {c.marcos.map((m) => (
                  <li key={m.id} className="relative">
                    {marcador(m.icone, "v")}
                    <div className="text-sm font-bold uppercase tracking-wide" style={{ color: VERMELHO }}>
                      {m.ano}
                    </div>
                    {m.titulo && (
                      <h3 className="mt-0.5 text-lg font-semibold" style={{ color: AZUL }}>
                        {m.titulo}
                      </h3>
                    )}
                    {m.texto && (
                      <p className="mt-1 text-sm text-gray-600 whitespace-pre-line leading-relaxed">
                        {m.texto}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      );
    }
    case "equipe": {
      const c = bloco.config;
      const gridCols =
        { 3: "md:grid-cols-3", 4: "md:grid-cols-4" }[c.qtd_colunas] ?? "md:grid-cols-4";
      return (
        <section className="w-full py-16 px-6" style={{ backgroundColor: "#F5F5F5" }}>
          <div className="max-w-[1200px] mx-auto">
            {c.titulo_secao && (
              <h2 className="text-3xl font-bold text-center" style={{ color: AZUL }}>
                {c.titulo_secao}
              </h2>
            )}
            {c.subtitulo_secao && (
              <p className="text-center text-gray-600 mt-2 mb-10">{c.subtitulo_secao}</p>
            )}
            <div className={`grid grid-cols-2 ${gridCols} gap-8 ${c.subtitulo_secao ? "" : "mt-10"}`}>
              {c.membros.map((m) => (
                <div key={m.id} className="flex flex-col items-center text-center">
                  {m.foto_url ? (
                    <img
                      src={m.foto_url}
                      alt={m.nome}
                      className="h-32 w-32 rounded-full object-cover shadow-sm"
                    />
                  ) : (
                    <div className="h-32 w-32 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs">
                      Sem foto
                    </div>
                  )}
                  <h3 className="mt-4 text-base font-semibold" style={{ color: AZUL }}>
                    {m.nome}
                  </h3>
                  {m.cargo && (
                    <p className="mt-0.5 text-sm text-gray-600 whitespace-pre-line">{m.cargo}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    }
    case "busca_exame": {
      const c = bloco.config;
      return (
        <section className="w-full py-16 px-6" style={{ backgroundColor: "#F5F5F5" }}>
          <div className="max-w-[720px] mx-auto text-center">
            {c.titulo && (
              <h2 className="text-3xl font-bold mb-2" style={{ color: AZUL }}>
                {c.titulo}
              </h2>
            )}
            {c.subtitulo && <p className="text-gray-600 mb-6">{c.subtitulo}</p>}
            <AutocompleteExames placeholder={c.placeholder || "Digite o exame (ex: Hemograma)"} />
          </div>
        </section>
      );
    }
    case "passos": {
      const c = bloco.config;
      return (
        <section className="w-full py-16 px-6 bg-white">
          <div className="max-w-[1200px] mx-auto">
            {c.titulo_tag && (
              <p className="text-center text-xs font-bold uppercase tracking-wider mb-2" style={{ color: VERMELHO }}>
                {c.titulo_tag}
              </p>
            )}
            {c.titulo_secao && (
              <h2 className="text-3xl font-bold text-center mb-12" style={{ color: AZUL }}>
                {c.titulo_secao}
              </h2>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {c.passos.map((p, i) => {
                const IconCmp = (Icons as any)[p.icone] ?? Icons.Circle;
                return (
                  <div key={p.id} className="relative flex flex-col items-center text-center">
                    {i < c.passos.length - 1 && (
                      <span className="absolute top-4 left-1/2 hidden h-0.5 w-full bg-gray-200 lg:block" />
                    )}
                    <span
                      className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
                      style={{ backgroundColor: VERMELHO }}
                    >
                      {i + 1}
                    </span>
                    <IconCmp className="mt-4 h-7 w-7" style={{ color: AZUL }} />
                    <h3 className="mt-3 font-semibold" style={{ color: AZUL }}>{p.titulo}</h3>
                    <p className="mt-1 text-sm text-gray-600">{p.descricao}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      );
    }
    case "unidades":
      return <BlocoUnidades config={bloco.config} />;
  }
};
