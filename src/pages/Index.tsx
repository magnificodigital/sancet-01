import { PageShell } from "@/components/layout/PageShell";

const Index = () => {
  return (
    <PageShell>
      <section className="container py-24 md:py-32 flex flex-col items-center text-center">
        <span className="inline-block px-4 py-1.5 rounded-pill bg-muted text-secondary text-xs font-semibold uppercase tracking-wider mb-6">
          Atendimento Digital
        </span>
        <h1 className="text-4xl md:text-6xl font-extrabold text-secondary mb-4 tracking-tight">
          Sancet — Em construção
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-xl">
          Em breve você poderá agendar seus exames e vacinas aqui.
        </p>
      </section>
    </PageShell>
  );
};

export default Index;
