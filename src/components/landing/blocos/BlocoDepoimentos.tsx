import { Star, User } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import type { ConfigDepoimentos } from "../tipos";

const AZUL = "#1B3A6B";

export const BlocoDepoimentos = ({ config }: { config: ConfigDepoimentos }) => {
  return (
    <section className="w-full py-16 px-6 bg-white">
      <div className="max-w-[1200px] mx-auto">
        {config.titulo_secao && (
          <h2 className="text-3xl font-bold text-center mb-2" style={{ color: AZUL }}>
            {config.titulo_secao}
          </h2>
        )}
        {config.subtitulo_secao && (
          <p className="text-center text-gray-600 mb-10">{config.subtitulo_secao}</p>
        )}
        <Carousel opts={{ align: "start", loop: true }} className="w-full">
          <CarouselContent>
            {config.depoimentos.map((d) => (
              <CarouselItem key={d.id} className="md:basis-1/3">
                <div className="rounded-xl border bg-white p-6 h-full flex flex-col gap-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    {d.foto_url ? (
                      <img src={d.foto_url} alt={d.nome} className="h-16 w-16 rounded-full object-cover" />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="h-7 w-7 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <p className="font-bold" style={{ color: AZUL }}>{d.nome}</p>
                      <div className="flex gap-0.5 mt-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className="h-3.5 w-3.5"
                            fill={i < d.estrelas ? "#FACC15" : "transparent"}
                            stroke={i < d.estrelas ? "#FACC15" : "#D1D5DB"}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-700 italic">"{d.texto}"</p>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </div>
    </section>
  );
};
