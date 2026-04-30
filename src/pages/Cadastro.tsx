import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, HelpCircle, Loader2 } from "lucide-react";
import bannerSancet from "@/assets/banner-sancet.png";
import { WizardStep } from "@/components/auth/WizardStep";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  apenasDigitos,
  dataBRparaISO,
  mascaraCEP,
  mascaraCPF,
  mascaraCelular,
  mascaraData,
  validarCPF,
} from "@/lib/mascaras";
import { salvarPaciente } from "@/hooks/usePaciente";

const IMAGEM = bannerSancet;

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB",
  "PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

type Form = {
  cpf: string;
  data: string;
  nome: string;
  usarSocial: boolean;
  nomeSocial: string;
  sexo: "feminino" | "masculino" | "";
  email: string;
  celular: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
};

const inicial: Form = {
  cpf: "",
  data: "",
  nome: "",
  usarSocial: false,
  nomeSocial: "",
  sexo: "",
  email: "",
  celular: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
};

const Cadastro = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<Form>(inicial);
  const [etapa, setEtapa] = useState(1);
  const [carregando, setCarregando] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [cepPreenchido, setCepPreenchido] = useState(false);

  const set = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const podeAvancar = (() => {
    if (etapa === 1) {
      return apenasDigitos(form.cpf).length === 11 && apenasDigitos(form.data).length === 8;
    }
    if (etapa === 2) {
      const nomeOk = form.nome.trim().length >= 3;
      const socialOk = !form.usarSocial || form.nomeSocial.trim().length >= 2;
      return nomeOk && socialOk && !!form.sexo;
    }
    if (etapa === 3) {
      return /\S+@\S+\.\S+/.test(form.email) && apenasDigitos(form.celular).length >= 10;
    }
    if (etapa === 4) {
      return (
        apenasDigitos(form.cep).length === 8 &&
        !!form.logradouro &&
        !!form.numero.trim() &&
        !!form.bairro &&
        !!form.cidade &&
        !!form.uf
      );
    }
    return false;
  })();

  const buscarCEP = async (cepValue: string) => {
    const d = apenasDigitos(cepValue);
    if (d.length !== 8) return;
    setBuscandoCep(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${d}/json/`);
      const j = await r.json();
      if (j.erro) {
        toast.error("CEP não encontrado.");
        return;
      }
      setForm((f) => ({
        ...f,
        logradouro: j.logradouro ?? "",
        bairro: j.bairro ?? "",
        cidade: j.localidade ?? "",
        uf: j.uf ?? "",
      }));
      setCepPreenchido(true);
    } catch {
      toast.error("Erro ao buscar CEP.");
    } finally {
      setBuscandoCep(false);
    }
  };

  const validarEtapa1 = async (): Promise<boolean> => {
    const cpfLimpo = apenasDigitos(form.cpf);
    const dataISO = dataBRparaISO(form.data);
    if (!validarCPF(cpfLimpo)) {
      toast.error("CPF inválido.");
      return false;
    }
    if (!dataISO) {
      toast.error("Data de nascimento inválida.");
      return false;
    }
    setCarregando(true);
    try {
      const { data: existente } = await supabase
        .from("pacientes")
        .select("id")
        .eq("cpf", cpfLimpo)
        .maybeSingle();
      if (existente) {
        toast.error("CPF já cadastrado.", {
          action: { label: "Entrar aqui", onClick: () => navigate("/entrar") },
        });
        return false;
      }
      return true;
    } finally {
      setCarregando(false);
    }
  };

  const finalizar = async () => {
    const cpfLimpo = apenasDigitos(form.cpf);
    const dataISO = dataBRparaISO(form.data);
    if (!dataISO) return;

    setCarregando(true);
    try {
      const nomeFinal = form.usarSocial && form.nomeSocial ? form.nomeSocial : form.nome;
      const { data: inserido, error } = await supabase
        .from("pacientes")
        .insert({
          cpf: cpfLimpo,
          data_nascimento: dataISO,
          nome: nomeFinal,
          sexo: form.sexo,
          email: form.email,
          celular: apenasDigitos(form.celular),
          cep: apenasDigitos(form.cep),
          logradouro: form.logradouro,
          numero: form.numero,
          complemento: form.complemento || null,
          bairro: form.bairro,
          cidade: form.cidade,
          uf: form.uf,
        })
        .select("id, nome, cpf")
        .single();

      if (error) throw error;

      salvarPaciente({ id: inserido.id, nome: inserido.nome ?? nomeFinal, cpf: inserido.cpf });
      toast.success("Cadastro realizado com sucesso!");
      navigate("/agendamentos");
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao cadastrar.");
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  const onProximo = async () => {
    if (etapa === 1) {
      const ok = await validarEtapa1();
      if (ok) setEtapa(2);
      return;
    }
    if (etapa < 4) {
      setEtapa((e) => e + 1);
      return;
    }
    await finalizar();
  };

  const onAnterior = () => setEtapa((e) => Math.max(1, e - 1));

  return (
    <div
      className="relative min-h-screen bg-cover bg-center flex items-center justify-center px-4 py-8"
      style={{ backgroundImage: `url(${IMAGEM})` }}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative w-full max-w-md bg-white/95 backdrop-blur rounded-2xl p-6 md:p-8 shadow-xl">
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#C8102E] hover:underline mb-6 self-start"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>

          <div className="w-full">
            <WizardStep
              etapaAtual={etapa}
              totalEtapas={4}
              onAnterior={onAnterior}
              onProximo={onProximo}
              podeAvancar={podeAvancar}
              carregando={carregando}
            >
              {etapa === 1 && (
                <div className="space-y-5">
                  <div>
                    <h1 className="text-3xl font-extrabold text-secondary mb-2">
                      Faça o cadastro
                    </h1>
                    <p className="text-muted-foreground">
                      Digite os dados de quem vai fazer os procedimentos
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="c-cpf">CPF</Label>
                    <Input
                      id="c-cpf"
                      type="tel"
                      inputMode="numeric"
                      placeholder="000.000.000-00"
                      value={form.cpf}
                      onChange={(e) => set("cpf", mascaraCPF(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="c-data">Data de nascimento</Label>
                    <Input
                      id="c-data"
                      type="tel"
                      inputMode="numeric"
                      placeholder="00/00/0000"
                      value={form.data}
                      onChange={(e) => set("data", mascaraData(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Digite apenas os números
                    </p>
                  </div>
                </div>
              )}

              {etapa === 2 && (
                <div className="space-y-5">
                  <h2 className="text-2xl font-bold text-secondary">Sobre você</h2>
                  <div className="space-y-2">
                    <Label htmlFor="c-nome">Nome no documento</Label>
                    <Input
                      id="c-nome"
                      value={form.nome}
                      onChange={(e) => set("nome", e.target.value)}
                      placeholder="Como aparece no RG/CPF"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="c-social"
                      checked={form.usarSocial}
                      onCheckedChange={(v) => set("usarSocial", !!v)}
                    />
                    <Label htmlFor="c-social" className="cursor-pointer">
                      Usar nome social
                    </Label>
                  </div>
                  {form.usarSocial && (
                    <div className="space-y-2">
                      <Label htmlFor="c-social-name">Nome social</Label>
                      <Input
                        id="c-social-name"
                        value={form.nomeSocial}
                        onChange={(e) => set("nomeSocial", e.target.value)}
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label>Sexo biológico</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button">
                              <HelpCircle className="h-4 w-4 text-muted-foreground" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            Necessário para referências laboratoriais
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="flex gap-3">
                      {(["feminino", "masculino"] as const).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => set("sexo", opt)}
                          className={cn(
                            "px-5 py-2 rounded-full border text-sm font-semibold transition-colors capitalize",
                            form.sexo === opt
                              ? "bg-[#C8102E] text-white border-[#C8102E]"
                              : "bg-background text-secondary border-border hover:bg-muted"
                          )}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {etapa === 3 && (
                <div className="space-y-5">
                  <h2 className="text-2xl font-bold text-secondary">Contato</h2>
                  <div className="space-y-2">
                    <Label htmlFor="c-email">E-mail</Label>
                    <Input
                      id="c-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => set("email", e.target.value)}
                      placeholder="seuemail@exemplo.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="c-cel">Celular</Label>
                    <Input
                      id="c-cel"
                      type="tel"
                      inputMode="numeric"
                      placeholder="(00) 00000-0000"
                      value={form.celular}
                      onChange={(e) => set("celular", mascaraCelular(e.target.value))}
                    />
                  </div>
                </div>
              )}

              {etapa === 4 && (
                <div className="space-y-5">
                  <h2 className="text-2xl font-bold text-secondary">Endereço</h2>
                  <div className="space-y-2">
                    <Label htmlFor="c-cep">CEP</Label>
                    <div className="relative">
                      <Input
                        id="c-cep"
                        type="tel"
                        inputMode="numeric"
                        placeholder="00000-000"
                        value={form.cep}
                        onChange={(e) => {
                          const v = mascaraCEP(e.target.value);
                          set("cep", v);
                          if (apenasDigitos(v).length === 8) buscarCEP(v);
                        }}
                      />
                      {buscandoCep && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="c-rua">Rua</Label>
                    <Input
                      id="c-rua"
                      value={form.logradouro}
                      onChange={(e) => set("logradouro", e.target.value)}
                      readOnly={cepPreenchido && !!form.logradouro}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="c-num">Número</Label>
                      <Input
                        id="c-num"
                        value={form.numero}
                        onChange={(e) => set("numero", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="c-comp">Complemento</Label>
                      <Input
                        id="c-comp"
                        value={form.complemento}
                        onChange={(e) => set("complemento", e.target.value)}
                        placeholder="Apto, bloco..."
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="c-bairro">Bairro</Label>
                    <Input
                      id="c-bairro"
                      value={form.bairro}
                      onChange={(e) => set("bairro", e.target.value)}
                      readOnly={cepPreenchido && !!form.bairro}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>UF</Label>
                      <Select
                        value={form.uf}
                        onValueChange={(v) => set("uf", v)}
                        disabled={cepPreenchido && !!form.uf}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="UF" />
                        </SelectTrigger>
                        <SelectContent>
                          {UFS.map((u) => (
                            <SelectItem key={u} value={u}>
                              {u}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="c-cidade">Cidade</Label>
                      <Input
                        id="c-cidade"
                        value={form.cidade}
                        onChange={(e) => set("cidade", e.target.value)}
                        readOnly={cepPreenchido && !!form.cidade}
                      />
                    </div>
                  </div>
                </div>
              )}
            </WizardStep>

            <p className="text-sm text-muted-foreground mt-6">
              Já tem cadastro?{" "}
              <Link to="/entrar" className="text-[#C8102E] font-semibold hover:underline">
                Entrar
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cadastro;
