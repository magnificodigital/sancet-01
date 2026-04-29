import { Construction } from "lucide-react";

type Props = {
  titulo: string;
  descricao?: string;
};

export const EmConstrucao = ({ titulo, descricao }: Props) => {
  return (
    <section className="container py-24 flex flex-col items-center text-center">
      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-6">
        <Construction className="h-8 w-8 text-secondary" />
      </div>
      <h1 className="text-3xl md:text-4xl font-bold text-secondary mb-3">
        {titulo}
      </h1>
      <p className="text-muted-foreground max-w-md">
        {descricao ?? "Em construção. Esta página ficará pronta em breve."}
      </p>
    </section>
  );
};
