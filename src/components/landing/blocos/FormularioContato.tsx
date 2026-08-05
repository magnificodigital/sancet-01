import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const VERMELHO = "#C8102E";
const AZUL = "#1B3A6B";

type Props = { titulo?: string; botaoTexto?: string };

export const FormularioContato = ({ titulo, botaoTexto }: Props) => {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !mensagem.trim()) {
      toast.error("Preencha nome e mensagem.");
      return;
    }
    setEnviando(true);
    try {
      const { data, error } = await supabase.functions.invoke("sancet-contato-email", {
        body: {
          nome: nome.trim(),
          email: email.trim(),
          telefone: telefone.trim(),
          mensagem: mensagem.trim(),
          pagina: typeof window !== "undefined" ? window.location.pathname : "",
        },
      });
      if (error) throw error;
      if (data && (data as any).ok === false) {
        throw new Error((data as any).reason || "Falha ao enviar");
      }
      setEnviado(true);
      toast.success("Mensagem enviada!");
    } catch {
      toast.error("Não foi possível enviar. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  };

  if (enviado) {
    return (
      <div className="rounded-xl border bg-white p-6 text-center text-sm text-gray-600">
        Mensagem enviada! Em breve entraremos em contato. 🙌
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="rounded-xl border bg-white p-5 space-y-3 text-left">
      {titulo && (
        <h3 className="text-lg font-semibold" style={{ color: AZUL }}>
          {titulo}
        </h3>
      )}
      <Input placeholder="Seu nome *" value={nome} onChange={(e) => setNome(e.target.value)} />
      <Input
        type="email"
        placeholder="Seu e-mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input
        placeholder="Telefone"
        value={telefone}
        onChange={(e) => setTelefone(e.target.value)}
      />
      <Textarea
        rows={4}
        placeholder="Sua mensagem *"
        value={mensagem}
        onChange={(e) => setMensagem(e.target.value)}
      />
      <Button
        type="submit"
        disabled={enviando}
        className="w-full text-white transition hover:opacity-90"
        style={{ backgroundColor: VERMELHO }}
      >
        {enviando ? "Enviando..." : botaoTexto || "Enviar"}
      </Button>
    </form>
  );
};
