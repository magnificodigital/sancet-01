import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";

async function extrairErro(error: unknown, fallback: string): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (body?.error) return String(body.error);
    } catch {
      try {
        const txt = await error.context.text();
        if (txt) return txt;
      } catch {}
    }
  }
  if (error && typeof error === "object" && "message" in error) {
    const m = String((error as any).message ?? "");
    if (m && !/non-2xx/i.test(m)) return m;
  }
  return fallback;
}
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import bannerSancet from "@/assets/banner-sancet.png";

type Etapa = "senha" | "codigo";

const Entrar = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [etapa, setEtapa] = useState<Etapa>("senha");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [codigo, setCodigo] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const redirect = params.get("redirect") || "/agendamentos";

  const iniciarCooldown = () => {
    setCooldown(30);
    const iv = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(iv);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const pedirCodigo = async () => {
    if (!email.trim() || !senha) {
      toast.error("Informe seu e-mail e sua senha.");
      return;
    }
    setCarregando(true);
    const { data, error } = await supabase.functions.invoke("sancet-login-etapa1", {
      body: { email: email.trim().toLowerCase(), senha },
    });
    if (error || (data as any)?.error) {
      const msg =
        (data as any)?.error ||
        (await extrairErro(error, "Não foi possível enviar o código."));
      setCarregando(false);
      toast.error(msg, {
        action: /senha incorret/i.test(msg)
          ? { label: "Primeiro acesso", onClick: () => navigate("/primeiro-acesso") }
          : undefined,
      });
      return;
    }
    setCarregando(false);
    toast.success("Código enviado! Verifique seu e-mail.");
    setEtapa("codigo");
    iniciarCooldown();
  };

  const confirmarCodigo = async () => {
    if (codigo.length !== 6) {
      toast.error("Digite os 6 dígitos do código.");
      return;
    }
    setCarregando(true);
    const { data, error } = await supabase.functions.invoke("sancet-login-etapa2", {
      body: { email: email.trim().toLowerCase(), codigo },
    });
    if (error || (data as any)?.error) {
      const msg =
        (data as any)?.error || (await extrairErro(error, "Código incorreto."));
      setCarregando(false);
      // Se o código já foi usado/expirou, limpa o campo e sugere reenviar
      if (/pendente|expirad|incorret|tentativas/i.test(msg)) setCodigo("");
      toast.error(msg);
      return;
    }
    const { email: em, token_hash } = data as { email: string; token_hash: string };
    const { error: verifyErr } = await supabase.auth.verifyOtp({
      email: em,
      token_hash,
      type: "magiclink",
    });
    setCarregando(false);
    if (verifyErr) {
      toast.error(verifyErr.message);
      return;
    }
    toast.success("Bem-vindo(a)!");
    navigate(redirect);
  };

  return (
    <div
      className="relative min-h-screen bg-cover bg-center flex items-center justify-center px-4 py-8"
      style={{ backgroundImage: `url(${bannerSancet})` }}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative w-full max-w-md bg-white/95 backdrop-blur rounded-2xl p-6 md:p-8 shadow-xl">
        <button
          type="button"
          onClick={() => (etapa === "codigo" ? setEtapa("senha") : navigate("/"))}
          className="inline-flex items-center gap-1 text-sm font-semibold text-[#C8102E] hover:underline mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>

        {etapa === "senha" ? (
          <>
            <h1 className="text-3xl md:text-4xl font-extrabold text-secondary mb-2">Entrar</h1>
            <p className="text-muted-foreground mb-8">
              Acesse com seu e-mail e senha. Enviaremos um código de verificação.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                pedirCodigo();
              }}
              className="flex flex-col gap-5"
            >
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="voce@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="senha">Senha</Label>
                <Input
                  id="senha"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Sua senha"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
                <Link
                  to="/esqueci-senha"
                  className="text-xs text-[#C8102E] font-semibold hover:underline"
                >
                  Esqueci minha senha
                </Link>
              </div>

              <Button
                type="submit"
                disabled={carregando}
                className="w-full bg-[#C8102E] hover:bg-[#a80d26] text-white font-semibold h-11"
              >
                {carregando ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Enviando código...
                  </>
                ) : (
                  "Continuar"
                )}
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" asChild className="h-11 font-semibold">
                  <Link to="/cadastro">Fazer cadastro</Link>
                </Button>
                <Button type="button" variant="outline" asChild className="h-11 font-semibold">
                  <Link to="/primeiro-acesso">Primeiro acesso</Link>
                </Button>
              </div>
            </form>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-[#C8102E]/10 text-[#C8102E]">
                <Mail className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-extrabold text-secondary">Confirme o código</h1>
            </div>
            <p className="text-muted-foreground mb-6 text-sm">
              Enviamos um código de 6 dígitos para <b>{email}</b>. Expira em 10 minutos.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                confirmarCodigo();
              }}
              className="flex flex-col gap-5"
            >
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={codigo} onChange={setCodigo}>
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                type="submit"
                disabled={carregando || codigo.length !== 6}
                className="w-full bg-[#C8102E] hover:bg-[#a80d26] text-white font-semibold h-11"
              >
                {carregando ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Confirmando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => setEtapa("senha")}
                  className="text-muted-foreground hover:underline"
                >
                  Trocar e-mail
                </button>
                <button
                  type="button"
                  disabled={cooldown > 0 || carregando}
                  onClick={pedirCodigo}
                  className="text-[#C8102E] font-semibold hover:underline disabled:opacity-50 disabled:no-underline"
                >
                  {cooldown > 0 ? `Reenviar em ${cooldown}s` : "Reenviar código"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default Entrar;
