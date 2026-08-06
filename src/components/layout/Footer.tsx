import { Link } from "react-router-dom";
import logoLight from "@/assets/logo-sancet-light.png";
import { useLogos, useFooter } from "@/lib/tema";

// Link interno (/rota) usa Link do router; externo (http/mailto) usa <a>.
const FooterLink = ({ label, url }: { label: string; url: string }) => {
  const cls = "hover:text-primary-foreground underline-offset-2 hover:underline";
  const externo = /^(https?:|mailto:|tel:)/i.test(url);
  return externo ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className={cls}>{label}</a>
  ) : (
    <Link to={url || "#"} className={cls}>{label}</Link>
  );
};

export const Footer = () => {
  const { claro } = useLogos();
  const footer = useFooter();

  const links: { label: string; url: string }[] =
    footer.links.length > 0
      ? footer.links
      : [
          { label: "Política de Privacidade", url: "/politica-de-privacidade" },
          { label: "Termos de Uso", url: "/termos-de-uso" },
        ];

  return (
    <footer className="bg-footer text-footer-foreground mt-auto">
      <div className="container py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <img
          src={claro || logoLight}
          alt="Sancet Medicina Diagnóstica"
          className="h-14 w-auto"
        />
        <div className="text-sm text-center md:text-right text-footer-foreground/80">
          {footer.texto ? (
            <p className="whitespace-pre-line">{footer.texto}</p>
          ) : (
            <p>
              Feito com <span className="text-primary">❤</span> por{" "}
              <a
                href="https://magnificodigital.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary-foreground underline-offset-2 hover:underline"
              >
                magnificodigital.com
              </a>{" "}
              — Todos os Direitos Reservados © 2026
            </p>
          )}
          <p className="mt-1 flex flex-wrap gap-x-2 gap-y-1 justify-center md:justify-end">
            {links.map((l, i) => (
              <span key={i} className="inline-flex items-center gap-2">
                {i > 0 && <span className="opacity-50">|</span>}
                <FooterLink label={l.label} url={l.url} />
              </span>
            ))}
          </p>
        </div>
      </div>
    </footer>
  );
};
