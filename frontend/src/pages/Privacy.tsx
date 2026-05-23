import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const Privacy = () => (
  <div className="container mx-auto px-4 py-10 max-w-3xl">
    <Card className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Política de privacidade</h1>
      <p className="text-muted-foreground text-sm">Última atualização: maio de 2026</p>
      <div className="prose prose-sm dark:prose-invert max-w-none space-y-3 text-sm">
        <p>
          Coletamos e-mail, nome de usuário e dados de uso da biblioteca para operar o Eclipse Reads.
          Autenticação é processada pelo Supabase; não armazenamos senhas em texto no navegador.
        </p>
        <p>
          Imagens de perfil e progresso de leitura ficam associados à sua conta. Em modo convidado,
          preferências locais permanecem apenas no seu dispositivo (sessionStorage/localStorage).
        </p>
        <p>
          Não vendemos dados pessoais. Para exclusão de conta ou dúvidas, contacte o administrador
          do projeto acadêmico.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link to="/auth">Voltar ao login</Link>
      </Button>
    </Card>
  </div>
);

export default Privacy;
