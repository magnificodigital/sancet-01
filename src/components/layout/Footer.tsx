import logoLight from "@/assets/logo-sancet-light.png";

export const Footer = () => {
  return (
    <footer className="bg-footer text-footer-foreground mt-auto">
      <div className="container py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <img
          src={logoLight}
          alt="Sancet Medicina Diagnóstica"
          className="h-14 w-auto"
        />
        <p className="text-sm text-center md:text-right text-footer-foreground/80">
          Feito com <span className="text-primary">❤</span> por magnificodigital.com — Todos os Direitos Reservados
          {" | "}
          <a href="#" className="hover:text-primary-foreground underline-offset-2 hover:underline">
            Portal de Privacidade
          </a>
          {" | "}© 2026
        </p>
      </div>
    </footer>
  );
};
