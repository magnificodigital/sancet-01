import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Exames from "./pages/Exames.tsx";
import Vacinas from "./pages/Vacinas.tsx";
import Sacola from "./pages/Sacola.tsx";
import EnviarPedido from "./pages/EnviarPedido.tsx";
import EnviarReceita from "./pages/EnviarReceita.tsx";
import Cadastro from "./pages/Cadastro.tsx";
import Entrar from "./pages/Entrar.tsx";
import Agendamentos from "./pages/Agendamentos.tsx";
import Pronto from "./pages/Pronto.tsx";
import StaffLogin from "./pages/StaffLogin.tsx";
import StaffDashboard from "./pages/StaffDashboard.tsx";
import StaffAlterarSenha from "./pages/StaffAlterarSenha.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/exames" element={<Exames />} />
          <Route path="/vacinas" element={<Vacinas />} />
          <Route path="/sacola" element={<Sacola />} />
          <Route path="/enviar-pedido" element={<EnviarPedido />} />
          <Route path="/receita" element={<EnviarReceita />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/entrar" element={<Entrar />} />
          <Route path="/agendamentos" element={<Agendamentos />} />
          <Route path="/pronto/:protocolo" element={<Pronto />} />
          <Route path="/staff/login" element={<StaffLogin />} />
          <Route path="/staff/dashboard" element={<StaffDashboard />} />
          <Route path="/staff/alterar-senha" element={<StaffAlterarSenha />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
