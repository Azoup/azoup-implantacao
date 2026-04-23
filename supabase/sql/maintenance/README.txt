Manutenção: em geral UPDATE em dados existentes.
Sempre: (1) SELECT de conferência (2) transação com rollback de teste (3) janela de baixo uso.

Demo portal (cliente + projeto + login teste@teste.com): rode H_seed_portal_demo_visual.sql
após criar o usuário em Authentication (veja comentários no topo do arquivo).

Template boas-vindas Azoup nativo: H já grava version azoup; se o projeto já existia com template
antigo, rode I_welcome_template_use_azoup_native.sql (ajuste o WHERE se precisar).
