-- VynTask — garante admin para VINICIUS e ANDERSON
-- E-mails confirmados:
-- Anderson Telis Junior: telis.junior2@gmail.com
-- vinicius.azoup: vinicius.azoup@gmail.com

update public.profiles
set role = 'admin',
    status = 'active'
where lower(email) in (
  'telis.junior2@gmail.com',
  'vinicius.azoup@gmail.com'
);
