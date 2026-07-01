import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Exames from "./pages/Exames.tsx";
import SelecaoTipoCompra from "./pages/SelecaoTipoCompra.tsx";
import ExamesParticular from "./pages/ExamesParticular.tsx";
import ExamesConvenio from "./pages/ExamesConvenio.tsx";
import EscolherConvenio from "./pages/EscolherConvenio.tsx";
import Vacinas from "./pages/Vacinas.tsx";
import Sacola from "./pages/Sacola.tsx";
import EnviarPedido from "./pages/EnviarPedido.tsx";
import EnviarReceita from "./pages/EnviarReceita.tsx";
import Cadastro from "./pages/Cadastro.tsx";
import Entrar from "./pages/Entrar.tsx";
import EsqueciSenha from "./pages/EsqueciSenha.tsx";
import RedefinirSenha from "./pages/RedefinirSenha.tsx";
import PrimeiroAcesso from "./pages/PrimeiroAcesso.tsx";
import Agendamentos from "./pages/Agendamentos.tsx";
import Unidades from "./pages/Unidades.tsx";
import Pronto from "./pages/Pronto.tsx";
import Pagamento from "./pages/Pagamento.tsx";
import StaffLogin from "./pages/StaffLogin.tsx";
import StaffDashboard from "./pages/StaffDashboard.tsx";
import StaffCheckin from "./pages/StaffCheckin.tsx";
import StaffAlterarSenha from "./pages/StaffAlterarSenha.tsx";
import StaffPaginaEditor from "./pages/StaffPaginaEditor.tsx";
import LandingPublica from "./pages/LandingPublica.tsx";
import PaginaPublica from "./pages/PaginaPublica.tsx";
import Preparos from "./pages/Preparos.tsx";
import NotFound from "./pages/NotFound.tsx";
import { BarraCheckoutFlutuante } from "./components/catalogo/BarraCheckoutFlutuante";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
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
          <Route path="/primeiro-acesso" element={<PrimeiroAcesso />} />
          <Route path="/agendamentos" element={<Agendamentos />} />
          <Route path="/unidades" element={<Unidades />} />
          <Route path="/pronto/:protocolo" element={<Pronto />} />
          <Route path="/pagamento/:protocolo" element={<Pagamento />} />
          <Route path="/staff/login" element={<StaffLogin />} />
          <Route path="/staff/dashboard" element={<StaffDashboard />} />
          <Route path="/staff/checkin" element={<StaffCheckin />} />
          <Route path="/staff/alterar-senha" element={<StaffAlterarSenha />} />
          <Route path="/staff/paginas/:id" element={<StaffPaginaEditor />} />
          <Route path="/preparos" element={<Preparos />} />
          <Route path="/p/:slug" element={<LandingPublica />} />
          {/* Catch-all dinâmico para páginas do CMS (deve ser o último antes do 404) */}
          <Route path="/:slug" element={<PaginaPublica />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <BarraCheckoutFlutuante />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
