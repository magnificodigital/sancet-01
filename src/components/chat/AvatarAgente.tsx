import { cn } from "@/lib/utils";

/**
 * Avatar do agente de IA. `avatar` = "preset:<id>" (modelos em flat design)
 * ou a URL de uma imagem enviada pelo painel.
 */
export const AVATARES_PRESET: { id: string; nome: string }[] = [
  { id: "atendente", nome: "Atendente" },
  { id: "doutora", nome: "Doutora" },
  { id: "doutor", nome: "Doutor" },
  { id: "robo", nome: "Robô" },
  { id: "gotinha", nome: "Gotinha" },
];

const SVG: Record<string, JSX.Element> = {
  // Atendente com fone de ouvido
  atendente: (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="32" fill="#FDE8EC" />
      <path d="M12 64c0-12 9-19 20-19s20 7 20 19z" fill="#C8102E" />
      <path d="M26 45h12l-6 7z" fill="#fff" />
      <rect x="28" y="38" width="8" height="8" rx="3" fill="#F2C29B" />
      <path d="M17 30c0-11 7-18 15-18s15 7 15 18v6c-2-3-4-8-4-12-6 3-15 2-19-2-1 4-3 9-7 14z" fill="#5B3A29" />
      <ellipse cx="32" cy="29" rx="11" ry="12.5" fill="#F7D2B0" />
      <path d="M21 26c2-7 7-10 11-10s9 3 11 10c-5-1-9-3-11-6-3 3-7 5-11 6z" fill="#5B3A29" />
      <circle cx="27.5" cy="29.5" r="1.6" fill="#2B2B2B" />
      <circle cx="36.5" cy="29.5" r="1.6" fill="#2B2B2B" />
      <path d="M28.5 35c2 2 5 2 7 0" stroke="#C8102E" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <circle cx="25" cy="33" r="1.8" fill="#F4A9A0" opacity=".7" />
      <circle cx="39" cy="33" r="1.8" fill="#F4A9A0" opacity=".7" />
      <path d="M19 30a13 13 0 0 1 26 0" stroke="#1D3A6B" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <rect x="16.5" y="27" width="5" height="8" rx="2.5" fill="#1D3A6B" />
      <rect x="42.5" y="27" width="5" height="8" rx="2.5" fill="#1D3A6B" />
      <path d="M19 35c0 4 3 6 7 6h3" stroke="#1D3A6B" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <circle cx="30" cy="41" r="1.8" fill="#1D3A6B" />
    </svg>
  ),
  // Doutora de jaleco com estetoscópio
  doutora: (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="32" fill="#E7EEF8" />
      <path d="M12 64c0-12 9-19 20-19s20 7 20 19z" fill="#fff" />
      <path d="M26 45l6 9 6-9z" fill="#1D3A6B" />
      <path d="M24 46c-1 6 0 10 4 12M40 46c1 6 0 10-4 12" stroke="#7A8CA8" strokeWidth="1.6" fill="none" />
      <circle cx="28" cy="58" r="2" fill="#7A8CA8" />
      <rect x="28" y="38" width="8" height="8" rx="3" fill="#E9B48A" />
      <path d="M18 33c-1-12 6-21 14-21s15 9 14 21c-1 6-2 10-3 12 0-8-1-12-3-15-5 2-12 2-17-2-2 4-3 10-3 17-1-3-2-7-2-12z" fill="#2E2A3A" />
      <ellipse cx="32" cy="29" rx="10.5" ry="12" fill="#F1C49E" />
      <path d="M21.5 27c1-8 6-11 10.5-11 5 0 9 4 10.5 11-6-1-11-4-13-8-2 3-4 6-8 8z" fill="#2E2A3A" />
      <circle cx="27.5" cy="29.5" r="1.6" fill="#2B2B2B" />
      <circle cx="36.5" cy="29.5" r="1.6" fill="#2B2B2B" />
      <path d="M28.5 35c2 2 5 2 7 0" stroke="#B5523F" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <circle cx="25" cy="33" r="1.8" fill="#E89A8E" opacity=".6" />
      <circle cx="39" cy="33" r="1.8" fill="#E89A8E" opacity=".6" />
      <rect x="38" y="50" width="7" height="3" rx="1" fill="#C8102E" />
    </svg>
  ),
  // Doutor de jaleco
  doutor: (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="32" fill="#E3F2EE" />
      <path d="M12 64c0-12 9-19 20-19s20 7 20 19z" fill="#fff" />
      <path d="M27 45l5 7 5-7z" fill="#5FA48F" />
      <path d="M32 52v12" stroke="#DDE3EA" strokeWidth="1.2" />
      <rect x="20" y="52" width="7" height="3" rx="1" fill="#1D3A6B" />
      <rect x="28" y="38" width="8" height="8" rx="3" fill="#C98C62" />
      <ellipse cx="32" cy="29" rx="10.5" ry="12" fill="#D9A27A" />
      <path d="M21 26c0-8 5-12 11-12s11 4 11 12c-3-3-7-5-11-5s-8 2-11 5z" fill="#3B2C24" />
      <circle cx="27.5" cy="29.5" r="1.6" fill="#2B2B2B" />
      <circle cx="36.5" cy="29.5" r="1.6" fill="#2B2B2B" />
      <path d="M27 25.5h4M33 25.5h4" stroke="#3B2C24" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M28.5 35c2 2 5 2 7 0" stroke="#8A4A34" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M24 31c0 6 3 10 8 10s8-4 8-10c-1 3-4 4-8 4s-7-1-8-4z" fill="#3B2C24" opacity=".25" />
      <circle cx="22" cy="30" r="2" fill="#D9A27A" />
      <circle cx="42" cy="30" r="2" fill="#D9A27A" />
    </svg>
  ),
  // Robô amigável
  robo: (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="32" fill="#EDE9FB" />
      <line x1="32" y1="9" x2="32" y2="15" stroke="#1D3A6B" strokeWidth="2" />
      <circle cx="32" cy="8" r="3" fill="#C8102E" />
      <rect x="15" y="15" width="34" height="27" rx="10" fill="#1D3A6B" />
      <rect x="19" y="19" width="26" height="18" rx="7" fill="#DCE8FB" />
      <circle cx="26.5" cy="27.5" r="3" fill="#1D3A6B" />
      <circle cx="37.5" cy="27.5" r="3" fill="#1D3A6B" />
      <circle cx="27.5" cy="26.5" r="1" fill="#fff" />
      <circle cx="38.5" cy="26.5" r="1" fill="#fff" />
      <path d="M28 33c2.5 2 5.5 2 8 0" stroke="#C8102E" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <rect x="11" y="24" width="4" height="9" rx="2" fill="#C8102E" />
      <rect x="49" y="24" width="4" height="9" rx="2" fill="#C8102E" />
      <path d="M16 64c0-11 7-18 16-18s16 7 16 18z" fill="#1D3A6B" />
      <rect x="27" y="51" width="10" height="7" rx="2" fill="#DCE8FB" />
      <path d="M29 54.5h6" stroke="#C8102E" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  // Mascote gotinha (tubo de ensaio)
  gotinha: (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="32" fill="#FFF1E6" />
      <rect x="22" y="9" width="20" height="5" rx="2.5" fill="#1D3A6B" />
      <path d="M24 14h16v30a8 8 0 0 1-16 0z" fill="#fff" stroke="#1D3A6B" strokeWidth="2" />
      <path d="M25 32h14v12a7 7 0 0 1-14 0z" fill="#C8102E" />
      <circle cx="29" cy="25" r="1.8" fill="#1D3A6B" />
      <circle cx="35" cy="25" r="1.8" fill="#1D3A6B" />
      <path d="M29.5 29c1.5 1.5 3.5 1.5 5 0" stroke="#1D3A6B" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <circle cx="27" cy="28" r="1.4" fill="#F4A9A0" />
      <circle cx="37" cy="28" r="1.4" fill="#F4A9A0" />
      <circle cx="30" cy="38" r="1.5" fill="#fff" opacity=".6" />
      <circle cx="34" cy="43" r="1" fill="#fff" opacity=".6" />
      <path d="M18 30c-3 1-4 4-3 6M46 30c3 1 4 4 3 6" stroke="#1D3A6B" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M48 14l1.5 3 3 1.5-3 1.5L48 23l-1.5-3-3-1.5 3-1.5z" fill="#F2B705" />
      <path d="M15 46l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" fill="#F2B705" />
    </svg>
  ),
};

export const AvatarAgente = ({ avatar, className, alt = "Assistente virtual" }: { avatar?: string | null; className?: string; alt?: string }) => {
  const v = avatar || "preset:atendente";
  if (v.startsWith("preset:")) {
    const svg = SVG[v.slice(7)] ?? SVG.atendente;
    return (
      <div className={cn("shrink-0 overflow-hidden rounded-full [&>svg]:h-full [&>svg]:w-full", className)} role="img" aria-label={alt}>
        {svg}
      </div>
    );
  }
  return <img src={v} alt={alt} className={cn("shrink-0 rounded-full bg-white object-cover", className)} />;
};
