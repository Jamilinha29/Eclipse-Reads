export type DailyQuote = {
  id: string;
  quote: string;
  author: string;
  category: string | null;
};

const FALLBACK_QUOTES: DailyQuote[] = [
  {
    id: "fallback-1",
    quote: "Um leitor vive mil vidas antes de morrer. O homem que nunca lê vive apenas uma.",
    author: "George R.R. Martin",
    category: "Geral",
  },
  {
    id: "fallback-2",
    quote: "A leitura é para a mente o que o exercício é para o corpo.",
    author: "Joseph Addison",
    category: "Geral",
  },
  {
    id: "fallback-3",
    quote: "Os livros são uma porta de entrada para mil mundos.",
    author: "Eclipse Reads",
    category: "Geral",
  },
];

function dayOfYearIndex(length: number): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return dayOfYear % length;
}

export function getFallbackDailyQuote(): DailyQuote {
  return FALLBACK_QUOTES[dayOfYearIndex(FALLBACK_QUOTES.length)]!;
}
