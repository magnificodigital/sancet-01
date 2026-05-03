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
}: {
  value: string;
  onChange: (url: string) => void;
}) => {
  const [up, setUp] = useState(false);
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUp(true);
    try {
      const path = `landing-pages/${Date.now()}-${file.name}`;
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

  return null;
};
