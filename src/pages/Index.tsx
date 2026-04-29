import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FlaskConical,
  Syringe,
  ShieldCheck,
  Clock,
  Home,
  Search,
  ScanLine,
  ClipboardList,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

const heroPills = [
  { icon: ShieldCheck, label: "Resultado digital seguro" },
  { icon: Clock, label: "Agendamento em minutos" },
  { icon: Home, label: "Coleta em domicílio" },
];

const passos = [
  {
    n: 1,
    icon: Search,
    title: "Escolha os exames ou vacinas",
    desc: "Navegue pelo catálogo e adicione à sacola",
  },
  {
    n: 2,
    icon: ClipboardList,
    title: "Informe seus dados",
    desc: "Preencha um cadastro rápido em 4 etapas",
  },
  {
    n: 3,
    icon: MapPin,
    title: "Escolha onde coletar",
    desc: "Atendimento em unidade ou coleta em domicílio",
  },
  {
    n: 4,
    icon: CheckCircle2,
    title: "Pronto!",
    desc: "Receba o protocolo e acompanhe seu pedido",
  },
];

const unidades = [
  {
    nome: "Unidade Centro",
    endereco: "Rua das Flores, 123 — Centro",
    horario: "Seg–Sex 07h–18h · Sáb 07h–13h",
  },
  {
    nome: "Unidade Norte",
    endereco: "Av. Brasil, 456 — Bairro Norte",
    horario: "Seg–Sex 07h–18h · Sáb 07h–13h",
  },
  {
    nome: "Unidade Sul",
    endereco: "Rua das Palmeiras, 789 — Bairro Sul",
    horario: "Seg–Sex 07h–17h",
  },
];

const faqs = [
  {
    q: "Como faço para agendar meus exames?",
    a: "Basta escolher os exames no catálogo, adicionar à sacola, preencher seus dados e confirmar o pedido. Todo o processo é feito online em poucos minutos.",
  },
  {
    q: "Preciso de pedido médico para realizar exames?",
    a: "Depende do exame. Para convênios, normalmente sim. Para exames particulares, a maioria não exige. O sistema indica quando é necessário.",
  },
  {
    q: "Como funciona a coleta em domicílio?",
    a: "Após o agendamento, um profissional treinado da Sancet vai até o endereço informado no horário escolhido para realizar a coleta.",
  },
  {
    q: "Em quanto tempo recebo meu resultado?",
    a: "O prazo varia por exame — é informado na página de cada exame. A maioria dos resultados fica disponível em 24 a 48 horas.",
  },
  {
    q: "Meu convênio é aceito?",
    a: "Trabalhamos com os principais convênios. No momento do agendamento você pode verificar se o seu plano é aceito.",
  },
  {
    q: "Como acompanho meu pedido?",
    a: "Após confirmar o pedido você recebe um protocolo (ex: SAN-2025-000123). Acesse 'Meus Agendamentos' a qualquer momento para acompanhar o status.",
  },
];

const SectionTag = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-block text-xs font-bold uppercase tracking-wider text-primary mb-3">
    {children}
  </span>
);

const Index = () => {
  return (
    <PageShell>
      {/* SEÇÃO 1 — HERO */}
      <section
        className="-mt-20 min-h-[90vh] flex items-center"
        style={{
          background:
            "linear-gradient(120deg, #1B3A6B 0%, #0f2347 100%)",
        }}
      >
        <div className="container py-20 md:py-24 text-center md:text-left">
          <div className="max-w-3xl mx-auto md:mx-0">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-pill bg-white/10 text-white text-xs font-semibold mb-6 backdrop-blur">
              <FlaskConical className="h-4 w-4" />
              Atendimento Digital · Exames e Vacinas
            </span>
            <h1 className="text-white font-bold tracking-tight text-[36px] md:text-[56px] leading-[1.1] mb-5">
              Seus exames e vacinas com a comodidade que você merece
            </h1>
            <p className="text-white/70 text-lg md:text-xl max-w-2xl mx-auto md:mx-0 mb-8">
              Agende online, retire resultados digitais e conte com coleta em
              domicílio ou em nossas unidades.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start mb-10">
              <Button
                asChild
                size="lg"
                className="rounded-pill bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 h-12"
              >
                <Link to="/exames">
                  <FlaskConical className="h-5 w-5" />
                  Agendar Exames
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-pill bg-transparent border-white text-white hover:bg-white/10 hover:text-white font-semibold px-8 h-12"
              >
                <Link to="/vacinas">
                  <Syringe className="h-5 w-5" />
                  Ver Vacinas
                </Link>
              </Button>
            </div>

            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              {heroPills.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-pill bg-white/10 text-white text-sm font-medium backdrop-blur"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO 2 — COMO FUNCIONA */}
      <section className="bg-background py-20">
        <div className="container">
          <div className="text-center mb-12">
            <SectionTag>Como funciona</SectionTag>
            <h2 className="text-3xl md:text-4xl font-bold text-secondary">
              Simples, rápido e seguro
            </h2>
          </div>

          <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Linha conectora desktop */}
            <div
              className="hidden lg:block absolute top-5 left-[12.5%] right-[12.5%] h-px"
              style={{ backgroundColor: "rgba(200, 16, 46, 0.3)" }}
              aria-hidden
            />
            {passos.map(({ n, icon: Icon, title, desc }) => (
              <div
                key={n}
                className="relative flex flex-col items-center text-center bg-background"
              >
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center mb-4 relative z-10">
                  {n}
                </div>
                <Icon className="h-8 w-8 text-secondary mb-3" />
                <h3 className="font-bold text-foreground mb-1">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEÇÃO 3 — NOSSOS SERVIÇOS */}
      <section className="bg-muted py-20">
        <div className="container">
          <div className="text-center mb-12">
            <SectionTag>Nossos serviços</SectionTag>
            <h2 className="text-3xl md:text-4xl font-bold text-secondary">
              Tudo que você precisa em um só lugar
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="bg-background rounded-xl shadow-card p-8 flex flex-col">
              <FlaskConical className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-bold text-secondary mb-2">
                Exames Laboratoriais
              </h3>
              <p className="text-muted-foreground mb-6 flex-1">
                Mais de 500 tipos de exames com resultado digital seguro e
                rápido.
              </p>
              <Button
                asChild
                variant="outline"
                className="rounded-pill border-primary text-primary hover:bg-primary hover:text-primary-foreground self-start"
              >
                <Link to="/exames">Ver exames</Link>
              </Button>
            </div>

            {/* Card 2 — destaque */}
            <div className="bg-background rounded-xl shadow-card p-8 flex flex-col border-2 border-primary relative">
              <span className="absolute -top-3 left-8 px-3 py-1 rounded-pill bg-primary text-primary-foreground text-xs font-bold">
                Mais procurado
              </span>
              <Syringe className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-bold text-secondary mb-2">Vacinas</h3>
              <p className="text-muted-foreground mb-6 flex-1">
                Vacinas para todas as idades: bebês, crianças, adultos, idosos
                e viajantes.
              </p>
              <Button
                asChild
                className="rounded-pill bg-primary hover:bg-primary/90 text-primary-foreground self-start"
              >
                <Link to="/vacinas">Ver vacinas</Link>
              </Button>
            </div>

            {/* Card 3 */}
            <div className="bg-background rounded-xl shadow-card p-8 flex flex-col">
              <Home className="h-12 w-12 text-secondary mb-4" />
              <h3 className="text-xl font-bold text-secondary mb-2">
                Sancet em Casa
              </h3>
              <p className="text-muted-foreground mb-6 flex-1">
                Coleta domiciliar com profissionais treinados. Você agenda, nós
                vamos até você.
              </p>
              <Button
                asChild
                variant="outline"
                className="rounded-pill border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground self-start"
              >
                <Link to="/exames">Saiba mais</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO 4 — NOSSAS UNIDADES */}
      <section className="bg-background py-20">
        <div className="container">
          <div className="text-center mb-12">
            <SectionTag>Onde nos encontrar</SectionTag>
            <h2 className="text-3xl md:text-4xl font-bold text-secondary mb-3">
              Nossas Unidades
            </h2>
            <p className="text-muted-foreground">
              Estamos prontos para atender você com toda a comodidade
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
            {unidades.map((u) => (
              <div
                key={u.nome}
                className="border border-border rounded-xl p-6 flex flex-col gap-3 bg-background"
              >
                <MapPin className="h-7 w-7 text-primary" />
                <h3 className="font-bold text-secondary text-lg">{u.nome}</h3>
                <p className="text-sm text-muted-foreground">{u.endereco}</p>
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{u.horario}</span>
                </div>
                <a
                  href="#"
                  className="text-sm font-semibold text-primary hover:underline mt-1"
                >
                  Ver no mapa →
                </a>
              </div>
            ))}
          </div>

          <div className="flex justify-center">
            <Button
              variant="outline"
              className="rounded-pill border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground px-8"
            >
              Ver todas as unidades
            </Button>
          </div>
        </div>
      </section>

      {/* SEÇÃO 5 — FAQ */}
      <section className="bg-muted py-20">
        <div className="container max-w-3xl">
          <div className="text-center mb-10">
            <SectionTag>Dúvidas</SectionTag>
            <h2 className="text-3xl md:text-4xl font-bold text-secondary">
              Perguntas frequentes
            </h2>
          </div>

          <Accordion type="single" collapsible className="w-full space-y-3">
            {faqs.map((f, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="bg-background rounded-xl border border-border px-5"
              >
                <AccordionTrigger className="text-left font-semibold text-secondary hover:no-underline">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* SEÇÃO 6 — CTA FINAL */}
      <section className="bg-primary py-16">
        <div className="container text-center">
          <h2 className="text-white font-bold text-3xl md:text-4xl mb-4">
            Pronto para cuidar da sua saúde?
          </h2>
          <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
            Agende agora seus exames e vacinas de forma rápida e segura
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              asChild
              size="lg"
              className="rounded-pill bg-background text-primary hover:bg-background/90 font-semibold px-8 h-12"
            >
              <Link to="/exames">Agendar Exames</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-pill bg-transparent border-white text-white hover:bg-white/10 hover:text-white font-semibold px-8 h-12"
            >
              <Link to="/vacinas">Ver Vacinas</Link>
            </Button>
          </div>
        </div>
      </section>
    </PageShell>
  );
};

export default Index;
