import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const esPath = path.join(__dirname, "../messages/legal/infoTerms.es.json")
const outPath = path.join(__dirname, "../messages/legal/infoTerms.pt-BR.json")

const es = JSON.parse(fs.readFileSync(esPath, "utf8"))
const pt = structuredClone(es)
const t = pt.infoTerms

t.title = "Termos e condições de uso"
t.subtitle =
  "Ao utilizar o Servido, você aceita as condições que regem o uso da plataforma e a relação entre compradores, vendedores e prestadores de serviços."
t.lastUpdated = "4 de julho de 2026"

const titles = {
  rol: "Papel da Plataforma",
  independencia: "Independência das partes",
  responsabilidad: "Exclusão de responsabilidade",
  evaluaciones: "Avaliações e classificações",
  reembolsos: "Reembolsos e intervenção da plataforma",
  seguros: "Seguros e coberturas",
  reportes: "Relato de incidentes",
  relacion: "Relação entre usuários",
  tarifas: "Tarifas",
  conducta: "Normas de conduta e conteúdo",
  sanciones: "Sanções",
  indemnidad: "Indenização",
  contacto: "Meios oficiais de contato",
  aceptacion: "Aceitação",
}

const blocksBySection = {
  rol: [
    'O Servido (doravante, "a Plataforma") atua exclusivamente como meio de conexão entre pessoas que oferecem serviços ou produtos (doravante, "Prestadores") e pessoas interessadas em contratá-los ou adquiri-los (doravante, "Clientes").',
    "A Plataforma não faz parte do contrato que eventualmente for celebrado entre o Prestador e o Cliente.",
    "Nossa função é oferecer um espaço virtual para promoção, visibilidade e contato, sem intervir na qualidade, condições, execução ou resultado dos serviços contratados.",
  ],
  independencia: [
    "Cada Prestador registrado na plataforma atua em exercício de sua autonomia profissional e comercial, sem que exista entre eles e o Servido qualquer relação trabalhista, societária ou de representação.",
    "O Servido não emprega, dirige nem controla as atividades dos Prestadores, atuando apenas como canal que facilita o vínculo entre estes e os Usuários.",
    "Nesse contexto, cada Prestador é integralmente responsável por cumprir as disposições legais, fiscais e trabalhistas que regem sua atividade, enquanto o Servido reserva-se o direito de verificar se os compromissos assumidos pelos Prestadores na plataforma são efetivamente cumpridos.",
  ],
  responsabilidad: {
    paragraphs: [
      "O Servido não assume qualquer responsabilidade por danos, prejuízos, perdas, negligências, acidentes, conflitos ou descumprimentos decorrentes da relação entre Prestadores e Clientes.",
      "Isso inclui (mas não se limita a):",
    ],
    list: [
      "Má prática ou serviços defeituosos.",
      "Descumprimento de prazos, condições ou preços acordados.",
      "Acidentes no local do serviço.",
      "Danos materiais ou pessoais causados pelo Prestador.",
      "Golpes, furtos ou qualquer fato derivado do vínculo entre usuários nesta plataforma.",
    ],
  },
  evaluaciones: [
    "A plataforma permite que os Clientes avaliem os Prestadores após uma operação.",
    "Esse sistema busca oferecer mais segurança aos demais usuários, mas não implica garantia sobre a qualidade, legalidade ou adequação do serviço oferecido.",
    "É responsabilidade do Cliente avaliar com critério antes de contratar.",
  ],
  reembolsos: [
    "Caso surja uma reclamação fundamentada por parte de um Cliente, e se apresentarem provas suficientes, o Servido poderá intimar o Prestador a oferecer uma solução ou reembolso.",
    "Essa medida é excepcional, fica a critério exclusivo da plataforma e não implica responsabilidade legal direta.",
  ],
  seguros: [
    "A plataforma não oferece seguros nem coberturas para incidentes. Recomenda-se que Prestadores e Clientes tenham seguros próprios ou acordos prévios para respaldar sua atividade em caso de imprevistos.",
  ],
  reportes: [
    "Os usuários podem reportar situações dentro do app.",
    "O Servido poderá analisar internamente os casos reportados, aplicar sanções se cabível e suspender contas com denúncias reiteradas, tendo plena autonomia para adotar as medidas necessárias na plataforma.",
    "Isso não implica obrigação legal de intervir ou resolver conflitos privados.",
  ],
  relacion: [
    "Qualquer vínculo, tratativa ou acordo entre Usuários da plataforma, seja comercial, associativo ou colaborativo, será de responsabilidade exclusiva de quem o celebrar.",
    "O Servido não faz parte dessas relações nem intervém em sua negociação, desenvolvimento ou cumprimento, e portanto não se responsabiliza pelos efeitos ou consequências delas.",
    "A função do Servido limita-se a facilitar o contato inicial entre as partes, no âmbito de uso da plataforma.",
  ],
  tarifas: [
    "Alguns serviços do Servido podem exigir pagamento de tarifa (por exemplo, assinaturas mensais para publicar serviços).",
    "Essas tarifas serão informadas claramente antes de cada contratação.",
    "O Servido reserva-se o direito de atualizá-las com aviso prévio.",
  ],
  conducta: {
    paragraphs: [
      "Os Usuários devem utilizar a Plataforma com respeito, responsabilidade e em conformidade com a legislação vigente. É estritamente proibido:",
      "O descumprimento dessas disposições pode resultar na suspensão temporária ou exclusão permanente da conta do Usuário, sem necessidade de aviso prévio.",
      "Da mesma forma, se um produto recebido pelo Usuário não corresponder ao acordado (por estar danificado, incorreto ou por erro do fornecedor), poderá solicitar reembolso, que será gerenciado pelo Servido sem custo adicional para o Usuário.",
    ],
    list: [
      "Oferecer, publicar ou solicitar produtos ou serviços ilícitos, enganosos, falsificados ou que violem direitos de terceiros.",
      "Criar perfis com identidades falsas, usurpar dados alheios ou fornecer informações incorretas.",
      "Manipular avaliações, resenhas ou sistemas de reputação mediante contas múltiplas ou outras práticas desleais.",
      "Compartilhar conteúdo ofensivo, ameaçador, discriminatório, fraudulento ou que promova violência ou ódio.",
      "Promover, solicitar ou oferecer serviços de natureza sexual, bem como compartilhar material sexual ou erótico, inclusive em imagens.",
      "Publicar imagens de menores de idade, salvo em contextos familiares, educacionais ou institucionais devidamente justificados e autorizados legalmente.",
    ],
  },
  sanciones: [
    "O descumprimento destes termos pode resultar em advertências, suspensão ou exclusão definitiva da conta do usuário, sem aviso prévio nem direito a qualquer tipo de reclamação legal.",
  ],
  indemnidad: [
    "O Usuário compromete-se a manter indene e isentar o Servido, bem como seus diretores, empregados, representantes e colaboradores, de qualquer reclamação, demanda, dano, prejuízo, sanção, multa, despesa (incluindo honorários advocatícios) ou responsabilidade de qualquer tipo, iniciada por terceiros em consequência de sua atividade na Plataforma, do conteúdo que publicar, dos serviços que oferecer ou contratar, ou de qualquer descumprimento destes Termos e Condições ou das leis aplicáveis.",
    "Após a compra, o Servido reterá o dinheiro até que o produto chegue às mãos de quem o solicitou ou, na falta disso, solicitará a devolução do valor correspondente. Por isso, o Servido será responsável por avaliar e garantir que os serviços anunciados sejam concluídos e os produtos solicitados sejam entregues corretamente.",
  ],
  contacto: [
    "A única via oficial de comunicação e contato com o Servido é pelos canais habilitados dentro de nossa plataforma ou os expressamente publicados nela.",
    "O Servido conta com equipe devidamente identificada, com credenciais e perfis oficiais que incluem distintivos verificáveis da plataforma.",
    "Diante de qualquer situação irregular, suspeita ou que gere dúvidas, o Usuário deve comunicar-se exclusivamente com os pontos de contato indicados na Plataforma. Qualquer interação fora desses meios não será considerada oficial, e o Servido não se responsabiliza por danos, prejuízos ou fraudes derivados de comunicações por canais não autorizados.",
  ],
  aceptacion: {
    paragraphs: [
      "O uso da Plataforma implica a aceitação expressa destes Termos e Condições por todos os usuários (Prestadores e Clientes), que declaram ter lido, compreendido e aceito o aqui exposto.",
    ],
    link: {
      before: "Ao se cadastrar no Servido, você confirma que aceita estes termos. Você também pode consultar nossa ",
      linkLabel: "política de privacidade",
      after: ".",
    },
  },
}

function applySimpleParagraphs(sectionId, paragraphs) {
  const blocks = t.sections[sectionId].blocks
  paragraphs.forEach((text, i) => {
    if (blocks[i]?.type === "p") blocks[i].text = text
  })
}

for (const id of t.sectionOrder) {
  t.sections[id].title = titles[id]
  const content = blocksBySection[id]
  if (Array.isArray(content)) {
    applySimpleParagraphs(id, content)
  } else if (content.paragraphs && content.list) {
    const blocks = t.sections[id].blocks
    blocks[0].text = content.paragraphs[0]
    blocks[1].text = content.paragraphs[1]
    blocks[2].items = content.list
  } else if (content.paragraphs && content.list && id === "conducta") {
    // handled below
  } else if (id === "conducta") {
    const blocks = t.sections[id].blocks
    blocks[0].text = content.paragraphs[0]
    blocks[1].items = content.list
    blocks[2].text = content.paragraphs[1]
    blocks[3].text = content.paragraphs[2]
  } else if (id === "aceptacion") {
    t.sections[id].blocks[0].text = content.paragraphs[0]
    const linkBlock = t.sections[id].blocks[1]
    linkBlock.before = content.link.before
    linkBlock.linkLabel = content.link.linkLabel
    linkBlock.after = content.link.after
  }
}

t.cta = {
  title: "Dúvidas?",
  description:
    "Se precisar de mais informações sobre o uso da plataforma, fale conosco pelos canais oficiais ou conheça mais sobre o Servido.",
  primaryLabel: "Quem somos",
  primaryHref: "/acerca-de-nosotros",
  secondaryLabel: "Criar conta",
  secondaryHref: "/signup",
}

fs.writeFileSync(outPath, JSON.stringify(pt, null, 2))
console.log("Wrote", outPath)
