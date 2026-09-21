import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import bannerSancet from "@/assets/banner-sancet.png";

const StaffLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  // Enquanto verifica a sessão, não mostra o formulário (evita que um paciente
  // logado chegue a VER a tela de login da equipe).
  const [verificando, setVerificando] = useState(true);

  // SEGURANÇA: só é da equipe quem tem linha em user_roles (paciente logado não tem).
  const temPapelStaff = async (uid: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .maybeSingle();
    return !!data;
  };

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      const uid = data.session?.user.id;
      if (uid) {
        if (await temPapelStaff(uid)) {
          // Já é equipe → vai pro painel.
          navigate("/staff/dashboard", { replace: true });
        } else {
          // SEGURANÇA: paciente (ou qualquer conta sem papel de equipe) logado
          // JAMAIS pode acessar a tela de login da equipe. Manda pra home.
          navigate("/", { replace: true });
        }
        return;
      }
      // Sem sessão → mostra o formulário (necessário para a equipe logar).
      if (active) setVerificando(false);
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });
    if (error || !data.user) {
      setCarregando(false);
      toast.error("E-mail ou senha incorretos");
      return;
    }
    // SEGURANÇA: só entra no painel quem tem papel de equipe.
    if (!(await temPapelStaff(data.user.id))) {
      await supabase.auth.signOut();
      setCarregando(false);
      toast.error("Esta conta não tem acesso ao painel da equipe.");
      return;
    }
    setCarregando(false);
    navigate("/staff/dashboard", { replace: true });
  };

  const esqueciSenha = async () => {
    if (!email.trim()) {
      toast.error("Informe seu e-mail acima para receber o link de redefinição");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/staff/alterar-senha`,
    });
    if (error) {
      toast.error("Não foi possível enviar o e-mail de redefinição");
      return;
    }
    toast.success("E-mail de redefinição enviado");
  };

  if (verificando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary">
        <Loader2 className="h-6 w-6 animate-spin text-white/70" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 bg-cover bg-center relative"
      style={{ backgroundImage: `url(${bannerSancet})` }}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-[400px] rounded-2xl bg-white p-10"
        style={{ boxShadow: "0 25px 50px -12px rgba(0,0,0,0.4)" }}
      >
        <div className="mb-2">
          <p className="text-xs text-muted-foreground">Painel Interno</p>
        </div>

        <hr className="my-5 border-border" />

        <h2 className="text-lg font-semibold text-foreground">Acesso restrito</h2>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@sancet.com.br"
                required
                autoComplete="email"
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="senha">Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="senha"
                type={verSenha ? "text" : "password"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                autoComplete="current-password"
                className="pl-9 pr-9"
              />
              <button
                type="button"
                onClick={() => setVerSenha((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"}
              >
                {verSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={carregando}
            className="w-full text-white"
            style={{ backgroundColor: "hsl(var(--brand))" }}
          >
            {carregando ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Entrando...
              </>
            ) : (
              "Entrar"
            )}
          </Button>

          <button
            type="button"
            onClick={esqueciSenha}
            className="block w-full text-center text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          >
            Esqueci minha senha
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Acesso exclusivo para equipe Sancet
        </p>
      </div>
    </div>
  );
};

export default StaffLogin;
