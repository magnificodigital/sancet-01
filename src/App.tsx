import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { carregarTema } from "@/lib/tema";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "./pages/Home.tsx"; // eager: primeira pintura, sem flash
import { RequireStaff } from "./components/staff/RequireStaff.tsx";
import { BarraCheckoutFlutuante } from "./components/catalogo/BarraCheckoutFlutuante";
import { AvisoPopup } from "./components/avisos/AvisoPopup";

// Demais páginas em code-splitting: cada rota vira um chunk sob demanda.
// As libs pesadas (xlsx, recharts, html5-qrcode) ficam só nos chunks de
// staff e não pesam no carregamento inicial do paciente.
const Index = lazy(() => import("./pages/Index.tsx"));
const Exames = lazy(() => import("./pages/Exames.tsx"));
const SelecaoTipoCompra = lazy(() => import("./pages/SelecaoTipoCompra.tsx"));
const ExamesParticular = lazy(() => import("./pages/ExamesParticular.tsx"));
const ExamesConvenio = lazy(() => import("./pages/ExamesConvenio.tsx"));
const EscolherConvenio = lazy(() => import("./pages/EscolherConvenio.tsx"));
const Vacinas = lazy(() => import("./pages/Vacinas.tsx"));
const Sacola = lazy(() => import("./pages/Sacola.tsx"));
const EnviarPedido = lazy(() => import("./pages/EnviarPedido.tsx"));
const EnviarReceita = lazy(() => import("./pages/EnviarReceita.tsx"));
const Cadastro = lazy(() => import("./pages/Cadastro.tsx"));
const Entrar = lazy(() => import("./pages/Entrar.tsx"));
const EsqueciSenha = lazy(() => import("./pages/EsqueciSenha.tsx"));
const RedefinirSenha = lazy(() => import("./pages/RedefinirSenha.tsx"));
const Agendamentos = lazy(() => import("./pages/Agendamentos.tsx"));
const Unidades = lazy(() => import("./pages/Unidades.tsx"));
const Pronto = lazy(() => import("./pages/Pronto.tsx"));
const Pagamento = lazy(() => import("./pages/Pagamento.tsx"));
const StaffLogin = lazy(() => import("./pages/StaffLogin.tsx"));
const StaffDashboard = lazy(() => import("./pages/StaffDashboard.tsx"));
const StaffCheckin = lazy(() => import("./pages/StaffCheckin.tsx"));
const StaffAlterarSenha = lazy(() => import("./pages/StaffAlterarSenha.tsx"));
const StaffPaginaEditor = lazy(() => import("./pages/StaffPaginaEditor.tsx"));
const LandingPublica = lazy(() => import("./pages/LandingPublica.tsx"));
const PaginaPublica = lazy(() => import("./pages/PaginaPublica.tsx"));
const Preparos = lazy(() => import("./pages/Preparos.tsx"));
const Denuncias = lazy(() => import("./pages/Denuncias.tsx"));
const PoliticaPrivacidade = lazy(() => import("./pages/PoliticaPrivacidade.tsx"));
const Blog = lazy(() => import("./pages/Blog.tsx"));
const BlogPost = lazy(() => import("./pages/BlogPost.tsx"));
const NPS = lazy(() => import("./pages/NPS.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-brand" />
  </div>
);

const App = () => {
  useEffect(() => {
    carregarTema();
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/central-de-exames" element={<Index />} />
            <Route path="/exames" element={<SelecaoTipoCompra />} />
            <Route path="/exames/particular" element={<ExamesParticular />} />
            <Route path="/exames/convenio/escolher-convenio" element={<EscolherConvenio />} />
            <Route path="/exames/convenio/catalogo" element={<ExamesConvenio />} />
            <Route path="/exames-legacy" element={<Exames />} />
            <Route path="/vacinas" element={<Vacinas />} />
            <Route path="/sacola" element={<Sacola />} />
            <Route path="/enviar-pedido" element={<EnviarPedido />} />
            <Route path="/receita" element={<EnviarReceita />} />
            <Route path="/cadastro" element={<Cadastro />} />
            <Route path="/entrar" element={<Entrar />} />
            <Route path="/esqueci-senha" element={<EsqueciSenha />} />
            <Route path="/redefinir-senha" element={<RedefinirSenha />} />
            {/* Primeiro acesso foi unificado no cadastro (o cadastro já vincula
                pacientes existentes pelo CPF). Mantém o redirect p/ links antigos. */}
            <Route path="/primeiro-acesso" element={<Navigate to="/cadastro" replace />} />
            <Route path="/agendamentos" element={<Agendamentos />} />
            <Route path="/unidades" element={<Unidades />} />
            <Route path="/pronto/:protocolo" element={<Pronto />} />
            <Route path="/pagamento/:protocolo" element={<Pagamento />} />
            <Route path="/staff/login" element={<StaffLogin />} />
            <Route path="/staff/dashboard" element={<RequireStaff><StaffDashboard /></RequireStaff>} />
            <Route path="/staff/checkin" element={<RequireStaff><StaffCheckin /></RequireStaff>} />
            <Route path="/staff/alterar-senha" element={<RequireStaff><StaffAlterarSenha /></RequireStaff>} />
            <Route path="/staff/paginas/:id" element={<RequireStaff><StaffPaginaEditor kind="landing" /></RequireStaff>} />
            <Route path="/staff/paginas-cms/:id" element={<RequireStaff><StaffPaginaEditor kind="cms" /></RequireStaff>} />
            <Route path="/preparos" element={<Preparos />} />
            <Route path="/politica-de-privacidade" element={<PoliticaPrivacidade />} />
            <Route path="/denuncias" element={<Denuncias />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/nps/:token" element={<NPS />} />
            <Route path="/p/:slug" element={<LandingPublica />} />
            {/* Catch-all dinâmico para páginas do CMS (deve ser o último antes do 404) */}
            <Route path="/:slug" element={<PaginaPublica />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <BarraCheckoutFlutuante />
        <AvisoPopup />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
