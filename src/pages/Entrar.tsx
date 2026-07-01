import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import bannerSancet from "@/assets/banner-sancet.png";

const Entrar = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);

  const redirect = params.get("redirect") || "/agendamentos";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !senha) {
      toast.error("Informe seu e-mail e sua senha.");
      return;
    }
    setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: senha,
    });
    setCarregando(false);
    if (error) {
      const msg = /invalid/i.test(error.message)
        ? "E-mail ou senha incorretos."
        : error.message;
      toast.error(msg, {
        action: {
          label: "Primeiro acesso",
          onClick: () => navigate("/primeiro-acesso"),
        },
      });
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
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-1 text-sm font-semibold text-[#C8102E] hover:underline mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>

        <h1 className="text-3xl md:text-4xl font-extrabold text-secondary mb-2">Entrar</h1>
        <p className="text-muted-foreground mb-8">Acesse sua conta com e-mail e senha</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
              <><Loader2 className="h-4 w-4 animate-spin" /> Entrando...</>
            ) : "Entrar"}
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" asChild className="h-11 font-semibold">
              <Link to="/cadastro">Fazer cadastro</Link>
            </Button>
            <Button type="button" variant="outline" asChild className="h-11 font-semibold">
              <Link to="/primeiro-acesso">Primeiro acesso</Link>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Já é paciente da Sancet e nunca acessou o portal? Use <b>Primeiro acesso</b>{" "}
            para criar sua senha.
          </p>
        </form>
      </div>
    </div>
  );
};

export default Entrar;
