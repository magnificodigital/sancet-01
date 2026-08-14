import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AbaPaginasCMS } from "./AbaPaginasCMS";
import { AbaPaginas } from "./AbaPaginas";
import { AbaBlog } from "./AbaBlog";
import { AbaAvisos } from "./AbaAvisos";

export const AbaSites = () => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Sites</h2>
        <p className="text-sm text-muted-foreground">
          Escolha entre páginas fixas do site ou landing pages promocionais.
        </p>
      </div>
      <Tabs defaultValue="site">
        <TabsList>
          <TabsTrigger value="site">Páginas do site</TabsTrigger>
          <TabsTrigger value="landing">Landing pages</TabsTrigger>
          <TabsTrigger value="blog">Blog</TabsTrigger>
          <TabsTrigger value="avisos">Avisos</TabsTrigger>
        </TabsList>
        <TabsContent value="site" className="pt-4">
          <AbaPaginasCMS />
        </TabsContent>
        <TabsContent value="landing" className="pt-4">
          <AbaPaginas />
        </TabsContent>
        <TabsContent value="blog" className="pt-4">
          <AbaBlog />
        </TabsContent>
        <TabsContent value="avisos" className="pt-4">
          <AbaAvisos />
        </TabsContent>
      </Tabs>
    </div>
  );
};
