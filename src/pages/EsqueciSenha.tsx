import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import bannerSancet from "@/assets/banner-sancet.png";

const EsqueciSenha = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setCarregando(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    setCarregando(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setEnviado(true);
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
          onClick={() => navigate("/entrar")}
          className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <h1 className="text-3xl font-extrabold text-secondary mb-2">Esqueci minha senha</h1>

        {enviado ? (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Se existe uma conta com esse e-mail, enviamos um link para redefinir sua senha.
              Verifique sua caixa de entrada e o spam.
            </p>
            <Button asChild className="w-full bg-brand hover:bg-brand-hover text-white">
              <Link to="/entrar">Voltar para o login</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <p className="text-muted-foreground">
              Enviaremos um link de redefinição para o seu e-mail.
            </p>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
              />
            </div>
            <Button
              type="submit"
              disabled={carregando}
              className="w-full bg-brand hover:bg-brand-hover text-white h-11"
            >
              {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar link"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default EsqueciSenha;
