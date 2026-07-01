import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export type PacienteSessao = {
  id: string;
  nome: string;
  cpf: string;
  data_nascimento: string;
  email?: string | null;
  telefone?: string | null;
};

// Cache em memória compartilhado entre instâncias do hook.
let cachedSession: Session | null = null;
let cachedPaciente: PacienteSessao | null = null;
let inflight: Promise<void> | null = null;
const subscribers = new Set<() => void>();
let authListenerBound = false;
let authReady = false;

function notify() {
  subscribers.forEach((cb) => cb());
}

async function carregarPerfil() {
  if (!cachedSession) {
    cachedPaciente = null;
    authReady = true;
    notify();
    return;
  }
  try {
    const session = cachedSession;
    const { data } = await supabase.rpc("meu_perfil_auth");
    const row = data as any;
    if (row) {
      cachedPaciente = {
        id: row.id,
        nome: row.nome ?? "",
        cpf: row.cpf ?? "",
        data_nascimento: row.data_nascimento ?? "",
        email: row.email ?? session.user.email ?? null,
        telefone: row.celular ?? null,
      };
    } else {
      cachedPaciente = null;
    }
  } catch {
    cachedPaciente = null;
  } finally {
    authReady = true;
    notify();
  }
}

function ensureAuthListener() {
  if (authListenerBound) return;
  authListenerBound = true;
  supabase.auth.getSession().then(({ data }) => {
    cachedSession = data.session;
    inflight = carregarPerfil();
  });
  supabase.auth.onAuthStateChange((_evt, session) => {
    authReady = false;
    cachedSession = session;
    inflight = carregarPerfil();
  });
}

export function usePaciente() {
  ensureAuthListener();
  const [paciente, setPaciente] = useState<PacienteSessao | null>(cachedPaciente);
  const [session, setSession] = useState<Session | null>(cachedSession);
  const [carregando, setCarregando] = useState<boolean>(!authReady);

  useEffect(() => {
    const cb = () => {
      setPaciente(cachedPaciente);
      setSession(cachedSession);
      setCarregando(!authReady);
    };
    subscribers.add(cb);
    if (inflight) inflight.finally(cb);
    else cb();
    return () => {
      subscribers.delete(cb);
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    cachedSession = null;
    cachedPaciente = null;
    authReady = true;
    notify();
    window.location.href = "/";
  };

  const recarregar = async () => {
    inflight = carregarPerfil();
    await inflight;
  };

  return {
    paciente,
    session,
    logado: !!session,
    logout,
    carregando,
    recarregar,
  };
}
