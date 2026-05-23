import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const Terms = () => (
  <div className="container mx-auto px-4 py-10 max-w-3xl">
    <Card className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Termos de uso</h1>
      <p className="text-muted-foreground text-sm">Última atualização: maio de 2026</p>
      <div className="prose prose-sm dark:prose-invert max-w-none space-y-3 text-sm">
        <p>
          O Eclipse Reads é uma plataforma de leitura digital para fins acadêmicos e de demonstração.
          Ao criar uma conta, você concorda em usar o serviço de forma lícita e respeitar os direitos
          autorais dos conteúdos disponibilizados.
        </p>
        <p>
          É proibido redistribuir, copiar em massa ou revender obras protegidas obtidas pela plataforma.
          Submissões de obras devem ser de sua autoria ou com autorização do titular.
        </p>
        <p>
          Reservamo-nos o direito de suspender contas que violem estas regras ou abusarem do sistema.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link to="/auth">Voltar ao login</Link>
      </Button>
    </Card>
  </div>
);

export default Terms;
