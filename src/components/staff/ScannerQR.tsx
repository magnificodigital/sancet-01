import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ScannerQRProps {
  open: boolean;
  onClose: () => void;
  onScan: (text: string) => void;
}

const REGION_ID = "scanner-qr-region";

export const ScannerQR = ({ open, onClose, onScan }: ScannerQRProps) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [detectado, setDetectado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErro(null);
    setDetectado(false);

    let cancelado = false;

    const iniciar = async () => {
      // espera o elemento existir
      await new Promise((r) => setTimeout(r, 50));
      if (cancelado) return;

      try {
        const html5 = new Html5Qrcode(REGION_ID, { verbose: false });
        scannerRef.current = html5;
        await html5.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (texto) => {
            setDetectado(true);
            onScan(texto);
            parar();
          },
          () => {
            // erros de leitura por frame: ignorar
          },
        );
      } catch (e: any) {
        const msg = String(e?.message || e || "");
        if (msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("notallowed")) {
          setErro("Permissão de câmera negada. Habilite no navegador e tente novamente.");
        } else if (msg.toLowerCase().includes("notfound") || msg.toLowerCase().includes("no camera")) {
          setErro("Nenhuma câmera encontrada neste dispositivo.");
        } else {
          setErro("Não foi possível iniciar a câmera.");
        }
        toast.error("Erro ao acessar câmera");
      }
    };

    const parar = async () => {
      const s = scannerRef.current;
      if (!s) return;
      try {
        if (s.isScanning) await s.stop();
        await s.clear();
      } catch {
        // noop
      }
      scannerRef.current = null;
    };

    iniciar();

    return () => {
      cancelado = true;
      parar();
    };
  }, [open, onScan]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Escanear QR do voucher</DialogTitle>
          <DialogDescription>Aponte a câmera para o QR do voucher</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center">
          {erro ? (
            <div className="flex h-[300px] w-full flex-col items-center justify-center rounded-md border border-destructive/30 bg-destructive/5 p-4 text-center text-sm text-destructive">
              {erro}
            </div>
          ) : (
            <div
              id={REGION_ID}
              className={`relative h-[300px] w-[300px] overflow-hidden rounded-md border-4 transition-colors ${
                detectado ? "animate-pulse border-green-500" : "border-border"
              }`}
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
