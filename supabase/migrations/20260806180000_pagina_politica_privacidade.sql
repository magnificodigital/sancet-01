-- Página de Política de Privacidade (LGPD) em "Páginas do site" (slug: politica-de-privacidade).
INSERT INTO public.paginas (slug, titulo, conteudo_html, blocos, ativa, no_menu, meta_title, meta_description)
VALUES (
  'politica-de-privacidade',
  'Política de Privacidade',
  $html$
<p>A <strong>Sancet Medicina Diagnóstica</strong> (CNPJ 50.699.404/0001-93), com sede em Mogi das Cruzes/SP, respeita a sua privacidade e está comprometida com a proteção dos seus dados pessoais, em conformidade com a <strong>Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD)</strong>, o Marco Civil da Internet (Lei nº 12.965/2014) e demais normas aplicáveis.</p>

<h2>1. Quais dados coletamos</h2>
<p>Coletamos dados pessoais fornecidos por você e gerados durante o uso dos nossos serviços e do site, entre eles:</p>
<ul>
  <li><strong>Dados de identificação e contato:</strong> nome, CPF, data de nascimento, e-mail, telefone e endereço.</li>
  <li><strong>Documentos:</strong> documento de identidade, carteirinha de convênio, pedido médico e demais documentos necessários ao atendimento.</li>
  <li><strong>Dados de saúde (sensíveis):</strong> informações clínicas e resultados de exames, tratados com proteção reforçada conforme o art. 11 da LGPD.</li>
  <li><strong>Dados de navegação:</strong> informações técnicas coletadas por cookies para melhorar a sua experiência.</li>
</ul>

<h2>2. Para que usamos os seus dados</h2>
<ul>
  <li>Prestar os serviços de medicina diagnóstica (agendamento, coleta, análise e entrega de resultados).</li>
  <li>Identificar você e viabilizar o atendimento presencial ou domiciliar.</li>
  <li>Comunicar-nos com você sobre pedidos, agendamentos e resultados.</li>
  <li>Cumprir obrigações legais, regulatórias e de guarda de prontuário.</li>
  <li>Aprimorar a segurança e o funcionamento do site.</li>
</ul>

<h2>3. Compartilhamento</h2>
<p>Seus dados podem ser compartilhados com convênios/planos de saúde (quando aplicável), laboratórios de apoio, operadores que nos prestam serviços de tecnologia e autoridades, quando exigido por lei. Exigimos de todos os parceiros o mesmo nível de proteção previsto nesta política.</p>

<h2>4. Cookies</h2>
<p>Utilizamos cookies para melhorar a navegação e o desempenho do site. Você pode gerenciar ou revogar o consentimento a qualquer momento nas configurações do seu navegador.</p>

<h2>5. Segurança</h2>
<p>Adotamos medidas técnicas e administrativas razoáveis e exigidas por lei para proteger a confidencialidade e a integridade dos seus dados, armazenados em servidores próprios ou contratados.</p>

<h2>6. Seus direitos (art. 18 da LGPD)</h2>
<p>Você pode, a qualquer momento, solicitar: confirmação da existência de tratamento; acesso aos dados; correção de dados incompletos ou desatualizados; anonimização, bloqueio ou eliminação; portabilidade; informação sobre compartilhamento; e revogação do consentimento.</p>
<p>Para exercer seus direitos, entre em contato pelo e-mail <strong>matriz@sancet.com.br</strong>.</p>

<h2>7. Retenção e eliminação</h2>
<p>Mantemos os dados pelo tempo necessário às finalidades desta política e ao cumprimento de obrigações legais e regulatórias, aplicando o princípio da necessidade (art. 6 da LGPD):</p>
<ul>
  <li><strong>Resultados de exames e prontuário:</strong> mantidos pelo prazo mínimo exigido pela legislação de saúde (Resolução CFM nº 1.821/2007 — <strong>mínimo de 20 anos</strong>). Nesse período, a guarda é obrigatória e prevalece sobre pedidos de exclusão.</li>
  <li><strong>Documentos de apoio ao atendimento</strong> (documento de identidade, carteirinha, pedido médico e correlatos): mantidos enquanto necessários ao atendimento e eliminados quando deixam de ser necessários, mediante descarte seguro.</li>
</ul>
<p>Você pode solicitar a exclusão dos seus dados a qualquer momento; atenderemos ao pedido, ressalvadas as hipóteses de guarda obrigatória acima. A eliminação é feita de forma segura.</p>

<h2>8. Contato / Encarregado (DPO)</h2>
<p>Dúvidas ou solicitações sobre esta política e sobre seus dados:</p>
<ul>
  <li><strong>E-mail:</strong> matriz@sancet.com.br / sancet@sancet.com.br</li>
  <li><strong>Telefone:</strong> (11) 4727-7177</li>
</ul>

<h2>9. Atualizações</h2>
<p>Esta política pode ser atualizada periodicamente. A versão vigente estará sempre disponível nesta página.</p>
  $html$,
  '[]'::jsonb,
  true, false,
  'Política de Privacidade — Sancet',
  'Como a Sancet Medicina Diagnóstica coleta, usa e protege seus dados pessoais conforme a LGPD.'
)
ON CONFLICT (slug) DO UPDATE
  SET titulo = EXCLUDED.titulo, conteudo_html = EXCLUDED.conteudo_html, blocos = EXCLUDED.blocos,
      ativa = EXCLUDED.ativa, meta_title = EXCLUDED.meta_title, meta_description = EXCLUDED.meta_description,
      atualizado_em = now();
