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

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) navigate("/staff/dashboard", { replace: true });
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });
    setCarregando(false);
    if (error) {
      toast.error("E-mail ou senha incorretos");
      return;
    }
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
            style={{ backgroundColor: "#C8102E" }}
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
