-- ============================================================
-- VynTask — Seed: fases e tarefas dos modelos de plano
-- Gerado por: scripts/gen_plan_templates_sql.py
-- Fonte: dados reais do projeto antigo (Lovable)
-- Pré-requisito: 006_seed_builtin_plan_models.sql já rodado
-- Reexecução segura: ON CONFLICT (id) DO UPDATE (idempotente)
-- ============================================================

-- Quantidades esperadas:
-- plan_phases : 14
-- plan_tasks  : 72

-- ------------------------------------------------------------
-- PLAN PHASES
-- ------------------------------------------------------------
INSERT INTO public.plan_phases (id, plan_model_id, name, order_index)
VALUES
  ('3fbdd003-f48c-4ea7-bd43-ece3286c88bc', 'a1111111-1111-4111-8111-111111111111', 'Fase 00 — Onboarding e Preparação', 0),
  ('8dccad05-49be-490b-8189-31570bacda2f', 'a1111111-1111-4111-8111-111111111111', 'Fase 01 — Vendas', 1),
  ('5d5d867b-fc10-4992-99c2-1d6fabbb173d', 'a1111111-1111-4111-8111-111111111111', 'Fase 02 — Produção', 2),
  ('30b19512-232c-4568-b2ee-894baad6dfcf', 'a1111111-1111-4111-8111-111111111111', 'Fase 03 — Gerencial', 3),
  ('fead8e7f-268f-4516-aead-4ef7a563ef9f', 'a2222222-2222-4222-8222-222222222222', 'Fase 00 — Onboarding e Preparação', 0),
  ('0e5012c9-88e6-4f22-b947-d5aac9a95b61', 'a2222222-2222-4222-8222-222222222222', 'Fase 01 — Vendas', 1),
  ('559fa3a4-9fba-49cd-a528-c9e13c5c6ec0', 'a2222222-2222-4222-8222-222222222222', 'Fase 02 — Financeiro', 2),
  ('77698178-d076-4e41-948d-62ff782359fe', 'a2222222-2222-4222-8222-222222222222', 'Fase 03 — Produção', 3),
  ('49624328-1640-4f83-91fd-d0a96172e760', 'a2222222-2222-4222-8222-222222222222', 'Fase 04 — Gerencial', 4),
  ('bf09e763-3d7a-4b6f-9dfe-d46264257dd6', 'a3333333-3333-4333-8333-333333333333', 'Fase 00 — Onboarding e Preparação', 0),
  ('6063807b-83af-4b26-a463-921675882b65', 'a3333333-3333-4333-8333-333333333333', 'Fase 01 — Vendas', 1),
  ('c3d502a4-3ad7-4cf6-a52f-50fa8aeaadff', 'a3333333-3333-4333-8333-333333333333', 'Fase 02 — Financeiro', 2),
  ('62d60724-0283-4863-b67f-e361c1138c8f', 'a3333333-3333-4333-8333-333333333333', 'Fase 03 — Produção', 3),
  ('1d626443-f4d3-442d-a0fd-16298a7dde91', 'a3333333-3333-4333-8333-333333333333', 'Fase 04 — Gerencial', 4)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  order_index = EXCLUDED.order_index;

-- ------------------------------------------------------------
-- PLAN TASKS
-- ------------------------------------------------------------
INSERT INTO public.plan_tasks
  (id, plan_phase_id, code, title, description, estimated_hours, is_informational, sort_order)
VALUES
  ('88897e01-90f5-4066-816a-b16d1862b368', '3fbdd003-f48c-4ea7-bd43-ece3286c88bc', '0.1', '0.1 Primeiro Contato', 'Primeiro contato com o cliente', 0, true, 1),
  ('7da5fda4-9fe2-4dbc-a6d9-f3460b82d640', '3fbdd003-f48c-4ea7-bd43-ece3286c88bc', '0.2', '0.2 Formulário de boas-vindas', 'Envio e preenchimento do formulário de boas-vindas', 0, true, 2),
  ('b733676c-d862-4596-ae2b-5739c209e687', '3fbdd003-f48c-4ea7-bd43-ece3286c88bc', '0.3', '0.3 Reunião de Alinhamento', 'Reunião inicial para alinhar expectativas e cronograma', 0, true, 3),
  ('0fddaffd-4f86-4ba2-b19d-9ff89921e7ea', '3fbdd003-f48c-4ea7-bd43-ece3286c88bc', '0.4', '0.4 Planilha Enviada', 'Envio da planilha modelo para preenchimento pelo cliente', 0, true, 4),
  ('b4a384c7-19bb-417e-9f62-738b9f5a6761', '3fbdd003-f48c-4ea7-bd43-ece3286c88bc', '0.5', '0.5 Planilha Devolvida', 'Recebimento da planilha preenchida pelo cliente', 0, true, 5),
  ('404d732d-90ce-45f7-8fb7-ad91089ecd80', '8dccad05-49be-490b-8189-31570bacda2f', '1.1', '1.1 Instalação do Sistema', 'Instalar e configurar ambiente do cliente', 2, false, 1),
  ('2acff2b6-7cc6-4bef-b083-b18365c3ba1d', '8dccad05-49be-490b-8189-31570bacda2f', '1.2', '1.2 Configurações', 'Parametrizar regras comerciais, tabelas de preço', 2, false, 2),
  ('f5f87b17-0fe0-4e28-ad89-6dd1577a95d9', '8dccad05-49be-490b-8189-31570bacda2f', '1.3', '1.3 Cadastros', 'Cadastrar clientes, produtos, condições de pagamento', 3, false, 3),
  ('610def6d-74a2-4012-86a9-7a54e0e71e27', '8dccad05-49be-490b-8189-31570bacda2f', '1.4', '1.4 Vendas', 'Configurar e treinar módulo de vendas', 3, false, 4),
  ('6bb0db83-1c59-448a-a1d8-4c90ea146253', '8dccad05-49be-490b-8189-31570bacda2f', '1.5', '1.5 NF-e', 'Configurar emissão de NF-e, certificado digital', 2, false, 5),
  ('dc5757a8-5c69-478d-920d-8510d4d5c60d', '8dccad05-49be-490b-8189-31570bacda2f', '1.6', '1.6 Virada de Sistema: Vendas', 'Migrar operação de vendas para o novo sistema', 4, false, 6),
  ('a9432657-f98e-461e-a74e-ba4c8be8f2f5', '5d5d867b-fc10-4992-99c2-1d6fabbb173d', '2.1', '2.1 Cadastros: Produção', 'Cadastrar matérias-primas, aviamentos, grades', 3, false, 1),
  ('5af892fb-2d3c-4b78-8aea-c724e7f3afc5', '5d5d867b-fc10-4992-99c2-1d6fabbb173d', '2.2', '2.2 Ordem de Produção', 'Configurar fluxo de ordens de produção', 3, false, 2),
  ('f2a6f534-64cf-4ba2-bfe7-f00c32c5e9eb', '5d5d867b-fc10-4992-99c2-1d6fabbb173d', '2.3', '2.3 Virada de Sistema: Produção', 'Migrar operação de produção para o sistema', 4, false, 3),
  ('46ffc408-4b3e-4f66-a393-ab5bfd58852b', '30b19512-232c-4568-b2ee-894baad6dfcf', '3.1', '3.1 Controle Financeiro', 'Configurar contas a pagar, receber, plano de contas', 2, false, 1),
  ('095d098d-5241-446d-9efb-58ce89862762', '30b19512-232c-4568-b2ee-894baad6dfcf', '3.2', '3.2 Controle de Estoque: Produto Acabado', 'Configurar controle de estoque de produto acabado', 1, false, 2),
  ('136c2e0b-bae6-45b1-8385-775b87c45006', '30b19512-232c-4568-b2ee-894baad6dfcf', '3.3', '3.3 Relatórios BI', 'Configurar dashboards e relatórios de business intelligence', 1, false, 3),
  ('e754ac18-23bd-4c74-a5a7-26a8ce1b1393', '30b19512-232c-4568-b2ee-894baad6dfcf', '3.4', '3.4 Finalização do Projeto', 'Encerramento formal do projeto de implantação', 0, false, 4),
  ('bd1a106e-43b4-4f76-98b3-a29c12c4cd0f', 'fead8e7f-268f-4516-aead-4ef7a563ef9f', '0.1', '0.1 Primeiro Contato', 'Primeiro contato com o cliente', 0, true, 1),
  ('6816b61d-9725-4f56-962e-f952d342162f', 'fead8e7f-268f-4516-aead-4ef7a563ef9f', '0.2', '0.2 Formulário de boas-vindas', 'Envio e preenchimento do formulário de boas-vindas', 0, true, 2),
  ('8caaa15b-4a54-454c-95f9-b96ddde4816c', 'fead8e7f-268f-4516-aead-4ef7a563ef9f', '0.3', '0.3 Reunião de Alinhamento', 'Reunião inicial para alinhar expectativas e cronograma', 0, true, 3),
  ('429395e6-60e0-4ba3-9263-0f614c864fd7', 'fead8e7f-268f-4516-aead-4ef7a563ef9f', '0.4', '0.4 Planilha Enviada', 'Envio da planilha modelo para preenchimento pelo cliente', 0, true, 4),
  ('d4a97c18-6bfa-408b-a624-b2a5bc918463', 'fead8e7f-268f-4516-aead-4ef7a563ef9f', '0.5', '0.5 Planilha Devolvida', 'Recebimento da planilha preenchida pelo cliente', 0, true, 5),
  ('0ba969a0-d1b7-4722-bdc2-987494c7c8a6', '0e5012c9-88e6-4f22-b947-d5aac9a95b61', '1.1', '1.1 Instalação do Sistema', 'Instalar e configurar ambiente do cliente', 2, false, 1),
  ('0c3a2e9f-553b-44cf-8877-8a5c37cc61c7', '0e5012c9-88e6-4f22-b947-d5aac9a95b61', '1.2', '1.2 Configurações', 'Parametrizar regras comerciais, tabelas de preço', 2, false, 2),
  ('e7c41668-76f5-421c-a34b-93b8fccf1959', '0e5012c9-88e6-4f22-b947-d5aac9a95b61', '1.3', '1.3 Cadastros', 'Cadastrar clientes, produtos, condições de pagamento', 4, false, 3),
  ('b464c425-f750-410f-9bd7-31a5c9792601', '0e5012c9-88e6-4f22-b947-d5aac9a95b61', '1.4', '1.4 Vendas', 'Configurar e treinar módulo de vendas', 4, false, 4),
  ('a9176e0f-6c75-4349-853e-7c1fdd1ac5bb', '0e5012c9-88e6-4f22-b947-d5aac9a95b61', '1.5', '1.5 NF-e', 'Configurar emissão de NF-e, certificado digital', 4, false, 5),
  ('b505ae63-f515-4a2f-af92-f7ee00898702', '0e5012c9-88e6-4f22-b947-d5aac9a95b61', '1.6', '1.6 Virada de Sistema: Vendas', 'Migrar operação de vendas para o novo sistema', 4, false, 6),
  ('4cd85e16-ef0b-4d05-b997-54972d6c72ca', '559fa3a4-9fba-49cd-a528-c9e13c5c6ec0', '2.1', '2.1 Controle Financeiro', 'Configurar contas a pagar, receber, plano de contas', 3, false, 1),
  ('cb0624a8-9ec0-48af-bd01-1366e669f9f6', '559fa3a4-9fba-49cd-a528-c9e13c5c6ec0', '2.2', '2.2 Boletos', 'Configurar emissão e integração de boletos', 2, false, 2),
  ('9bd500f4-31ca-4650-b623-c48717ac2813', '77698178-d076-4e41-948d-62ff782359fe', '3.1', '3.1 Cadastros: Produção', 'Cadastrar matérias-primas, aviamentos, grades', 4, false, 1),
  ('c7471938-822b-4d01-9fa6-cb68f3894225', '77698178-d076-4e41-948d-62ff782359fe', '3.2', '3.2 Ficha Técnica e Custo', 'Criar fichas técnicas com custos de produção', 4, false, 2),
  ('97acf7dd-9248-402f-9f29-1151c417eb6c', '77698178-d076-4e41-948d-62ff782359fe', '3.3', '3.3 Ordem de Produção', 'Configurar fluxo de ordens de produção', 4, false, 3),
  ('f203ce9d-7a22-4f70-9c3b-bd5303591538', '77698178-d076-4e41-948d-62ff782359fe', '3.4', '3.4 Virada de Sistema: Produção', 'Migrar operação de produção para o sistema', 4, false, 4),
  ('0d816088-4153-4a0f-9790-e2536cdc6c13', '77698178-d076-4e41-948d-62ff782359fe', '3.5', '3.5 Pagamento de Faccionistas', 'Cadastrar e configurar controle de facções', 2, false, 5),
  ('e4faca7e-de42-4040-8192-601484d2c4a6', '77698178-d076-4e41-948d-62ff782359fe', '3.6', '3.6 Controle de Estoque', 'Configurar controle de estoque de insumos', 3, false, 6),
  ('a4f50596-1556-4cff-a8db-e9e1bffbb655', '49624328-1640-4f83-91fd-d0a96172e760', '4.1', '4.1 Fluxo de Caixa', 'Configurar relatório de fluxo de caixa', 2, false, 1),
  ('dcd8c0a5-7419-42f6-b5c6-f22512c685f6', '49624328-1640-4f83-91fd-d0a96172e760', '4.2', '4.2 DRE', 'Configurar demonstrativo de resultados', 1, false, 2),
  ('4a538fd5-7c99-4216-96b9-b3002d6a0990', '49624328-1640-4f83-91fd-d0a96172e760', '4.3', '4.3 Relatórios BI', 'Configurar dashboards e relatórios de business intelligence', 1, false, 3),
  ('338f0108-e844-40de-aed1-42b664613a68', '49624328-1640-4f83-91fd-d0a96172e760', '4.4', '4.4 Finalização do Projeto', 'Encerramento formal do projeto de implantação', 0, false, 4),
  ('e6444316-d9ad-4cfc-b032-77ed7aaf70b7', 'bf09e763-3d7a-4b6f-9dfe-d46264257dd6', '0.1', '0.1 Primeiro Contato', 'Primeiro contato com o cliente', 0, true, 1),
  ('8b3ffa14-c027-4222-83d9-ba2f5732d3dc', 'bf09e763-3d7a-4b6f-9dfe-d46264257dd6', '0.2', '0.2 Formulário de boas-vindas', 'Envio e preenchimento do formulário de boas-vindas', 0, true, 2),
  ('692db5f9-187f-4d04-a7e4-8b8fff1c4293', 'bf09e763-3d7a-4b6f-9dfe-d46264257dd6', '0.3', '0.3 Reunião de Alinhamento', 'Reunião inicial para alinhar expectativas e cronograma', 0, true, 3),
  ('67271c82-775f-47a2-8662-244f6e55ab27', 'bf09e763-3d7a-4b6f-9dfe-d46264257dd6', '0.4', '0.4 Planilha Enviada', 'Envio da planilha modelo para preenchimento pelo cliente', 0, true, 4),
  ('3640f4d4-d75f-42ee-9fbb-822a286272a5', '6063807b-83af-4b26-a463-921675882b65', '1.1', '1.1 Instalação do Sistema', 'Instalar e configurar ambiente do cliente', 4, false, 1),
  ('4ae8d185-8b6c-4203-a9d6-0e5da85c2d49', '6063807b-83af-4b26-a463-921675882b65', '1.2', '1.2 Configurações', 'Parametrizar regras comerciais, tabelas de preço', 4, false, 2),
  ('b75aa590-5c38-42b5-9f27-d2c661dcad61', '6063807b-83af-4b26-a463-921675882b65', '1.3', '1.3 Cadastros', 'Cadastrar clientes, produtos, condições de pagamento', 4, false, 3),
  ('78d0c82a-5561-485c-9b61-7c20be0308fe', '6063807b-83af-4b26-a463-921675882b65', '1.4', '1.4 Vendas', 'Configurar e treinar módulo de vendas', 4, false, 4),
  ('16ffbc2b-5177-43de-b4e4-570277db77cb', 'bf09e763-3d7a-4b6f-9dfe-d46264257dd6', '0.5', '0.5 Planilha Devolvida', 'Recebimento da planilha preenchida pelo cliente', 0, true, 5),
  ('d1f4600b-c3cb-4522-9bd2-d245f87e67df', 'fead8e7f-268f-4516-aead-4ef7a563ef9f', '0.6', '0.6 Cronograma', 'Definição e validação do cronograma de implantação', 0, true, 6),
  ('31c0e5e1-7017-42d9-be2f-970c97e6c3a7', '3fbdd003-f48c-4ea7-bd43-ece3286c88bc', '0.6', '0.6 Cronograma', 'Definição e validação do cronograma de implantação', 0, true, 6),
  ('4e242867-f9f9-47c8-bfa0-7a940f3a8f3a', '6063807b-83af-4b26-a463-921675882b65', '1.5', '1.5 NF-e', 'Configurar emissão de NF-e, certificado digital', 4, false, 5),
  ('7b1bb827-c3e6-457d-9e03-00d5746b23bf', '6063807b-83af-4b26-a463-921675882b65', '1.6', '1.6 Virada de Sistema: Vendas', 'Migrar operação de vendas para o novo sistema', 4, false, 6),
  ('55ae3657-2b44-48ff-976f-6126306c634b', '6063807b-83af-4b26-a463-921675882b65', '1.7', '1.7 AzVendas', 'Configurar módulo AzVendas', 4, false, 7),
  ('7e7ce4e7-639d-42ef-be84-df372de55677', '6063807b-83af-4b26-a463-921675882b65', '1.8', '1.8 Integração E-commerce', 'Integrar sistema com loja virtual', 2, false, 8),
  ('9f8c7bc4-39b6-446f-9a31-9c8c1ecf8c24', 'c3d502a4-3ad7-4cf6-a52f-50fa8aeaadff', '2.1', '2.1 Controle Financeiro', 'Configurar contas a pagar, receber, plano de contas', 2, false, 1),
  ('6da6efab-7991-475f-8d1f-349624f21a4b', 'c3d502a4-3ad7-4cf6-a52f-50fa8aeaadff', '2.2', '2.2 Boletos', 'Configurar emissão e integração de boletos', 2, false, 2),
  ('263966ee-1129-447d-af99-cade453634d7', 'c3d502a4-3ad7-4cf6-a52f-50fa8aeaadff', '2.3', '2.3 Controle de Cheque', 'Configurar controle de cheques recebidos e emitidos', 2, false, 3),
  ('f229a02c-9e9c-4e3e-8bec-bd30c3c7aaaf', '62d60724-0283-4863-b67f-e361c1138c8f', '3.1', '3.1 Cadastros: Produção', 'Cadastrar matérias-primas, aviamentos, grades', 4, false, 1),
  ('2e09f5db-cb02-4171-a6cf-28f9d24bd349', '62d60724-0283-4863-b67f-e361c1138c8f', '3.2', '3.2 Ficha Técnica e Custo', 'Criar fichas técnicas com custos de produção', 6, false, 2),
  ('fb5ea52b-84f0-4345-8ebe-29e2b29a8da0', '62d60724-0283-4863-b67f-e361c1138c8f', '3.3', '3.3 Ordem de Produção', 'Configurar fluxo de ordens de produção', 4, false, 3),
  ('6aa9defb-c3ca-4a3e-838d-c41933d8eb2f', '62d60724-0283-4863-b67f-e361c1138c8f', '3.4', '3.4 Virada de Sistema: Produção', 'Migrar operação de produção para o sistema', 4, false, 4),
  ('be50f101-1409-42b1-81e9-64d8c4b409cd', '62d60724-0283-4863-b67f-e361c1138c8f', '3.5', '3.5 Pagamento de Faccionistas', 'Cadastrar e configurar controle de facções', 2, false, 5),
  ('444c6c51-d990-4b9b-b691-9a2f12a311f0', '62d60724-0283-4863-b67f-e361c1138c8f', '3.6', '3.6 Controle de Estoque', 'Configurar controle de estoque de insumos', 4, false, 6),
  ('614a7ef2-b454-4467-aced-fd1d35d3797e', '1d626443-f4d3-442d-a0fd-16298a7dde91', '4.1', '4.1 Fluxo de Caixa', 'Configurar relatório de fluxo de caixa', 2, false, 1),
  ('d8bc7e4c-c0a5-470b-9108-8c120af61101', '1d626443-f4d3-442d-a0fd-16298a7dde91', '4.2', '4.2 DRE', 'Configurar demonstrativo de resultados', 2, false, 2),
  ('ca7c8d98-4247-49bb-9d44-1ca169fd270b', '1d626443-f4d3-442d-a0fd-16298a7dde91', '4.3', '4.3 Relatórios BI', 'Configurar dashboards e relatórios de business intelligence', 2, false, 3),
  ('4354eb5a-d0a7-4246-ab2c-40cd6c569bc0', '1d626443-f4d3-442d-a0fd-16298a7dde91', '4.4', '4.4 Compras', 'Configurar módulo de compras', 2, false, 4),
  ('745e68c7-83ad-4965-bb76-c306b187cf03', '1d626443-f4d3-442d-a0fd-16298a7dde91', '4.5', '4.5 Integração Correios', 'Integrar sistema com serviços dos correios', 2, false, 5),
  ('6aa404fd-d094-4e7d-94b8-6814ebae6739', '1d626443-f4d3-442d-a0fd-16298a7dde91', '4.6', '4.6 Finalização do Projeto', 'Encerramento formal do projeto de implantação', 0, false, 6),
  ('794380cc-f954-4c64-95e3-0a00f94a3637', 'bf09e763-3d7a-4b6f-9dfe-d46264257dd6', '0.6', '0.6 Cronograma', 'Definição e validação do cronograma de implantação', 0, true, 6)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  estimated_hours = EXCLUDED.estimated_hours,
  is_informational = EXCLUDED.is_informational,
  sort_order = EXCLUDED.sort_order;

-- ------------------------------------------------------------
-- Verificação (rode após o insert)
-- ------------------------------------------------------------
SELECT
  pm.key,
  pm.name  AS plano,
  pp.name  AS fase,
  pp.order_index,
  count(pt.id) AS qtd_tarefas,
  sum(pt.estimated_hours) AS horas_estimadas
FROM public.plan_models pm
JOIN public.plan_phases pp ON pp.plan_model_id = pm.id
LEFT JOIN public.plan_tasks pt ON pt.plan_phase_id = pp.id
GROUP BY pm.key, pm.name, pp.name, pp.order_index
ORDER BY pm.key, pp.order_index;