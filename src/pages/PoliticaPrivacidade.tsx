import { PageShell } from "@/components/layout/PageShell";

// Conteúdo espelhado de https://sancet.com.br/politica-de-privacidade/
const DADOS = [
  "Nome Completo",
  "Nome Social",
  "Nome do Responsável (para menores de 18 anos)",
  "RG do Responsável (para menores de 18 anos)",
  "CPF",
  "RG",
  "Documento Estrangeiro",
  "Carteira de Trabalho",
  "Carteira de Habilitação",
  "Número da Carteirinha do Convênio",
  "Senha de Autorização – Convênio",
  "Data de Nascimento",
  "Assinatura do Cliente",
  "Número de Celular",
  "Número de Telefone Pessoal",
  "E-mail",
  "Endereço Residencial",
  "Endereço Profissional",
  "Registro em Conselho de Classe",
  "Guia de Convênio",
  "Pedido Médico",
  "Informes Clínicos",
];

const PoliticaPrivacidade = () => {
  return (
    <PageShell>
      <section className="container max-w-4xl py-10">
        <h1 className="text-3xl font-bold">Política de Privacidade</h1>
        <p className="mt-1 text-muted-foreground">16.6 – Política de Privacidade</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground/90">
          <h2 className="text-lg font-semibold">I. SOBRE O SANCET MEDICINA DIAGNÓSTICA</h2>
          <p>
            Nós do Sancet Medicina Diagnóstica, inscrito no CNPJ sob o nº 50.699.404/0001-93, com
            sede em Mogi das Cruzes/SP, na Avenida Voluntário Fernando Pinheiro Franco, n° 1020, Jd.
            Betania – CEP: 08710-500, levamos a sério a privacidade e a confidencialidade dos
            registros eletrônicos e dados pessoais deixados por você (“Titular”) na utilização dos
            nossos serviços e no nosso site (“Site”), servindo a presente Política de Privacidade
            (“Política”) para demonstrar quais dados e informações serão obtidos e armazenados.
          </p>
          <p>
            Essa Política foi criada para definir a relação de uso dos dados pessoais e cookies
            coletados no site https://sancet.com.br e aplica-se a todas as informações fornecidas
            pelo Titular em nossas unidades durante o atendimento presencial ou coletadas pelo Site
            durante a navegação.
          </p>
          <p>
            Esclarecemos que esta Política foi elaborada em conformidade com a Lei Geral de Proteção
            de Dados Pessoais (Lei nº 13.709/18), com o Marco Civil da Internet (Lei nº 12.965/14) e
            com o Regulamento da EU nº 2016/6790 e poderá ser atualizada, a qualquer tempo, pelo
            Sancet Medicina Diagnóstica, razão pela qual se convida o Titular a consultar
            periodicamente esta seção.
          </p>

          <h2 className="text-lg font-semibold">II. GLOSSÁRIO</h2>
          <p>
            <strong>Anonimização:</strong> utilização de meios técnicos razoáveis e disponíveis no
            momento do tratamento, por meio dos quais um dado perde a possibilidade de associação,
            direta ou indireta, a um indivíduo;
          </p>
          <p>
            <strong>Controlador:</strong> pessoa natural ou jurídica, de direito público ou privado,
            a que competem as decisões referentes ao tratamento de dados pessoais;
          </p>
          <p>
            <strong>Cliente:</strong> pessoa física que utiliza os serviços ofertados pelo Sancet
            Medicina Diagnóstica;
          </p>
          <p>
            <strong>Confidencialidade:</strong> a confidencialidade tem a ver com a privacidade dos
            dados tratados pelo Sancet Medicina Diagnóstica. Esse conceito se relaciona com as ações
            tomadas para assegurar que informações confidenciais e críticas não estarão disponíveis
            nem serão divulgadas a indivíduos, entidades ou processos sem autorização. Nesse
            sentido, a confidencialidade tem o intuito de assegurar que as informações
            confidenciais não sejam roubadas dos sistemas organizacionais por meio de ciberataques,
            espionagem, entre outras práticas;
          </p>
          <p>
            <strong>Dado Pessoal:</strong> informação relacionada a pessoa natural identificada ou
            identificável, tal como nome, endereço residencial, endereço de e-mail, número de CPF,
            número de RG, título de eleitor, número de telefone(s), profissão, data de nascimento,
            estado civil, nacionalidade, dados de cônjuge/companheiro/dependentes, entre outros;
          </p>
          <p>
            <strong>Dado Pessoal Sensível:</strong> dado pessoal sobre origem racial ou étnica,
            convicção religiosa, opinião política, filiação a sindicato ou a organização de caráter
            religioso, filosófico ou político, dado referente à saúde ou à vida sexual, dado
            genético ou biométrico, quando vinculado a uma pessoa natural;
          </p>
          <p>
            <strong>Encarregado de Proteção de Dados (DPO):</strong> pessoa indicada pela
            Administração do Sancet Medicina Diagnóstica para atuar como canal de comunicação entre
            o controlador, os titulares dos dados e a Autoridade Nacional de Proteção de Dados
            (ANPD);
          </p>
          <p>
            <strong>LGPD:</strong> Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018) que
            traz regras e disposições sobre o tratamento de dados pessoais, inclusive nos meios
            digitais, por pessoa natural ou por pessoa jurídica de direito público ou privado, com o
            objetivo de proteger os direitos fundamentais de liberdade e de privacidade e o livre
            desenvolvimento da personalidade da pessoa natural;
          </p>
          <p>
            <strong>Retenção dos dados pessoais:</strong> período pelo qual os dados pessoais
            permanecem armazenados pelo Sancet Medicina Diagnóstica;
          </p>
          <p>
            <strong>Titular:</strong> pessoa natural a quem se referem os dados pessoais que são
            objeto de tratamento;
          </p>
          <p>
            <strong>Tratamento:</strong> toda operação realizada com dados pessoais, como as que se
            referem a coleta, produção, recepção, classificação, utilização, acesso, reprodução,
            transmissão, distribuição, processamento, arquivamento, armazenamento, eliminação,
            avaliação ou controle da informação, modificação, comunicação, transferência, difusão ou
            extração.
          </p>

          <h2 className="text-lg font-semibold">III. QUAIS DADOS UTILIZAMOS</h2>
          <p>
            O Sancet Medicina Diagnóstica esclarece que utiliza as informações fornecidas por você,
            para o que usamos, como e onde armazenamos e com quem compartilhamos.
          </p>
          <p>
            Também esclarece que coleta dados automaticamente quando da utilização do Site e da
            rede, como, por exemplo, identificação do estabelecimento comercial utilizado, IP com
            data e hora da conexão, com o objetivo de melhorar a experiência de navegação do Titular
            no Site, de acordo com seus hábitos e suas preferências.
          </p>
          <p>
            O Sancet Medicina Diagnóstica assume que os dados recolhidos em suas unidades pela
            prestação de serviço foram cedidos pelo respectivo titular e que a sua inserção foi
            autorizada, sendo os mesmos verdadeiros e exatos.
          </p>
          <p>
            Esses dados são os laudos dos exames que você realiza em nossas unidades de atendimento,
            ou por meio do nosso serviço de atendimento móvel. Os dados gerados, resultados da nossa
            prestação de serviço, são armazenados atrelados aos seus dados pessoais.
          </p>
          <p>Os seguintes dados pessoais coletados serão tratados e armazenados digitalmente.</p>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-xs">
              <thead className="bg-muted">
                <tr>
                  <th className="p-2 text-left align-top">O QUE COLETAMOS?</th>
                  <th className="p-2 text-left align-top">QUANDO COLETAMOS?</th>
                  <th className="p-2 text-left align-top">PARA QUE COLETAMOS?</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t align-top">
                  <td className="p-2">
                    <ul className="list-disc pl-4 space-y-1">
                      {DADOS.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  </td>
                  <td className="p-2">
                    (i) Quando realizamos o seu cadastro como cliente; quando prestamos serviço de
                    informações e prestamos atendimento (para agendamento);
                    <br />
                    (ii) Em casos de sugestões, dúvidas e/ou reclamações;
                    <br />
                    (iii) Em visitas realizadas à nossa instituição.
                  </td>
                  <td className="p-2">
                    (i) Identificar você;
                    <br />
                    (ii) Cumprir as obrigações decorrentes do uso dos nossos serviços;
                    <br />
                    (iii) Ampliar nosso relacionamento, informar sobre novidades, funcionalidades,
                    conteúdos, notícias e demais eventos que consideramos relevantes para você;
                    <br />
                    (iv) Enriquecer sua experiência conosco e promover nossos produtos e serviços;
                    <br />
                    (v) Garantir a portabilidade dos dados cadastrais para outro controlador do
                    mesmo ramo de nossa atuação, caso solicitado por você, cumprindo com obrigação
                    do artigo 18 da Lei Geral de Proteção de Dados.
                  </td>
                </tr>
                <tr className="border-t align-top">
                  <td className="p-2">
                    <ul className="list-disc pl-4 space-y-1">
                      <li>Exames Médicos</li>
                      <li>Número da Matrícula / Retrato</li>
                    </ul>
                  </td>
                  <td className="p-2">
                    (i) Para desenvolvimento de atividades laborais;
                    <br />
                    (ii) Quando precisamos identificar nossos parceiros e prestadores de serviços.
                  </td>
                  <td className="p-2">
                    (i) Identificar e autenticar você nos nossos sistemas internos e dependências;
                    <br />
                    (ii) Cumprir com obrigações legais de manutenção de registros estabelecidas pelo
                    Marco Civil da Internet – Lei n° 12.965/2014.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-lg font-semibold">IV. COMO UTILIZAMOS OS DADOS</h2>
          <p>
            As informações coletadas pelo site do Sancet Medicina Diagnóstica têm como finalidade
            facilitar o contato com o consumidor e/ou possível candidato interessado em trabalhar no
            grupo. Ao emitir seu consentimento, o Titular aceita o tratamento e a utilização das
            informações coletadas no Site. Nesses casos, o tratamento de dados é autorizado pelo
            inciso I do artigo 7º da Lei Geral de Proteção de Dados nº 13.709/2018.
          </p>
          <p>
            As informações coletadas para a prestação do serviço nas unidades do Sancet Medicina
            Diagnóstica, sendo que todos os exames que você realiza e as informações que são
            fornecidas, irão compor o seu histórico de exames. A manutenção do histórico de exames é
            uma obrigação legal e regulatória, em atendimento à Resolução da Diretoria Colegiada n°
            302 de 2005 da Anvisa e artigo 6º da Lei 13.787/2018.
          </p>
          <p>
            Seus dados também serão coletados e armazenados caso você se interesse em trabalhar
            conosco, apenas pelo tempo necessário ao cumprimento do atendimento e/ou seleção de
            vagas.
          </p>

          <h2 className="text-lg font-semibold">V. COMO UTILIZAMOS OS COOKIES</h2>
          <p>
            Cookies são arquivos de texto enviados pela plataforma ao computador do Titular e que
            nele ficam armazenados. Geralmente, um cookie contém o nome do site que o originou, seu
            tempo de vida e um valor, que é gerado aleatoriamente.
          </p>
          <p>
            O Sancet Medicina Diagnóstica utiliza cookies para facilitar o uso e melhor adaptar o
            Site aos seus interesses e necessidades, bem como para compilar informações sobre a
            utilização do seu Site, auxiliando a melhorar suas estruturas e seus conteúdos. Os
            cookies também podem ser utilizados para acelerar suas atividades e experiências futuras
            no Site.
          </p>
          <p>
            O Titular da plataforma manifesta conhecer e aceitar que pode ser utilizado um sistema
            de coleta de dados de navegação mediante à utilização de cookies.
          </p>
          <p>
            A qualquer momento, o Titular poderá revogar seu consentimento quanto aos cookies, pelo
            que deverá apagar os cookies do Site do Sancet Medicina Diagnóstica utilizando as
            configurações do seu navegador de preferência.
          </p>

          <h2 className="text-lg font-semibold">VI. COMO MANTEMOS OS DADOS SEGUROS</h2>
          <p>
            O Sancet Medicina Diagnóstica toma todas as precauções necessárias para garantir a
            segurança e a confidencialidade dos dados pessoais tratados, com o objetivo de evitar
            que tais dados sejam deformados, danificados ou destruídos. Nesse intuito, os dados
            coletados serão armazenados em servidores próprios ou por ela contratados.
          </p>
          <p>
            Ressalta que, ainda que não se possa garantir que todas as informações que trafegam no
            Site não sejam alvo de acessos não autorizados perpetrados por meio de métodos
            desenvolvidos para obter informações de forma indevida, o Sancet Medicina Diagnóstica
            utiliza meios razoáveis de mercado e legalmente requeridos para preservar a privacidade
            dos dados coletados em seu Site.
          </p>

          <h2 className="text-lg font-semibold">VII. SEUS DIREITOS</h2>
          <p>
            O Sancet Medicina Diagnóstica esclarece que os dados pessoais coletados no Site, tanto
            para o Serviço de Atendimento ao Consumidor (SAC) quanto para o Trabalhe Conosco, são os
            dados mínimos necessários para que a empresa possa responder ao contato (nome, e-mail e
            telefone) e ficarão armazenados apenas pelo tempo necessário ao cumprimento do
            atendimento e/ou seleção de vagas.
          </p>
          <p>
            De qualquer modo, o Sancet Medicina Diagnóstica garante ao Titular, tanto para o uso do
            site como para os dados fornecidos em suas unidades, conforme previsto no art. 18, Lei
            nº 13.709/2018, a possibilidade de solicitação, através do e-mail{" "}
            <a className="text-primary underline" href="mailto:matriz@sancet.com.br">
              matriz@sancet.com.br
            </a>
            , de (i) confirmação da existência de tratamento; (ii) acesso aos dados; (iii) correção
            de dados incompletos, inexatos ou desatualizados; (iv) eliminação dos dados tratados com
            consentimento do Titular e (v) revogação do consentimento.
          </p>

          <h2 className="text-lg font-semibold">
            VIII. COMO ENTRAR EM CONTATO COM O SANCET MEDICINA DIAGNÓSTICA
          </h2>
          <p>
            O Titular pode entrar em contato com o Sancet Medicina Diagnóstica através dos e-mails:{" "}
            <a className="text-primary underline" href="mailto:matriz@sancet.com.br">
              matriz@sancet.com.br
            </a>{" "}
            e{" "}
            <a className="text-primary underline" href="mailto:sancet@sancet.com.br">
              sancet@sancet.com.br
            </a>
            .
          </p>
          <p>
            Esclarecemos que a solicitação só será acolhida se tratar de assuntos relacionados a: (i)
            dúvidas sobre esta Política; (ii) reclamação sobre possível violação das leis de proteção
            de dados e (iii) solicitações relacionadas aos seus direitos do Titular (item VI).
          </p>
          <p>
            O Sancet Medicina Diagnóstica compromete-se a utilizar de seus melhores esforços para
            atender, no menor tempo possível, a solicitação de seu Titular, desde que respeitado o
            previsto em lei.
          </p>

          <h2 className="text-lg font-semibold">IX. LEGISLAÇÃO E FORO</h2>
          <p>
            Esta Política será regida, interpretada e executada de acordo com as Leis da República
            Federativa do Brasil, especialmente a Lei nº 13.709/2018, a Lei nº 12.965/14 e o
            Regulamento da EU nº 2016/6790, independentemente das Leis de outros Estados ou Países,
            sendo competente o foro de domicílio do Titular para dirimir qualquer dúvida decorrente
            deste documento.
          </p>

          <div className="rounded-md border bg-muted/40 p-4">
            <p className="font-semibold">Central de Atendimento</p>
            <p>
              <a className="text-primary underline" href="mailto:sancet@sancet.com.br">
                sancet@sancet.com.br
              </a>
            </p>
            <p className="font-semibold">11 4727.7177</p>
          </div>
        </div>
      </section>
    </PageShell>
  );
};

export default PoliticaPrivacidade;
