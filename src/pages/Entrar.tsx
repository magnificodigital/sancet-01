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
import { salvarPaciente } from "@/hooks/usePaciente";
import bannerSancet from "@/assets/banner-sancet.png";

const IMAGEM = bannerSancet;

const Entrar = () => {
  const navigate = useNavigate();
  const [cpf, setCpf] = useState("");
  const [data, setData] = useState("");
  const [carregando, setCarregando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cpfLimpo = apenasDigitos(cpf);
    const dataISO = dataBRparaISO(data);

    if (!validarCPF(cpfLimpo)) {
      toast.error("CPF inválido. Verifique os números digitados.");
      return;
    }
    if (!dataISO) {
      toast.error("Data de nascimento inválida.");
      return;
    }

    setCarregando(true);
    try {
      const { data: rows, error } = await supabase
        .from("pacientes")
        .select("id, nome, cpf")
        .eq("cpf", cpfLimpo)
        .eq("data_nascimento", dataISO)
        .maybeSingle();

      if (error) throw error;
      if (!rows) {
        toast.error("Dados não encontrados.", {
          description: "Verifique o CPF e a data de nascimento.",
          action: {
            label: "Fazer cadastro",
            onClick: () => navigate("/cadastro"),
          },
        });
        return;
      }

      salvarPaciente({ id: rows.id, nome: rows.nome ?? "", cpf: rows.cpf });
      toast.success(`Bem-vindo(a), ${rows.nome ?? "paciente"}!`);
      navigate("/agendamentos");
    } catch (err) {
      toast.error("Erro ao entrar. Tente novamente.");
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <PageShell>
      <div
        className="relative min-h-[calc(100vh-7rem)] bg-cover bg-center"
        style={{ backgroundImage: `url(${IMAGEM})` }}
      >
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative container py-8 md:py-12">
          <div className="max-w-md mx-auto md:mx-0 bg-white/95 backdrop-blur rounded-2xl p-6 md:p-8 shadow-xl">
            <div className="flex flex-col">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1 text-sm font-semibold text-[#C8102E] hover:underline mb-6 self-start"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>

            <h1 className="text-3xl md:text-4xl font-extrabold text-secondary mb-2">
              Entrar
            </h1>
            <p className="text-muted-foreground mb-8">
              Digite os dados de quem vai fazer os procedimentos
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  type="tel"
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(mascaraCPF(e.target.value))}
                  autoComplete="off"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nasc">Data de nascimento</Label>
                <Input
                  id="nasc"
                  type="tel"
                  inputMode="numeric"
                  placeholder="00/00/0000"
                  value={data}
                  onChange={(e) => setData(mascaraData(e.target.value))}
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  Digite apenas os números
                </p>
              </div>

              <Button
                type="submit"
                disabled={carregando}
                className="w-full bg-[#C8102E] hover:bg-[#a80d26] text-white font-semibold h-11"
              >
                {carregando ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                asChild
                className="w-full h-11 font-semibold"
              >
                <Link to="/cadastro">Fazer cadastro</Link>
              </Button>
            </form>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
};

export default Entrar;
