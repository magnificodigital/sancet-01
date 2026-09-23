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
import { sincronizarPacienteAuth } from "@/hooks/usePaciente";

const aguardarSessaoLocal = async () => {
  for (let tentativa = 0; tentativa < 20; tentativa += 1) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) return true;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return false;
};

type Etapa = "senha" | "codigo";

// No celular, o paciente sai do navegador para ler o código no app de e-mail.
// Ao voltar, o navegador pode RECARREGAR a página e o app "esquecia" que estava
// na etapa do código (voltava para o login). Guardamos a etapa por 10 min.
const CHAVE_ETAPA = "sancet_login_etapa_codigo";
const lerEtapaSalva = (): { email: string } | null => {
  try {
    const r = JSON.parse(localStorage.getItem(CHAVE_ETAPA) || "null");
    if (r?.email && Date.now() - Number(r.ts) < 10 * 60 * 1000) return { email: r.email };
  } catch {
    /* storage indisponível */
  }
  return null;
};
const salvarEtapa = (email: string) => {
  try {
    localStorage.setItem(CHAVE_ETAPA, JSON.stringify({ email, ts: Date.now() }));
  } catch {
    /* ignora */
  }
};
const limparEtapa = () => {
  try {
    localStorage.removeItem(CHAVE_ETAPA);
  } catch {
    /* ignora */
  }
};

const Entrar = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [etapa, setEtapa] = useState<Etapa>(() => (lerEtapaSalva() ? "codigo" : "senha"));
  const [email, setEmail] = useState(() => lerEtapaSalva()?.email ?? "");
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
        // Se a conta ainda não existe (paciente antigo sem login), o cadastro
        // já reconhece o CPF e vincula — é o caminho único agora.
        action: /senha incorret/i.test(msg)
          ? { label: "Criar conta", onClick: () => navigate("/cadastro") }
          : undefined,
      });
      return;
    }
    setCarregando(false);
    toast.success("Código enviado! Verifique seu e-mail.");
    setEtapa("codigo");
    salvarEtapa(email.trim().toLowerCase());
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
    const { token_hash } = data as { email: string; token_hash: string };
    const { error: verifyErr } = await supabase.auth.verifyOtp({
      token_hash,
      type: "magiclink",
    });
    if (verifyErr) {
      setCarregando(false);
      toast.error(verifyErr.message);
      return;
    }
    const sessaoPronta = await aguardarSessaoLocal();
    const sessaoSincronizada = sessaoPronta ? await sincronizarPacienteAuth() : null;
    setCarregando(false);
    if (!sessaoSincronizada?.user) {
      toast.error("Não foi possível iniciar sua sessão. Solicite um novo código e tente novamente.");
      return;
    }
    limparEtapa();
    toast.success("Bem-vindo(a)!");
    navigate(redirect, { replace: true });
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
          onClick={() => {
            limparEtapa();
            if (etapa === "codigo") setEtapa("senha");
            else navigate("/");
          }}
          className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline mb-6"
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
                  className="text-xs text-brand font-semibold hover:underline"
                >
                  Esqueci minha senha
                </Link>
              </div>

              <Button
                type="submit"
                disabled={carregando}
                className="w-full bg-brand hover:bg-brand-hover text-white font-semibold h-11"
              >
                {carregando ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Enviando código...
                  </>
                ) : (
                  "Continuar"
                )}
              </Button>

              <Button type="button" variant="outline" asChild className="h-11 font-semibold">
                <Link to="/cadastro">Fazer cadastro</Link>
              </Button>
            </form>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-brand/10 text-brand">
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
                className="w-full bg-brand hover:bg-brand-hover text-white font-semibold h-11"
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
                  onClick={() => {
                    limparEtapa();
                    setEtapa("senha");
                  }}
                  className="text-muted-foreground hover:underline"
                >
                  Trocar e-mail
                </button>
                <button
                  type="button"
                  disabled={cooldown > 0 || carregando}
                  onClick={() => {
                    if (!senha) {
                      limparEtapa();
                      setEtapa("senha");
                      toast.message("Digite sua senha novamente para receber um novo código.");
                      return;
                    }
                    pedirCodigo();
                  }}
                  className="text-brand font-semibold hover:underline disabled:opacity-50 disabled:no-underline"
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
