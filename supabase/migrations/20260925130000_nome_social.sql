-- Nome social: guardado à parte do nome civil. O nome civil segue sendo o
-- oficial (documentos/laudos, validado com nome+sobrenome); o nome social é
-- como a pessoa quer ser chamada (pode ser uma palavra só).
alter table pacientes add column if not exists nome_social text;

create or replace function public.meu_perfil_auth()
returns jsonb
language sql stable security definer set search_path = public
as $$
  select to_jsonb(t) from (
    select id, nome, nome_social, cpf, email, celular, sexo,
           cep, logradouro, numero, complemento, bairro, cidade, uf,
           data_nascimento
    from pacientes where auth_user_id = auth.uid() limit 1
  ) t
$$;
grant execute on function public.meu_perfil_auth() to authenticated;
