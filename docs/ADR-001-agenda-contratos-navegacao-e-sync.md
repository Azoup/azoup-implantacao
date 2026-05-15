# ADR 001 — Agenda: contratos de navegação e sync (rascunho vivo)

## Contexto

A Agenda recebe intenções de “editar evento” ou “novo evento pré-preenchido” vindas do detalhe do projeto e de links internos. O estado do React Router (`location.state`) não sobrevive a refresh nem a partilha de URL.

## Decisão

1. **Contrato duplo (ordem de leitura):** primeiro **query string** (`editEvent`, `prefillTask`, `prefillProject` — nomes em `src/lib/agendaDeepLink.ts`), depois **`location.state`** com o mesmo significado, para compatibilidade com chamadas antigas.
2. **Após consumir** a intenção, a página faz `replace` e **remove** só as chaves conhecidas da query (preservando outros parâmetros futuros) e limpa o `state` relevante.
3. **Sync Google (futuro):** Postgres + colunas `google_*` / etag como metadados; **tokens OAuth** apenas em tabela com RLS e escrita via Edge Function com `service_role`; cliente emite intenções e consome estado de sync — detalhes na matriz “quem grava o quê” a fechar na implementação da Fase 4.

## Consequências

- URLs como `/agenda?editEvent=<id>` podem ser copiadas; ainda é preciso permissão `agenda.view` / `agenda.edit` na app.
- Qualquer nova rota que navegue para a Agenda deve preferir `buildAgendaNavigateTo` em vez de duplicar nomes de parâmetros.

## Milestone sugerido (sync Google)

**Slice 4.0 — só leitura:** conectar OAuth → importar janela curta (ex.: 7 dias) → mostrar na UI com badge “Google” → **sem** escrita bidirecional até fila e política de conflito estarem definidas.
