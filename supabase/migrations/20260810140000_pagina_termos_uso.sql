-- Página de Termos de Uso (slug: termos-de-uso). Preenche o conteúdo (antes era stub).
INSERT INTO public.paginas (slug, titulo, conteudo_html, blocos, ativa, no_menu, meta_title, meta_description)
VALUES (
  'termos-de-uso',
  'Termos de Uso',
  $html$
<p>Bem-vindo ao site da <strong>Sancet Medicina Diagnóstica</strong> (CNPJ 50.699.404/0001-93), com sede em Mogi das Cruzes/SP. Estes Termos de Uso regulam o acesso e a utilização do nosso site, do agendamento on-line, da solicitação de exames e dos demais serviços aqui disponibilizados. Ao utilizar o site, você declara ter lido, compreendido e aceitado estas condições.</p>

<h2>1. Aceitação dos termos</h2>
<p>O uso do site implica a aceitação integral destes Termos de Uso e da nossa <strong>Política de Privacidade</strong>. Caso não concorde com qualquer condição, por favor não utilize o site nem os serviços.</p>

<h2>2. Objeto e serviços</h2>
<p>A Sancet oferece serviços de medicina diagnóstica e disponibiliza no site funcionalidades como:</p>
<ul>
  <li>Consulta ao catálogo de exames e informações de preparo;</li>
  <li>Agendamento on-line de coleta (na unidade ou domiciliar, quando disponível);</li>
  <li>Solicitação de exames particulares ou por convênio;</li>
  <li>Envio de documentos necessários ao atendimento;</li>
  <li>Acesso a resultados de exames.</li>
</ul>

<h2>3. Cadastro e conta de acesso</h2>
<ul>
  <li>Para utilizar determinados serviços é necessário informar dados como CPF, data de nascimento e contato.</li>
  <li>Você é responsável pela <strong>veracidade e atualização</strong> das informações fornecidas.</li>
  <li>As credenciais de acesso são pessoais e intransferíveis; mantenha-as em sigilo. Você responde pelas ações realizadas na sua conta.</li>
  <li>O cadastro é destinado a maiores de 18 anos ou a responsáveis legais que atuem em nome do paciente.</li>
</ul>

<h2>4. Agendamento, coleta e documentos</h2>
<ul>
  <li>Os horários disponíveis seguem o funcionamento da unidade escolhida e podem sofrer alterações.</li>
  <li>Alguns exames exigem preparo prévio (jejum, coleta específica etc.); é responsabilidade do paciente seguir as orientações informadas.</li>
  <li>Documentos enviados (documento de identidade, carteirinha de convênio, pedido médico e correlatos) devem ser legíveis e verdadeiros. A recusa ou o envio de documentos inválidos pode inviabilizar o atendimento.</li>
</ul>

<h2>5. Preços, pagamento e convênios</h2>
<ul>
  <li>Os preços de exames particulares são exibidos no site e podem ser atualizados a qualquer momento.</li>
  <li>Em atendimentos por convênio, a cobertura, a autorização e as regras seguem o contrato do paciente com o seu plano de saúde.</li>
  <li>A confirmação do atendimento pode estar condicionada à confirmação do pagamento ou da elegibilidade no convênio.</li>
</ul>

<h2>6. Cancelamento e reagendamento</h2>
<p>Você pode cancelar ou reagendar um atendimento pelos canais disponibilizados no site, respeitando os prazos e as regras de antecedência informados no momento do agendamento.</p>

<h2>7. Resultados de exames</h2>
<ul>
  <li>Os resultados são disponibilizados após a conclusão da análise, de forma segura e sigilosa, ao paciente ou ao seu responsável legal.</li>
  <li>Os resultados têm finalidade diagnóstica e <strong>não substituem a avaliação e a orientação de um médico</strong>. Procure sempre o profissional responsável para interpretação e conduta.</li>
</ul>

<h2>8. Responsabilidades e limitações</h2>
<ul>
  <li>Empregamos esforços razoáveis para manter o site disponível, seguro e atualizado, mas não garantimos funcionamento ininterrupto ou livre de erros.</li>
  <li>Não nos responsabilizamos por falhas decorrentes de indisponibilidade de terceiros (provedores, meios de pagamento, telecomunicações) ou de uso indevido do site pelo usuário.</li>
  <li>As informações de preparo e de saúde no site têm caráter informativo e não substituem orientação médica.</li>
</ul>

<h2>9. Uso adequado do site</h2>
<p>É vedado utilizar o site para fins ilícitos, inserir dados falsos, tentar acessar áreas restritas, comprometer a segurança do sistema ou violar direitos de terceiros. O descumprimento pode resultar em suspensão do acesso e nas medidas legais cabíveis.</p>

<h2>10. Propriedade intelectual</h2>
<p>A marca, o logotipo, os textos, o layout e os demais conteúdos do site pertencem à Sancet ou a seus licenciadores e são protegidos por lei. É proibida a reprodução sem autorização prévia e por escrito.</p>

<h2>11. Proteção de dados (LGPD)</h2>
<p>O tratamento dos seus dados pessoais observa a <strong>Lei nº 13.709/2018 (LGPD)</strong> e está detalhado na nossa <strong>Política de Privacidade</strong>, que integra estes Termos. Recomendamos a leitura para entender como coletamos, usamos e protegemos os seus dados, incluindo os dados sensíveis de saúde.</p>

<h2>12. Alterações destes termos</h2>
<p>Estes Termos de Uso podem ser atualizados a qualquer momento. A versão vigente estará sempre disponível nesta página, com a data de atualização.</p>

<h2>13. Legislação e foro</h2>
<p>Estes Termos são regidos pela legislação brasileira. Fica eleito o foro da comarca de Mogi das Cruzes/SP para dirimir eventuais controvérsias, ressalvadas as competências legais aplicáveis à relação de consumo.</p>

<h2>14. Contato</h2>
<ul>
  <li><strong>E-mail:</strong> matriz@sancet.com.br / sancet@sancet.com.br</li>
  <li><strong>Telefone:</strong> (11) 4727-7177</li>
</ul>
  $html$,
  '[]'::jsonb,
  true, false,
  'Termos de Uso — Sancet',
  'Condições de uso do site, do agendamento on-line e dos serviços da Sancet Medicina Diagnóstica.'
)
ON CONFLICT (slug) DO UPDATE
  SET titulo = EXCLUDED.titulo, conteudo_html = EXCLUDED.conteudo_html, blocos = EXCLUDED.blocos,
      ativa = EXCLUDED.ativa, meta_title = EXCLUDED.meta_title, meta_description = EXCLUDED.meta_description,
      atualizado_em = now();
