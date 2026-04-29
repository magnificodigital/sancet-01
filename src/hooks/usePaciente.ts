import { useEffect, useState } from "react";

export type PacienteSessao = {
  id: string;
  nome: string;
  cpf: string;
};

const STORAGE_KEY = "sancet-paciente";

function ler(): PacienteSessao | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PacienteSessao;
  } catch {
    return null;
  }
}

export function salvarPaciente(p: PacienteSessao) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  window.dispatchEvent(new Event("sancet-paciente-changed"));
}

export function usePaciente() {
  const [paciente, setPaciente] = useState<PacienteSessao | null>(() => ler());

  useEffect(() => {
    const sync = () => setPaciente(ler());
    window.addEventListener("storage", sync);
    window.addEventListener("sancet-paciente-changed", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("sancet-paciente-changed", sync);
    };
  }, []);

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event("sancet-paciente-changed"));
    window.location.href = "/";
  };

  return { paciente, logout, logado: !!paciente };
}
