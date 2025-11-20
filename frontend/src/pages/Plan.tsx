import { ArrowLeft, Crown, Sparkles, Shield, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Plan = () => {
  const { authType } = useAuth();

  const freeFeatures = [
    "Acesso a livros básicos",
    "Leitura ilimitada",
    "Recomendações sobre segmentos",
    "Recomendações de páginas"
  ];

  const premiumFeatures = [
    "Todos os recursos",
    "Acesso a todos Temas offline",
    "Downloads ilimitados",
    "Sem anúncios",
    "Sincronização multiplataforma",
    "Estatísticas avançadas",
    "Temas personalizáveis",
    "Todos personalizações"
  ];

  const benefits = [
    {
      icon: Crown,
      title: "Conteúdo Exclusivo",
      description: "Livros e coleções disponíveis exclusivamente para assinantes"
    },
    {
      icon: Sparkles,
      title: "Experiência Completa",
      description: "Leia offline, personalize com temas e receba recomendações"
    },
    {
      icon: Shield,
      title: "Suporte Premium",
      description: "Suporte prioritário e lançamentos antecipados"
    }
  ];

  return (
    <div className="min-h-screen pb-8">
      <section className="container mx-auto px-4 pt-8 pb-6">
        <Link to="/profile">
          <Button variant="ghost" size="sm" className="gap-2 mb-6">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </Link>

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="h-6 w-6 text-accent" />
            <h1 className="text-3xl font-bold">Planos & Assinatura</h1>
          </div>
          <p className="text-muted-foreground">Escolha o plano ideal para você</p>
        </div>

        <Card className="p-6 mb-6 gradient-primary border-0 shadow-glow">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">Plano Atual</h2>
            </div>
            <span className="text-sm px-3 py-1 rounded-full bg-white/20">
              Válido até novembro de 2025
            </span>
          </div>
          <p className="text-lg font-bold">
            {authType === "guest" ? "Gratuito" : authType === "email" || authType === "google" ? "Gratuito" : "Gratuito"}
          </p>
        </Card>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="p-6 bg-card border-border">
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-2">Gratuito</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">R$ 0</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
            </div>
            
            <ul className="space-y-3 mb-6">
              {freeFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <Button variant="outline" className="w-full" disabled>
              Plano Atual
            </Button>
          </Card>

          <Card className="p-6 bg-card border-accent relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-accent text-accent-foreground px-3 py-1 rounded-full text-xs font-bold">
              Mais popular
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-bold mb-2">Premium</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">R$ 19,90</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
            </div>
            
            <ul className="space-y-3 mb-6">
              {premiumFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <Button className="w-full gradient-accent border-0 text-accent-foreground font-bold">
              Assinar Premium
            </Button>
          </Card>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6">Por que escolher Premium?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {benefits.map((benefit) => (
              <Card key={benefit.title} className="p-6 bg-secondary border-0">
                <div className="rounded-full bg-primary/20 p-3 w-fit mb-4">
                  <benefit.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-bold mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </Card>
            ))}
          </div>
        </div>

        <Card className="p-8 gradient-primary border-0 text-center">
          <Crown className="h-16 w-16 mx-auto mb-4 text-white" />
          <h2 className="text-2xl font-bold mb-3">Desbloqueie Todo o Potencial do Eclipse Reads</h2>
          <p className="text-primary-foreground/90 mb-6 max-w-2xl mx-auto">
            Acesse conteúdos exclusivos, personalize sua experiência e aproveite todos os recursos sem limites
          </p>
          <Button size="lg" className="bg-white hover:bg-white/90 text-primary font-bold">
            Começar Período Grátis
          </Button>
        </Card>
      </section>
    </div>
  );
};

export default Plan;
