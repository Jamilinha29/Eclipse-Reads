# Correções de bugs — índice (legado)

> **Este arquivo foi substituído.** O conteúdo histórico (FIX-01 … FIX-48, ~1900 linhas) era um relatório de grupo duplicando informação que agora está consolidada.

## Use estes documentos

| Documento | Conteúdo |
|-----------|----------|
| **[AUDITORIA_ECLIPSE_READS.md](./AUDITORIA_ECLIPSE_READS.md)** | Status atual: corrigido / aberto / manual |
| **[CORRECOES_CRITICAS_20260523.md](./CORRECOES_CRITICAS_20260523.md)** | Detalhes técnicos: prioridade, antes/depois, arquivos e linhas |
| **[CI_SECRETS.md](./CI_SECRETS.md)** | Secrets GitHub e variáveis de ambiente |

## Por que remover o documento longo?

1. **Duplicação** — FIX-01…48 repetiam o que a auditoria e o código já registram.  
2. **Desatualização** — citava 54 testes, IDs antigos e itens já corrigidos em 23/05.  
3. **Manutenção** — três fontes de verdade geravam conflito (FIX vs C-01 vs corrections C-01).

## Se precisar do histórico FIX-*

Consulte o Git na revisão anterior a 23/05/2026:

```powershell
git log --oneline -- "docs/README - correção bug,erros,falhas encontrados.md"
git show <commit>:docs/README` -` correção` bug,erros,falhas` encontrados.md
```

## Testes atuais

```powershell
npm test          # 56/56
npm run audit:supabase
```
