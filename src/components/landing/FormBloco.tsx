import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowDown, ArrowUp, Loader2, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import type { Bloco } from "./tipos";
import { uid } from "./tipos";

type Props = {
  bloco: Bloco;
  onChange: (cfg: any) => void;
};

const UploadImagem = ({
  value,
  onChange,
  pasta = "landing-pages",
}: {
  value: string;
  onChange: (url: string) => void;
  pasta?: string;
}) => {
  const [up, setUp] = useState(false);
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUp(true);
    try {
      const path = `${pasta}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from("imagens-exames")
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("imagens-exames").getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Imagem enviada");
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao enviar imagem");
    } finally {
      setUp(false);
      e.target.value = "";
    }
  };
  return (
    <div className="space-y-2">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://..."
      />
      {value && (
        <img src={value} alt="" className="w-full h-32 object-cover rounded-md border" />
      )}
      <label className="inline-flex">
        <input type="file" accept="image/*" className="hidden" onChange={onFile} />
        <Button type="button" variant="outline" size="sm" disabled={up} asChild>
          <span className="cursor-pointer">
            {up ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {up ? "Enviando..." : "Enviar imagem"}
          </span>
        </Button>
      </label>
    </div>
  );
};

export const FormBloco = ({ bloco, onChange }: Props) => {
  const set = (campo: string, valor: any) => onChange({ ...bloco.config, [campo]: valor });

  if (bloco.tipo === "hero") {
    const c = bloco.config;
    return (
      <div className="space-y-4">
        <div className="space-y-2"><Label>Título</Label><Input value={c.titulo} onChange={(e) => set("titulo", e.target.value)} /></div>
        <div className="space-y-2"><Label>Subtítulo</Label><Textarea rows={2} value={c.subtitulo} onChange={(e) => set("subtitulo", e.target.value)} /></div>
        <div className="space-y-2"><Label>Imagem de fundo</Label><UploadImagem value={c.imagem_url} onChange={(v) => set("imagem_url", v)} /></div>
        <div className="space-y-2"><Label>Texto do botão</Label><Input value={c.cta_texto} onChange={(e) => set("cta_texto", e.target.value)} /></div>
        <div className="space-y-2"><Label>Link do botão</Label><Input value={c.cta_link} onChange={(e) => set("cta_link", e.target.value)} /></div>
        <div className="space-y-2">
          <Label>Alinhamento</Label>
          <Select value={c.alinhamento} onValueChange={(v) => set("alinhamento", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="esquerda">Esquerda</SelectItem>
              <SelectItem value="centro">Centro</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  if (bloco.tipo === "texto") {
    const c = bloco.config;
    return (
      <div className="space-y-4">
        <div className="space-y-2"><Label>Título</Label><Input value={c.titulo} onChange={(e) => set("titulo", e.target.value)} /></div>
        <div className="space-y-2"><Label>Conteúdo</Label><Textarea rows={8} value={c.conteudo} onChange={(e) => set("conteudo", e.target.value)} /></div>
      </div>
    );
  }

  if (bloco.tipo === "servicos") {
    const c = bloco.config;
    const setCard = (i: number, campo: string, valor: string) => {
      const novos = c.cards.map((card, idx) => (idx === i ? { ...card, [campo]: valor } : card));
      set("cards", novos);
    };
    return (
      <div className="space-y-4">
        <div className="space-y-2"><Label>Título da seção</Label><Input value={c.titulo_secao} onChange={(e) => set("titulo_secao", e.target.value)} /></div>
        <div className="space-y-3">
          <Label>Cards</Label>
          {c.cards.map((card, i) => (
            <div key={i} className="rounded-md border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Card {i + 1}</span>
                <Button size="sm" variant="ghost" onClick={() => set("cards", c.cards.filter((_, idx) => idx !== i))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Input placeholder="Ícone (ex: Heart)" value={card.icone} onChange={(e) => setCard(i, "icone", e.target.value)} />
              <Input placeholder="Título" value={card.titulo} onChange={(e) => setCard(i, "titulo", e.target.value)} />
              <Textarea placeholder="Descrição" rows={2} value={card.descricao} onChange={(e) => setCard(i, "descricao", e.target.value)} />
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => set("cards", [...c.cards, { icone: "Circle", titulo: "Novo card", descricao: "Descrição" }])}
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar card
          </Button>
          <p className="text-xs text-muted-foreground">
            Nomes dos ícones em PascalCase (lucide.dev). Ex: Heart, FlaskConical, Home.
          </p>
        </div>
      </div>
    );
  }

  if (bloco.tipo === "imagem-texto") {
    const c = bloco.config;
    return (
      <div className="space-y-4">
        <div className="space-y-2"><Label>Título</Label><Input value={c.titulo} onChange={(e) => set("titulo", e.target.value)} /></div>
        <div className="space-y-2"><Label>Texto</Label><Textarea rows={5} value={c.texto} onChange={(e) => set("texto", e.target.value)} /></div>
        <div className="space-y-2"><Label>Imagem</Label><UploadImagem value={c.imagem_url} onChange={(v) => set("imagem_url", v)} /></div>
        <div className="space-y-2">
          <Label>Posição da imagem</Label>
          <Select value={c.imagem_lado} onValueChange={(v) => set("imagem_lado", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="esquerda">Esquerda</SelectItem>
              <SelectItem value="direita">Direita</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  if (bloco.tipo === "cta") {
    const c = bloco.config;
    return (
      <div className="space-y-4">
        <div className="space-y-2"><Label>Título</Label><Input value={c.titulo} onChange={(e) => set("titulo", e.target.value)} /></div>
        <div className="space-y-2"><Label>Subtítulo</Label><Textarea rows={2} value={c.subtitulo} onChange={(e) => set("subtitulo", e.target.value)} /></div>
        <div className="space-y-2"><Label>Texto do botão</Label><Input value={c.botao_texto} onChange={(e) => set("botao_texto", e.target.value)} /></div>
        <div className="space-y-2"><Label>Link do botão</Label><Input value={c.botao_link} onChange={(e) => set("botao_link", e.target.value)} /></div>
        <div className="space-y-2">
          <Label>Cor de fundo</Label>
          <Select value={c.cor_fundo} onValueChange={(v) => set("cor_fundo", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="vermelho">Vermelho</SelectItem>
              <SelectItem value="azul">Azul</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  if (bloco.tipo === "faq") {
    const c = bloco.config;
    const setP = (i: number, campo: string, valor: string) => {
      const novas = c.perguntas.map((p, idx) => (idx === i ? { ...p, [campo]: valor } : p));
      set("perguntas", novas);
    };
    return (
      <div className="space-y-4">
        <div className="space-y-2"><Label>Título da seção</Label><Input value={c.titulo_secao} onChange={(e) => set("titulo_secao", e.target.value)} /></div>
        <div className="space-y-3">
          <Label>Perguntas</Label>
          {c.perguntas.map((p, i) => (
            <div key={i} className="rounded-md border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Pergunta {i + 1}</span>
                <Button size="sm" variant="ghost" onClick={() => set("perguntas", c.perguntas.filter((_, idx) => idx !== i))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Input placeholder="Pergunta" value={p.pergunta} onChange={(e) => setP(i, "pergunta", e.target.value)} />
              <Textarea placeholder="Resposta" rows={3} value={p.resposta} onChange={(e) => setP(i, "resposta", e.target.value)} />
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => set("perguntas", [...c.perguntas, { pergunta: "Nova pergunta", resposta: "Resposta" }])}
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar pergunta
          </Button>
        </div>
      </div>
    );
  }

  if (bloco.tipo === "depoimentos") {
    const c = bloco.config;
    const setD = (i: number, campo: string, valor: any) => {
      const novos = c.depoimentos.map((d, idx) => (idx === i ? { ...d, [campo]: valor } : d));
      set("depoimentos", novos);
    };
    return (
      <div className="space-y-4">
        <div className="space-y-2"><Label>Título</Label><Input value={c.titulo_secao} onChange={(e) => set("titulo_secao", e.target.value)} /></div>
        <div className="space-y-2"><Label>Subtítulo</Label><Input value={c.subtitulo_secao} onChange={(e) => set("subtitulo_secao", e.target.value)} /></div>
        <div className="space-y-3">
          <Label>Depoimentos</Label>
          {c.depoimentos.map((d, i) => (
            <div key={d.id} className="rounded-md border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Depoimento {i + 1}</span>
                <Button size="sm" variant="ghost" onClick={() => set("depoimentos", c.depoimentos.filter((_, idx) => idx !== i))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Input placeholder="Nome" value={d.nome} onChange={(e) => setD(i, "nome", e.target.value)} />
              <Textarea placeholder="Texto" rows={3} value={d.texto} onChange={(e) => setD(i, "texto", e.target.value)} />
              <div className="space-y-1">
                <Label className="text-xs">Foto</Label>
                <UploadImagem value={d.foto_url} onChange={(v) => setD(i, "foto_url", v)} pasta="landing-pages/depoimentos" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Estrelas: {d.estrelas}</Label>
                <Slider min={1} max={5} step={1} value={[d.estrelas]} onValueChange={(v) => setD(i, "estrelas", v[0])} />
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => set("depoimentos", [...c.depoimentos, { id: uid(), foto_url: "", nome: "Novo cliente", texto: "Depoimento", estrelas: 5 }])}
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar depoimento
          </Button>
        </div>
      </div>
    );
  }

  if (bloco.tipo === "estatisticas") {
    const c = bloco.config;
    const setI = (i: number, campo: string, valor: string) => {
      const novos = c.itens.map((it, idx) => (idx === i ? { ...it, [campo]: valor } : it));
      set("itens", novos);
    };
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Cor de fundo</Label>
          <Select value={c.cor_fundo} onValueChange={(v) => set("cor_fundo", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="branco">Branco</SelectItem>
              <SelectItem value="vermelho">Vermelho</SelectItem>
              <SelectItem value="azul">Azul</SelectItem>
              <SelectItem value="cinza">Cinza</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-3">
          <Label>Itens (até 6)</Label>
          {c.itens.map((it, i) => (
            <div key={it.id} className="rounded-md border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Item {i + 1}</span>
                <Button size="sm" variant="ghost" onClick={() => set("itens", c.itens.filter((_, idx) => idx !== i))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Número" value={it.numero} onChange={(e) => setI(i, "numero", e.target.value)} />
                <Input placeholder="Sufixo" value={it.sufixo} onChange={(e) => setI(i, "sufixo", e.target.value)} />
              </div>
              <Input placeholder="Descrição" value={it.descricao} onChange={(e) => setI(i, "descricao", e.target.value)} />
            </div>
          ))}
          {c.itens.length < 6 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => set("itens", [...c.itens, { id: uid(), numero: "0", sufixo: "", descricao: "Descrição" }])}
            >
              <Plus className="h-3.5 w-3.5" /> Adicionar item
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (bloco.tipo === "convenios") {
    const c = bloco.config;
    const setL = (i: number, campo: string, valor: string) => {
      const novos = c.logos.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l));
      set("logos", novos);
    };
    return (
      <div className="space-y-4">
        <div className="space-y-2"><Label>Título</Label><Input value={c.titulo_secao} onChange={(e) => set("titulo_secao", e.target.value)} /></div>
        <div className="space-y-3">
          <Label>Logos</Label>
          {c.logos.map((l, i) => (
            <div key={l.id} className="rounded-md border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Logo {i + 1}</span>
                <Button size="sm" variant="ghost" onClick={() => set("logos", c.logos.filter((_, idx) => idx !== i))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <UploadImagem value={l.imagem_url} onChange={(v) => setL(i, "imagem_url", v)} pasta="landing-pages/convenios" />
              <Input placeholder="Texto alternativo" value={l.alt} onChange={(e) => setL(i, "alt", e.target.value)} />
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => set("logos", [...c.logos, { id: uid(), imagem_url: "", alt: "" }])}
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar logo
          </Button>
        </div>
      </div>
    );
  }

  if (bloco.tipo === "exames_destaque") {
    return <FormExamesDestaque config={bloco.config} onChange={onChange} />;
  }

  if (bloco.tipo === "imagem") {
    const c = bloco.config;
    return (
      <div className="space-y-4">
        <div className="space-y-2"><Label>Imagem</Label><UploadImagem value={c.imagem_url} onChange={(v) => set("imagem_url", v)} /></div>
        <div className="space-y-2"><Label>Legenda (opcional)</Label><Input value={c.legenda} onChange={(e) => set("legenda", e.target.value)} /></div>
        <div className="space-y-2"><Label>Link ao clicar (opcional)</Label><Input value={c.link} onChange={(e) => set("link", e.target.value)} placeholder="https://..." /></div>
        <div className="space-y-2">
          <Label>Largura</Label>
          <Select value={c.largura} onValueChange={(v) => set("largura", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pequena">Pequena</SelectItem>
              <SelectItem value="media">Média</SelectItem>
              <SelectItem value="grande">Grande</SelectItem>
              <SelectItem value="total">Largura total</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  if (bloco.tipo === "video") {
    const c = bloco.config;
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>URL do vídeo</Label>
          <Input value={c.url} onChange={(e) => set("url", e.target.value)} placeholder="YouTube, Vimeo ou .mp4" />
          <p className="text-xs text-muted-foreground">
            Cole o link do YouTube/Vimeo ou a URL de um arquivo .mp4.
          </p>
        </div>
        <div className="space-y-2"><Label>Legenda (opcional)</Label><Input value={c.legenda} onChange={(e) => set("legenda", e.target.value)} /></div>
      </div>
    );
  }

  if (bloco.tipo === "espacador") {
    const c = bloco.config;
    return (
      <div className="space-y-2">
        <Label>Altura do espaço: {c.altura}px</Label>
        <Slider min={8} max={200} step={4} value={[c.altura]} onValueChange={(v) => set("altura", v[0])} />
      </div>
    );
  }

  if (bloco.tipo === "colunas") {
    const c = bloco.config;
    const setCol = (i: number, campo: string, valor: string) => {
      const novas = c.colunas.map((col, idx) => (idx === i ? { ...col, [campo]: valor } : col));
      set("colunas", novas);
    };
    return (
      <div className="space-y-4">
        <div className="space-y-2"><Label>Título da seção (opcional)</Label><Input value={c.titulo_secao} onChange={(e) => set("titulo_secao", e.target.value)} /></div>
        <div className="space-y-2">
          <Label>Nº de colunas (no computador)</Label>
          <Select value={String(c.qtd_colunas)} onValueChange={(v) => set("qtd_colunas", Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2 colunas</SelectItem>
              <SelectItem value="3">3 colunas</SelectItem>
              <SelectItem value="4">4 colunas</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">No celular as colunas ficam empilhadas.</p>
        </div>
        <div className="space-y-3">
          <Label>Colunas</Label>
          {c.colunas.map((col, i) => {
            const tipoCol = col.tipo ?? "conteudo";
            return (
              <div key={col.id} className="rounded-md border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Coluna {i + 1}</span>
                  <Button size="sm" variant="ghost" onClick={() => set("colunas", c.colunas.filter((_, idx) => idx !== i))}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tipo de conteúdo</Label>
                  <Select value={tipoCol} onValueChange={(v) => setCol(i, "tipo", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conteudo">Texto / imagem + botão</SelectItem>
                      <SelectItem value="imagem">Somente imagem</SelectItem>
                      <SelectItem value="video">Vídeo</SelectItem>
                      <SelectItem value="formulario">Formulário de contato</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {tipoCol === "conteudo" && (
                  <>
                    <UploadImagem value={col.imagem_url} onChange={(v) => setCol(i, "imagem_url", v)} pasta="landing-pages/colunas" />
                    <Input placeholder="Título" value={col.titulo} onChange={(e) => setCol(i, "titulo", e.target.value)} />
                    <Textarea placeholder="Texto" rows={3} value={col.texto} onChange={(e) => setCol(i, "texto", e.target.value)} />
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Texto do botão" value={col.botao_texto} onChange={(e) => setCol(i, "botao_texto", e.target.value)} />
                      <Input placeholder="Link do botão" value={col.botao_link} onChange={(e) => setCol(i, "botao_link", e.target.value)} />
                    </div>
                  </>
                )}

                {tipoCol === "imagem" && (
                  <>
                    <UploadImagem value={col.imagem_url} onChange={(v) => setCol(i, "imagem_url", v)} pasta="landing-pages/colunas" />
                    <Input placeholder="Legenda (opcional)" value={col.titulo} onChange={(e) => setCol(i, "titulo", e.target.value)} />
                  </>
                )}

                {tipoCol === "video" && (
                  <>
                    <Input placeholder="URL do vídeo (YouTube, Vimeo ou .mp4)" value={col.video_url} onChange={(e) => setCol(i, "video_url", e.target.value)} />
                    <Input placeholder="Legenda (opcional)" value={col.titulo} onChange={(e) => setCol(i, "titulo", e.target.value)} />
                  </>
                )}

                {tipoCol === "formulario" && (
                  <>
                    <Input placeholder="Título do formulário (opcional)" value={col.titulo} onChange={(e) => setCol(i, "titulo", e.target.value)} />
                    <Input placeholder="Texto do botão (padrão: Enviar)" value={col.botao_texto} onChange={(e) => setCol(i, "botao_texto", e.target.value)} />
                    <p className="text-xs text-muted-foreground">
                      Campos: nome, e-mail, telefone e mensagem. Os envios chegam por e-mail aos endereços
                      configurados em Configurações (RESEND_EMAILS_ADMIN).
                    </p>
                  </>
                )}
              </div>
            );
          })}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => set("colunas", [...c.colunas, { id: uid(), tipo: "conteudo", imagem_url: "", video_url: "", titulo: "Nova coluna", texto: "", botao_texto: "", botao_link: "" }])}
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar coluna
          </Button>
        </div>
      </div>
    );
  }

  if (bloco.tipo === "linha_tempo") {
    const c = bloco.config;
    const setM = (i: number, campo: string, valor: string) => {
      const novos = c.marcos.map((m, idx) => (idx === i ? { ...m, [campo]: valor } : m));
      set("marcos", novos);
    };
    return (
      <div className="space-y-4">
        <div className="space-y-2"><Label>Título da seção</Label><Input value={c.titulo_secao} onChange={(e) => set("titulo_secao", e.target.value)} /></div>
        <div className="space-y-2">
          <Label>Orientação</Label>
          <Select value={c.orientacao ?? "vertical"} onValueChange={(v) => set("orientacao", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="vertical">Vertical (empilhada)</SelectItem>
              <SelectItem value="horizontal">Horizontal (rolagem lateral)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-3">
          <Label>Marcos (por ano)</Label>
          {c.marcos.map((m, i) => (
            <div key={m.id} className="rounded-md border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Marco {i + 1}</span>
                <Button size="sm" variant="ghost" onClick={() => set("marcos", c.marcos.filter((_, idx) => idx !== i))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Input placeholder="Ano" value={m.ano} onChange={(e) => setM(i, "ano", e.target.value)} />
                <Input className="col-span-2" placeholder="Título" value={m.titulo} onChange={(e) => setM(i, "titulo", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ícone</Label>
                <Select value={m.icone ?? "bolinha"} onValueChange={(v) => setM(i, "icone", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bolinha">● Bolinha</SelectItem>
                    <SelectItem value="sangue">🩸 Gota de sangue</SelectItem>
                    <SelectItem value="estrela">★ Estrela</SelectItem>
                    <SelectItem value="relogio">⏱ Relógio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Textarea placeholder="Descrição" rows={2} value={m.texto} onChange={(e) => setM(i, "texto", e.target.value)} />
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => set("marcos", [...c.marcos, { id: uid(), ano: "", titulo: "", texto: "", icone: "bolinha" }])}
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar marco
          </Button>
        </div>
      </div>
    );
  }

  if (bloco.tipo === "equipe") {
    const c = bloco.config;
    const setMem = (i: number, campo: string, valor: string) => {
      const novos = c.membros.map((m, idx) => (idx === i ? { ...m, [campo]: valor } : m));
      set("membros", novos);
    };
    return (
      <div className="space-y-4">
        <div className="space-y-2"><Label>Título da seção</Label><Input value={c.titulo_secao} onChange={(e) => set("titulo_secao", e.target.value)} /></div>
        <div className="space-y-2"><Label>Subtítulo (opcional)</Label><Input value={c.subtitulo_secao} onChange={(e) => set("subtitulo_secao", e.target.value)} /></div>
        <div className="space-y-2">
          <Label>Nº de colunas (no computador)</Label>
          <Select value={String(c.qtd_colunas)} onValueChange={(v) => set("qtd_colunas", Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 colunas</SelectItem>
              <SelectItem value="4">4 colunas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-3">
          <Label>Membros</Label>
          {c.membros.map((m, i) => (
            <div key={m.id} className="rounded-md border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Membro {i + 1}</span>
                <Button size="sm" variant="ghost" onClick={() => set("membros", c.membros.filter((_, idx) => idx !== i))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <UploadImagem value={m.foto_url} onChange={(v) => setMem(i, "foto_url", v)} pasta="landing-pages/equipe" />
              <Input placeholder="Nome" value={m.nome} onChange={(e) => setMem(i, "nome", e.target.value)} />
              <Input placeholder="Cargo / função" value={m.cargo} onChange={(e) => setMem(i, "cargo", e.target.value)} />
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => set("membros", [...c.membros, { id: uid(), foto_url: "", nome: "Novo membro", cargo: "" }])}
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar membro
          </Button>
        </div>
      </div>
    );
  }

  return null;
};

// ===== Form especializado para Exames em destaque (com busca) =====

type ExameSel = { id: string; codigo_shift: string; nome: string };

const FormExamesDestaque = ({
  config,
  onChange,
}: {
  config: { titulo_secao: string; subtitulo_secao: string; exames_ids: string[]; mostrar_botao_carrinho: boolean };
  onChange: (cfg: any) => void;
}) => {
  const set = (campo: string, valor: any) => onChange({ ...config, [campo]: valor });
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<ExameSel[]>([]);
  const [selecionados, setSelecionados] = useState<ExameSel[]>([]);
  const [buscando, setBuscando] = useState(false);
  const debRef = useRef<number | null>(null);

  // Carregar dados dos exames já selecionados
  useEffect(() => {
    if (config.exames_ids.length === 0) {
      setSelecionados([]);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("exames_cache")
        .select("id, codigo_shift, nome")
        .in("id", config.exames_ids);
      const mapa = new Map((data ?? []).map((e: any) => [e.id, e as ExameSel]));
      setSelecionados(config.exames_ids.map((id) => mapa.get(id)).filter(Boolean) as ExameSel[]);
    })();
  }, [JSON.stringify(config.exames_ids)]);

  // Buscar exames
  useEffect(() => {
    if (debRef.current) window.clearTimeout(debRef.current);
    if (busca.trim().length < 2) {
      setResultados([]);
      return;
    }
    debRef.current = window.setTimeout(async () => {
      setBuscando(true);
      const { data } = await supabase
        .from("exames_cache")
        .select("id, codigo_shift, nome")
        .or(`nome.ilike.%${busca}%,codigo_shift.ilike.%${busca}%`)
        .eq("ativo", true)
        .limit(20);
      setResultados((data ?? []) as ExameSel[]);
      setBuscando(false);
    }, 300);
  }, [busca]);

  const adicionar = (e: ExameSel) => {
    if (config.exames_ids.includes(e.id)) return;
    set("exames_ids", [...config.exames_ids, e.id]);
    setBusca("");
    setResultados([]);
  };

  const remover = (id: string) => {
    set("exames_ids", config.exames_ids.filter((x) => x !== id));
  };

  const mover = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= config.exames_ids.length) return;
    const copia = [...config.exames_ids];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    set("exames_ids", copia);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2"><Label>Título</Label><Input value={config.titulo_secao} onChange={(e) => set("titulo_secao", e.target.value)} /></div>
      <div className="space-y-2"><Label>Subtítulo</Label><Input value={config.subtitulo_secao} onChange={(e) => set("subtitulo_secao", e.target.value)} /></div>
      <div className="flex items-center justify-between rounded-md border p-3">
        <Label className="text-sm">Mostrar botão "Adicionar ao carrinho"</Label>
        <Switch checked={config.mostrar_botao_carrinho} onCheckedChange={(v) => set("mostrar_botao_carrinho", v)} />
      </div>
      <div className="space-y-2">
        <Label>Buscar exames</Label>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Nome ou código..."
            className="pl-8"
          />
        </div>
        {buscando && <p className="text-xs text-muted-foreground">Buscando...</p>}
        {resultados.length > 0 && (
          <div className="rounded-md border max-h-48 overflow-y-auto">
            {resultados.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => adicionar(r)}
                disabled={config.exames_ids.includes(r.id)}
                className="w-full text-left p-2 hover:bg-muted text-sm border-b last:border-b-0 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <p className="font-medium truncate">{r.nome}</p>
                <p className="text-xs text-muted-foreground">Cód. {r.codigo_shift}</p>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-2">
        <Label>Selecionados ({selecionados.length})</Label>
        {selecionados.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhum exame selecionado</p>
        )}
        {selecionados.map((e, i) => (
          <div key={e.id} className="flex items-center gap-2 rounded-md border p-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{e.nome}</p>
              <p className="text-xs text-muted-foreground">Cód. {e.codigo_shift}</p>
            </div>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => mover(i, -1)} disabled={i === 0}>
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => mover(i, 1)} disabled={i === selecionados.length - 1}>
              <ArrowDown className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remover(e.id)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
