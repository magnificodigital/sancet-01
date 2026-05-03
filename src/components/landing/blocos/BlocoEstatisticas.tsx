import type { ConfigEstatisticas } from "../tipos";

const VERMELHO = "#C8102E";
const AZUL = "#1B3A6B";

export const BlocoEstatisticas = ({ config }: { config: ConfigEstatisticas }) => {
  const cores: Record<string, { bg: string; texto: string; descricao: string }> = {
    branco: { bg: "#FFFFFF", texto: AZUL, descricao: "#374151" },
    vermelho: { bg: VERMELHO, texto: "#FFFFFF", descricao: "rgba(255,255,255,0.9)" },
    azul: { bg: AZUL, texto: "#FFFFFF", descricao: "rgba(255,255,255,0.9)" },
    cinza: { bg: "#F5F5F5", texto: AZUL, descricao: "#374151" },
  };
  const c = cores[config.cor_fundo] ?? cores.azul;

  return (
    <section className="w-full py-16 px-6" style={{ backgroundColor: c.bg }}>
      <div className="max-w-[1200px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
        {config.itens.map((item) => (
          <div key={item.id} className="text-center">
            <p className="text-5xl font-bold" style={{ color: c.texto }}>
              {item.numero}
              {item.sufixo}
            </p>
            <p className="text-sm mt-2" style={{ color: c.descricao }}>
              {item.descricao}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};
