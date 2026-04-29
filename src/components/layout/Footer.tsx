export const Footer = () => {
  return (
    <footer className="bg-footer text-footer-foreground mt-auto">
      <div className="container py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <span className="text-2xl font-extrabold italic">Sancet</span>
        <p className="text-sm text-center md:text-right text-footer-foreground/80">
          Feito com <span className="text-primary">❤</span> por Sancet Laboratórios — Todos os Direitos Reservados
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
