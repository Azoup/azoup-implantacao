# Visão de produto — roadmap por fases

VYNTASK como **centro de implantações** (referência operacional ao modelo Artia): um só lugar para equipe interna e cliente acompanharem implantação, documentação, agenda e sinais financeiros por projeto.

## Fase 1 — Operação e transparência (em curso)

- Quadro por projeto com **uma linha lógica por tarefa** (eventos N:1 na mesma entidade).
- **Portal do cliente**: leitura de andamento, agenda e formulários — sem expor dados internos sensíveis.
- **Dashboard** e KPIs alinhados a eventos reais (agenda), não só a status solto.

## Fase 2 — Conhecimento e liderança

- **Manuais / docs internos** por projeto ou área, com busca e consumo offline onde já existir no app.
- **Assistente para liderança** (OpenAI ou provedor equivalente): resumos de status, riscos e próximos passos a partir do grafo do projeto e da documentação — **sem chaves no repositório**; sempre via variáveis de ambiente e políticas de dados.

## Fase 3 — Financeiro e cobrança (incremental)

- Visão de **horas contratadas vs consumidas**, cancelamentos com impacto e indicação de **inadimplência / delinquência** por projeto ou carteira.
- Relatórios exportáveis para financeiro; integrações futuras (ERP/cobrança) opcionais.

## Notas

- Prioridade absoluta: **clareza operacional** antes de expandir módulos.
- Migrações de dados legados (ex.: cadeias `rescheduled*`) ficam em ferramentas administrativas até limpeza total do modelo.
