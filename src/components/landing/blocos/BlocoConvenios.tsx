import type { ConfigConvenios } from "../tipos";

const AZUL = "#1B3A6B";

export const BlocoConvenios = ({ config }: { config: ConfigConvenios }) => {
  return (
    <section className="w-full py-16 px-6 bg-white">
      <div className="max-w-[1200px] mx-auto">
        {config.titulo_secao && (
          <h2 className="text-3xl font-bold text-center mb-10" style={{ color: AZUL }}>
            {config.titulo_secao}
          </h2>
        )}
        {config.logos.length === 0 ? (
          <div className="text-center text-sm text-gray-400">Nenhum logo adicionado</div>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-6 items-center">
            {config.logos.map((l) => (
              <div
                key={l.id}
                className="h-[60px] w-[120px] mx-auto flex items-center justify-center"
              >
                {l.imagem_url ? (
                  <img
                    src={l.imagem_url}
                    alt={l.alt}
                    className="max-h-full max-w-full object-contain opacity-70 hover:opacity-100 transition"
                  />
                ) : (
                  <div className="h-full w-full bg-gray-100 rounded" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
