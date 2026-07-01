import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  apenasDigitos,
  dataBRparaISO,
  mascaraCPF,
  mascaraData,
  validarCPF,
} from "@/lib/mascaras";
import bannerSancet from "@/assets/banner-sancet.png";

const PrimeiroAcesso = () => {
  const navigate = useNavigate();
  const [cpf, setCpf] = useState("");
  const [data, setData] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [conf, setConf] = useState("");
  const [carregando, setCarregando] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cpfLimpo = apenasDigitos(cpf);
    const dataISO = dataBRparaISO(data);
    if (!validarCPF(cpfLimpo)) return toast.error("CPF inválido.");
    if (!dataISO) return toast.error("Data de nascimento inválida.");
    if (!/\S+@\S+\.\S+/.test(email)) return toast.error("E-mail inválido.");
    if (senha.length < 8) return toast.error("A senha precisa ter pelo menos 8 caracteres.");
    if (senha !== conf) return toast.error("As senhas não conferem.");

    setCarregando(true);
    const { data: resp, error } = await supabase.functions.invoke("sancet-primeiro-acesso", {
      body: { cpf: cpfLimpo, data_nascimento: dataISO, email, senha },
    });
    if (error || (resp as any)?.error) {
      setCarregando(false);
      const msg = (resp as any)?.error || error?.message || "Não foi possível concluir.";
      toast.error(msg);
      return;
    }
    // Já cria conta e faz login automático
    const { error: loginErr } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: senha,
    });
    setCarregando(false);
    if (loginErr) return toast.error(loginErr.message);
    toast.success("Conta criada! Bem-vindo(a).");
    navigate("/agendamentos");
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
          className="inline-flex items-center gap-1 text-sm font-semibold text-[#C8102E] hover:underline mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <h1 className="text-3xl font-extrabold text-secondary mb-2">Primeiro acesso</h1>
        <p className="text-muted-foreground mb-6 text-sm">
          Já é paciente da Sancet? Confirme seus dados e crie uma senha.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>CPF</Label>
            <Input
              type="tel"
              inputMode="numeric"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => setCpf(mascaraCPF(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>Data de nascimento</Label>
            <Input
              type="tel"
              inputMode="numeric"
              placeholder="00/00/0000"
              value={data}
              onChange={(e) => setData(mascaraData(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Nova senha</Label>
              <Input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Confirmar</Label>
              <Input type="password" value={conf} onChange={(e) => setConf(e.target.value)} />
            </div>
          </div>

          <Button
            type="submit"
            disabled={carregando}
            className="w-full bg-[#C8102E] hover:bg-[#a80d26] text-white h-11"
          >
            {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar acesso"}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Não é paciente ainda?{" "}
            <Link to="/cadastro" className="text-[#C8102E] font-semibold hover:underline">
              Fazer cadastro
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default PrimeiroAcesso;
