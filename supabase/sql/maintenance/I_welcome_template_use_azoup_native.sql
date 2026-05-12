-- Opcional: aponta um template existente para o formulário nativo "Jornada Azoup" (campos vêm do código do app).
-- Use quando você já tinha template antigo (3 campos) e quer o formulário longo no portal sem recriar o projeto.
--
-- Ajuste o WHERE para o seu projeto (ex.: por nome do projeto ou id do template).

update public.welcome_form_templates w
set form_schema = jsonb_build_object(
  'version', 'azoup',
  'externalGoogleFormUrl',
  'https://docs.google.com/forms/d/e/1FAIpQLSdSy1e16-PLYcM1VEGTnBSmwc6zn1H1A_37mt6R_LGYIfnt_g/viewform?usp=dialog',
  'fields', '[]'::jsonb
),
    name = coalesce(nullif(trim(w.name), ''), 'Jornada do cliente Azoup (Implantação Azoup)')
from public.projects p
where w.project_id = p.id
  and p.project_name = 'AREA CLIENTE TESTE'
  and w.is_active = true;
