import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import bannerSancet from "@/assets/banner-sancet.png";

const RedefinirSenha = () => {
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [conf, setConf] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [temSessao, setTemSessao] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setTemSessao(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setTemSessao(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha.length < 8) return toast.error("A senha precisa ter pelo menos 8 caracteres.");
    if (senha !== conf) return toast.error("As senhas não conferem.");
    setCarregando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setCarregando(false);
    if (error) return toast.error(error.message);
    toast.success("Senha atualizada!");
    navigate("/agendamentos");
  };

  return (
    <div
      className="relative min-h-screen bg-cover bg-center flex items-center justify-center px-4 py-8"
      style={{ backgroundImage: `url(${bannerSancet})` }}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative w-full max-w-md bg-white/95 backdrop-blur rounded-2xl p-6 md:p-8 shadow-xl">
        <h1 className="text-3xl font-extrabold text-secondary mb-2">Redefinir senha</h1>

        {!temSessao ? (
          <p className="text-muted-foreground">
            Este link é inválido ou expirou. Solicite um novo em "Esqueci minha senha".
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-5 mt-4">
            <div className="space-y-2">
              <Label htmlFor="s1">Nova senha</Label>
              <Input id="s1" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s2">Confirme a senha</Label>
              <Input id="s2" type="password" value={conf} onChange={(e) => setConf(e.target.value)} />
            </div>
            <Button
              type="submit"
              disabled={carregando}
              className="w-full bg-[#C8102E] hover:bg-[#a80d26] text-white h-11"
            >
              {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar nova senha"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default RedefinirSenha;
