import { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";

export const PageShell = ({ children }: { children: ReactNode }) => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-20">{children}</main>
      <Footer />
    </div>
  );
};
