import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageShell } from "@/components/layout/PageShell";
import { LeitorReceita } from "@/components/receita/LeitorReceita";

const EnviarReceita = () => {
  const navigate = useNavigate();
  return (
    <PageShell>
      <div className="min-h-[calc(100vh-200px)] bg-[#F5F5F5] py-6">
        <div className="mx-auto w-full max-w-[480px] px-4">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 inline-flex items-center gap-1 text-sm text-secondary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>

          <div className="rounded-2xl bg-white p-8 shadow-sm">
            <LeitorReceita />
          </div>
        </div>
      </div>
    </PageShell>
  );
};

export default EnviarReceita;
