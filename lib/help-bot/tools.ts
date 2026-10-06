import { tool, stepCountIs } from "ai"
import { z } from "zod"
import type { Query } from "firebase-admin/firestore"
import { db as adminDb } from "@/lib/firebase-admin"
import type { BotAudience } from "@/lib/help-bot/role-context"

export { stepCountIs }

async function safeCount(collectionName: string, field?: string, value?: string | boolean): Promise<number | null> {
  try {
    let query: Query = adminDb.collection(collectionName)
    if (field && value !== undefined) {
      query = query.where(field, "==", value)
    }
    const snap = await query.count().get()
    return snap.data().count ?? 0
  } catch (error) {
    console.warn(`[help-bot] count failed for ${collectionName}`, error)
    return null
  }
}

export function createHelpBotTools(locale?: string, audience: BotAudience = "guest") {
  const isPt = locale === "pt-BR"
  const t = (es: string, pt: string) => (isPt ? pt : es)
  const isStoreSeller = audience === "seller_store"
  const isRestaurant = audience === "seller_restaurant"
  const isCadete = audience === "cadete"

  return {
    get_platform_stats: tool({
      description:
        "Estadísticas públicas del marketplace: productos, servicios, usuarios, vendedores, cadetes, restaurantes y categorías.",
      inputSchema: z.object({
        reason: z.string().optional(),
      }),
      execute: async () => {
        const [products, services, users, sellers, cadetes, restaurants, categories] = await Promise.all([
          safeCount("products"),
          safeCount("products", "isService", true),
          safeCount("users"),
          safeCount("users", "role", "seller"),
          safeCount("users", "role", "cadete"),
          safeCount("restaurants"),
          safeCount("categories"),
        ])
        return {
          ok: true,
          asOf: new Date().toISOString(),
          products,
          services,
          users,
          sellers,
          cadetes,
          restaurants,
          categories,
          note: t(
            "Números aproximados del marketplace (pueden variar).",
            "Números aproximados do marketplace (podem variar)."
          ),
        }
      },
    }),

    get_quick_actions: tool({
      description:
        "Accesos rápidos y pasos para publicar, tienda, cadete, comida, autos, propiedades, servicios, mensajes, favoritos, lives o historias.",
      inputSchema: z.object({
        intent: z.enum([
          "publish",
          "store",
          "cadete",
          "food",
          "buy",
          "vehicles",
          "properties",
          "services",
          "messages",
          "favorites",
          "lives",
          "stories",
          "restaurant",
          "general",
        ]),
      }),
      execute: async ({ intent }) => {
        const catalog: Record<string, { title: string; href: string; steps: string[] }> = {
          publish: {
            title: t("Publicar un producto", "Publicar um produto"),
            href: "/dashboard/buyer?tab=publishProduct",
            steps: t(
              "Entrá a tu cuenta|Tocá Publicar un producto|Completá nombre, precio y foto|Publicá",
              "Entrá na conta|Tocá Publicar um produto|Completá nome, preço e foto|Publicá"
            ).split("|"),
          },
          store: {
            title: t("Crear mi tienda", "Criar minha loja"),
            href: "/dashboard/buyer?tab=openStore",
            steps: t(
              "Entrá a tu cuenta|Crear mi tienda|Elegí Productos o Comida|Completá los datos",
              "Entrá na conta|Criar minha loja|Escolhé Produtos ou Comida|Completá os dados"
            ).split("|"),
          },
          cadete: {
            title: t("Ser cadete / repartidor", "Ser entregador"),
            href: "/signup/cadete",
            steps: t(
              "Abrí el registro de cadete|Completá zona y vehículo|Enviá la postulación|Esperá la aprobación",
              "Abrí o cadastro de entregador|Completá zona e veículo|Enviá a candidatura|Aguarde aprovação"
            ).split("|"),
          },
          food: {
            title: t("Pedir comida", "Pedir comida"),
            href: "/restaurantes",
            steps: t(
              "Abrí Restaurantes|Elegí un local|Armá el pedido|Confirmá el pago",
              "Abrí Restaurantes|Escolhé um local|Armá o pedido|Confirmá o pagamento"
            ).split("|"),
          },
          buy: {
            title: t("Explorar productos", "Explorar produtos"),
            href: "/products",
            steps: t(
              "Abrí el catálogo|Filtrá por categoría|Abrí un producto|Comprá o chateá",
              "Abrí o catálogo|Filtrá por categoria|Abrí um produto|Comprá ou converse"
            ).split("|"),
          },
          vehicles: {
            title: t("Ver vehículos", "Ver veículos"),
            href: "/autos",
            steps: t(
              "Abrí Vehículos|Filtrá marca/modelo|Abrí un aviso|Consultá por chat",
              "Abrí Veículos|Filtrá marca/modelo|Abrí um anúncio|Consulte no chat"
            ).split("|"),
          },
          properties: {
            title: t("Ver propiedades", "Ver imóveis"),
            href: "/propiedades",
            steps: t(
              "Abrí Propiedades|Elegí venta o alquiler|Filtrá por zona|Consultá al publicante",
              "Abrí Imóveis|Escolhé venda ou aluguel|Filtrá por região|Fale com o anunciante"
            ).split("|"),
          },
          services: {
            title: t("Contratar servicios", "Contratar serviços"),
            href: "/services",
            steps: t(
              "Abrí Servicios|Buscá el rubro|Escribile al profesional|Agendá si aplica",
              "Abrí Serviços|Busque o ramo|Fale com o profissional|Agende se precisar"
            ).split("|"),
          },
          messages: {
            title: t("Ir a mensajes", "Ir para mensagens"),
            href: "/mensajes",
            steps: t(
              "Abrí Mensajes|Elegí una conversación|Respondé rápido y claro",
              "Abrí Mensagens|Escolha uma conversa|Responda rápido e claro"
            ).split("|"),
          },
          favorites: {
            title: t("Ver favoritos", "Ver favoritos"),
            href: "/favorites",
            steps: t(
              "Abrí Favoritos|Revisá lo guardado|Comprá o consultá",
              "Abrí Favoritos|Revise o salvo|Compre ou consulte"
            ).split("|"),
          },
          lives: {
            title: t("Ver lives", "Ver lives"),
            href: "/lives",
            steps: t(
              "Abrí Lives|Entrá a uno en vivo|Comprá o reaccioná",
              "Abrí Lives|Entre em um ao vivo|Compre ou reaja"
            ).split("|"),
          },
          stories: {
            title: t("Ver historias", "Ver histórias"),
            href: "/historias",
            steps: t(
              "Abrí Historias|Mirá las de hoy|Tocá para ver detalle",
              "Abrí Histórias|Veja as de hoje|Toque para ver detalhes"
            ).split("|"),
          },
          restaurant: {
            title: t("Registrar restaurante", "Cadastrar restaurante"),
            href: "/signup/restaurante",
            steps: t(
              "Abrí registro de restaurante|Completá datos del local|Configurá menú y delivery",
              "Abrí cadastro de restaurante|Complete dados do local|Configure cardápio e delivery"
            ).split("|"),
          },
          general: {
            title: t("Panel de tu cuenta", "Painel da conta"),
            href: "/dashboard/buyer",
            steps: t(
              "Entrá a tu cuenta|Mirá compras y opciones para crecer",
              "Entrá na conta|Veja compras e opções para crescer"
            ).split("|"),
          },
        }
        return { ok: true, intent, action: catalog[intent] }
      },
    }),

    suggest_business_ideas: tool({
      description: "Ideas de negocio/publicaciones por rubro: ropa, comida, servicios, electrónica, hogar, belleza, autos, propiedades.",
      inputSchema: z.object({
        niche: z.string(),
      }),
      execute: async ({ niche }) => {
        const key = niche.toLowerCase()
        const packs: Record<string, { ideas: string[]; tip: string }> = {
          ropa: {
            ideas: [
              t("Looks de temporada con fotos en maniquí", "Looks de temporada com fotos em manequim"),
              t("Combos remera + accesorio", "Combos camiseta + acessório"),
              t("Outlet de marcas locales", "Outlet de marcas locais"),
              t("Ropa kids con talles claros", "Roupa infantil com tamanhos claros"),
            ],
            tip: t("Usá 4–6 fotos claras y precio bien visible.", "Use 4–6 fotos claras e preço em destaque."),
          },
          comida: {
            ideas: [
              t("Menú del día con delivery rápido", "Menu do dia com entrega rápida"),
              t("Combos familiares de fin de semana", "Combos família no fim de semana"),
              t("Dulces artesanales por pedido", "Doces artesanais por encomenda"),
              t("Café + medialunas para oficina", "Café + pães para escritório"),
            ],
            tip: t(
              "Clasificá el negocio como Comida y completá el tipo.",
              "Classifique o negócio como Comida e complete o tipo."
            ),
          },
          servicios: {
            ideas: [
              t("Reparaciones a domicilio con agenda", "Reparos em casa com agenda"),
              t("Clases particulares online", "Aulas particulares online"),
              t("Limpieza profunda por ambientes", "Limpeza profunda por ambiente"),
              t("Paseo de mascotas por zona", "Passeio de pets por região"),
            ],
            tip: t("Publicá como servicio y aclará zona de cobertura.", "Publique como serviço e explique a zona."),
          },
          electronica: {
            ideas: [
              t("Accesorios para celular con garantía", "Acessórios para celular com garantia"),
              t("Notebooks usados revisados", "Notebooks seminovos revisados"),
              t("Kits gamer de entrada", "Kits gamer entrada"),
              t("Auriculares + funda en combo", "Fone + capa em combo"),
            ],
            tip: t("Detallá estado, garantía y qué incluye.", "Detalhe estado, garantia e o que inclui."),
          },
          hogar: {
            ideas: [
              t("Decoración low cost con kits", "Decoração low cost em kits"),
              t("Organizadores para monoambientes", "Organizadores para kitnets"),
              t("Plantas + macetas listas", "Plantas + vasos prontos"),
            ],
            tip: t("Mostrá medidas y materiales en la ficha.", "Mostre medidas e materiais na ficha."),
          },
          belleza: {
            ideas: [
              t("Maquillaje social a domicilio", "Maquiagem social a domicílio"),
              t("Kits skincare básicos", "Kits skincare básicos"),
              t("Uñas gel por turno", "Unhas em gel por horário"),
            ],
            tip: t("Pedí portfolio y zona de atención.", "Peça portfólio e zona de atendimento."),
          },
          autos: {
            ideas: [
              t("Publicar auto con fotos 360/laterales", "Publicar carro com fotos laterais"),
              t("Moto 0km o usada con historial", "Moto 0km ou usada com histórico"),
              t("Accesorios auto: fundas, cargadores", "Acessórios auto: capas, carregadores"),
            ],
            tip: t("Usá la sección Vehículos con marca, modelo y año.", "Use a seção Veículos com marca, modelo e ano."),
          },
          propiedades: {
            ideas: [
              t("Depto 2 ambientes con video tour", "Apto 2 quartos com vídeo tour"),
              t("Alquiler temporario con amenities", "Aluguel temporada com amenities"),
              t("Local comercial en zona céntrica", "Ponto comercial na região central"),
            ],
            tip: t("Completá m2, ambientes y zona exacta.", "Complete m2, cômodos e região exata."),
          },
        }

        const match =
          Object.entries(packs).find(([k]) => key.includes(k) || k.includes(key.split(" ")[0] || ""))?.[1] ||
          packs.ropa

        return {
          ok: true,
          niche,
          ideas: match.ideas,
          tip: match.tip,
          publishHref: "/dashboard/buyer?tab=publishProduct",
          storeHref: "/dashboard/buyer?tab=openStore",
        }
      },
    }),

    draft_product_listing: tool({
      description: "Borrador de publicación: título, descripción, precio tip y pasos para publicar.",
      inputSchema: z.object({
        productName: z.string(),
        categoryHint: z.string().optional(),
        condition: z.enum(["nuevo", "usado", "servicio"]).optional(),
        targetPrice: z.number().optional(),
      }),
      execute: async ({ productName, categoryHint, condition = "nuevo", targetPrice }) => {
        const name = productName.trim()
        const title = name.length > 4 ? name : t(`Producto ${name}`, `Produto ${name}`)
        const priceLine =
          typeof targetPrice === "number" && targetPrice > 0
            ? t(`Precio sugerido: $${Math.round(targetPrice)}`, `Preço sugerido: $${Math.round(targetPrice)}`)
            : t(
                "Definí un precio competitivo mirando productos parecidos.",
                "Defina um preço competitivo olhando produtos parecidos."
              )

        const description = t(
          `${title}\n\nEstado: ${condition}\n${categoryHint ? `Categoría: ${categoryHint}\n` : ""}\nIncluye: describí qué acompaña.\nIdeal para: contá para quién es.\nEnvío: aclará zona o costo.\n\nPor qué comprarlo: calidad y atención por Servido.`,
          `${title}\n\nEstado: ${condition}\n${categoryHint ? `Categoria: ${categoryHint}\n` : ""}\nInclui: descreva o que acompanha.\nIdeal para: explique para quem é.\nEntrega: informe região ou custo.\n\nPor que comprar: qualidade e atendimento pela Servido.`
        )

        return {
          ok: true,
          draft: { title, description, condition, categoryHint: categoryHint || null, priceTip: priceLine },
          publishHref: "/dashboard/buyer?tab=publishProduct",
          nextSteps: t(
            "Abrí Publicar un producto|Pegá título y descripción|Subí buenas fotos|Confirmá precio y publicá",
            "Abrí Publicar um produto|Cole título e descrição|Suba boas fotos|Confirme preço e publique"
          ).split("|"),
        }
      },
    }),

    optimize_listing_title: tool({
      description: "Optimiza títulos de avisos para que vendan más (claros, con atributos clave).",
      inputSchema: z.object({
        rawTitle: z.string(),
        categoryHint: z.string().optional(),
      }),
      execute: async ({ rawTitle, categoryHint }) => {
        const base = rawTitle.trim().replace(/\s+/g, " ")
        const cat = categoryHint ? ` · ${categoryHint}` : ""
        const options = [
          base,
          t(`${base} | Envío disponible${cat}`, `${base} | Entrega disponível${cat}`),
          t(`${base} — Buen estado, listo para usar`, `${base} — Bom estado, pronto para usar`),
          t(`${base} | Consultá stock hoy`, `${base} | Consulte estoque hoje`),
        ]
        return {
          ok: true,
          options: options.slice(0, 4),
          tip: t(
            "El mejor título dice qué es + estado/beneficio en menos de 70 caracteres.",
            "O melhor título diz o que é + estado/benefício em menos de 70 caracteres."
          ),
          publishHref: "/dashboard/buyer?tab=publishProduct",
        }
      },
    }),

    suggest_pricing: tool({
      description: "Sugiere estrategia de precio (ancla, combo, promo) para un producto o servicio.",
      inputSchema: z.object({
        item: z.string(),
        costHint: z.number().optional(),
        style: z.enum(["competitivo", "premium", "promo"]).optional(),
      }),
      execute: async ({ item, costHint, style = "competitivo" }) => {
        const cost = typeof costHint === "number" && costHint > 0 ? costHint : null
        const multipliers = { competitivo: 1.35, premium: 1.8, promo: 1.15 } as const
        const suggested = cost ? Math.round(cost * multipliers[style]) : null
        return {
          ok: true,
          item,
          style,
          suggestedPrice: suggested,
          tactics: [
            t("Mostrá el precio grande y el envío aparte si aplica.", "Mostre o preço grande e frete à parte se precisar."),
            t("Ofrecé un combo con 2 ítems a mejor precio.", "Ofereça um combo com 2 itens por melhor preço."),
            t("Si es usado, bajá 15–25% vs nuevo comparable.", "Se for usado, baixe 15–25% vs novo comparável."),
            t("Probá una promo 48 hs para validar demanda.", "Teste uma promo de 48h para validar demanda."),
          ],
          tip: t(
            "Si no sabés el costo, mirá 3 avisos similares y ubicáte en el medio.",
            "Se não souber o custo, veja 3 anúncios parecidos e fique no meio."
          ),
        }
      },
    }),

    draft_restaurant_menu: tool({
      description: "Arma un menú inicial sugerido para un restaurante/comida en Servido.",
      inputSchema: z.object({
        cuisine: z.string().describe("Tipo de comida, ej: pizza, café, sushi, parrilla"),
      }),
      execute: async ({ cuisine }) => {
        const c = cuisine.toLowerCase()
        const menus: Record<string, string[]> = {
          pizza: ["Muzzarella", "Napolitana", "Fugazzeta", t("Combo 2 pizzas + gaseosa", "Combo 2 pizzas + refrigerante")],
          cafe: [
            t("Café con medialunas", "Café com pães"),
            t("Capuccino + tostado", "Cappuccino + misto"),
            t("Jugo natural", "Suco natural"),
            t("Brownie casero", "Brownie caseiro"),
          ],
          sushi: ["12 piezas salmón", "Combo hot rolls", "Edamame", t("Combo para 2", "Combo para 2")],
          parrilla: [
            t("Bife de chorizo", "Bife"),
            t("Asado para 2", "Churrasco para 2"),
            t("Ensalada criolla", "Salada crioula"),
            t("Papas fritas", "Batata frita"),
          ],
        }
        const items =
          Object.entries(menus).find(([k]) => c.includes(k))?.[1] ||
          [
            t("Plato estrella del local", "Prato estrela do local"),
            t("Combo del día", "Combo do dia"),
            t("Guarnición / extra", "Acompanhamento / extra"),
            t("Bebida", "Bebida"),
          ]

        return {
          ok: true,
          cuisine,
          items,
          tip: t(
            "Subí foto real de cada plato y precio claro. Registrá el local como Comida.",
            "Suba foto real de cada prato e preço claro. Cadastre o local como Comida."
          ),
          href: "/signup/restaurante",
          storeHref: "/dashboard/buyer?tab=openStore",
        }
      },
    }),

    write_chat_reply: tool({
      description: "Escribe respuestas listas para pegar en el chat (vendedor o comprador).",
      inputSchema: z.object({
        situation: z
          .enum(["precio", "stock", "envio", "reserva", "reclamo_suave", "saludo"])
          .describe("Situación del chat"),
        role: z.enum(["seller", "buyer"]).optional(),
        productName: z.string().optional(),
      }),
      execute: async ({ situation, role = "seller", productName }) => {
        const item = productName?.trim() || t("el producto", "o produto")
        const replies: Record<string, { seller: string; buyer: string }> = {
          saludo: {
            seller: t(
              `¡Hola! Gracias por escribir. ¿Sobre ${item} te interesa precio, stock o envío?`,
              `Olá! Obrigado por escrever. Sobre ${item}, quer preço, estoque ou entrega?`
            ),
            buyer: t(
              `¡Hola! Me interesa ${item}. ¿Sigue disponible y hacés envíos a mi zona?`,
              `Olá! Tenho interesse em ${item}. Ainda está disponível e entrega na minha região?`
            ),
          },
          precio: {
            seller: t(
              `El precio de ${item} es el publicado. Si llevás 2 o más te puedo hacer un precio especial.`,
              `O preço de ${item} é o publicado. Se levar 2 ou mais posso fazer um preço especial.`
            ),
            buyer: t(
              `¿El precio de ${item} es el final o hay envío aparte? ¿Hay descuento por efectivo/transferencia?`,
              `O preço de ${item} é final ou tem frete à parte? Tem desconto no Pix/transferência?`
            ),
          },
          stock: {
            seller: t(
              `Sí, ${item} está disponible. Puedo reservártelo unas horas si confirmás hoy.`,
              `Sim, ${item} está disponível. Posso reservar por algumas horas se confirmar hoje.`
            ),
            buyer: t(
              `¿Tenés stock de ${item} para entrega esta semana?`,
              `Tem estoque de ${item} para entrega esta semana?`
            ),
          },
          envio: {
            seller: t(
              `Hago envíos en la zona. Decime tu barrio y te paso costo y demora estimada.`,
              `Faço entregas na região. Me diga o bairro que passo custo e prazo.`
            ),
            buyer: t(
              `¿Hacés envío a mi zona y cuánto demora aproximadamente?`,
              `Você entrega na minha região e quanto demora aproximadamente?`
            ),
          },
          reserva: {
            seller: t(
              `Perfecto, te lo reservo. Confirmame forma de pago y horario de entrega/retiro.`,
              `Perfeito, vou reservar. Confirme forma de pagamento e horário de entrega/retirada.`
            ),
            buyer: t(
              `Quiero reservarlo. ¿Qué necesitás de mi parte para confirmar?`,
              `Quero reservar. O que você precisa de mim para confirmar?`
            ),
          },
          reclamo_suave: {
            seller: t(
              `Lamento el inconveniente. Contame qué pasó y lo resolvemos hoy mismo.`,
              `Lamento o inconveniente. Me conte o que aconteceu que resolvemos hoje.`
            ),
            buyer: t(
              `Hubo un problema con el pedido. ¿Me ayudás a resolverlo, por favor?`,
              `Houve um problema com o pedido. Pode me ajudar a resolver, por favor?`
            ),
          },
        }
        const pack = replies[situation]
        return {
          ok: true,
          situation,
          role,
          reply: role === "buyer" ? pack.buyer : pack.seller,
          href: "/mensajes",
        }
      },
    }),

    write_promo_copy: tool({
      description: "Crea textos cortos para historias, lives o publicaciones promocionales.",
      inputSchema: z.object({
        productName: z.string(),
        tone: z.enum(["urgente", "amigable", "premium"]).optional(),
        channel: z.enum(["story", "live", "post"]).optional(),
      }),
      execute: async ({ productName, tone = "amigable", channel = "story" }) => {
        const name = productName.trim()
        const linesByTone: Record<"urgente" | "amigable" | "premium", string[]> = {
          urgente: isPt
            ? [`⚡ Últimas unidades de ${name}`, "Hoje com entrega prioritária", "Consulte antes que acabe"]
            : [`⚡ Últimas unidades de ${name}`, "Hoy con envío prioritario", "Consultá antes de que se agote"],
          amigable: isPt
            ? [`Hoje te mostro ${name} ✨`, "Fotos reais e bom atendimento", "Me chama que te ajudo"]
            : [`Hoy te muestro ${name} ✨`, "Fotos reales y buena atención", "Escribime y te asesoro"],
          premium: isPt
            ? [`${name}: qualidade que se nota`, "Detalhes cuidados, entrega confiável", "Reserve o seu no Servido"]
            : [`${name}: calidad que se nota`, "Detalles cuidados, entrega confiable", "Reservá el tuyo en Servido"],
        }

        return {
          ok: true,
          channel,
          tone,
          lines: linesByTone[tone],
          hashtags: ["#Servido", "#Marketplace", channel === "live" ? "#LiveServido" : "#Historias"],
          href: channel === "live" ? "/lives" : "/historias",
        }
      },
    }),

    get_trending_niches: tool({
      description: "Devuelve rubros/tendencias recomendadas para vender o explorar ahora en Servido.",
      inputSchema: z.object({
        focus: z.enum(["vender", "comprar", "comida"]).optional(),
      }),
      execute: async ({ focus }) => {
        const defaultFocus =
          focus || (isRestaurant ? "comida" : isStoreSeller || audience === "buyer" ? "vender" : "comprar")
        const storeVender = [
          { name: t("Accesorios de celular", "Acessórios de celular"), href: "/dashboard/buyer?tab=publishProduct" },
          { name: t("Servicios a domicilio", "Serviços a domicílio"), href: "/dashboard/buyer?tab=publishProduct" },
          { name: t("Indumentaria y calzado", "Roupa e calçados"), href: "/dashboard/buyer?tab=publishProduct" },
          { name: t("Hogar y deco", "Casa e decoração"), href: "/dashboard/buyer?tab=publishProduct" },
          { name: t("Vehículos y motos", "Veículos e motos"), href: "/autos" },
        ]
        const sets = {
          vender: isStoreSeller
            ? storeVender
            : [
                ...storeVender.slice(0, 2),
                { name: t("Comida para delivery", "Comida para delivery"), href: "/dashboard/buyer?tab=openStore" },
                ...storeVender.slice(2),
              ],
          comprar: [
            { name: t("Ofertas en productos", "Ofertas em produtos"), href: "/products" },
            { name: t("Servicios locales", "Serviços locais"), href: "/services" },
            { name: t("Comida cerca", "Comida perto"), href: "/restaurantes" },
            { name: t("Autos", "Carros"), href: "/autos" },
            { name: t("Propiedades", "Imóveis"), href: "/propiedades" },
          ],
          comida: [
            { name: t("Pizzerías", "Pizzarias"), href: "/restaurantes" },
            { name: t("Cafés", "Cafés"), href: "/restaurantes" },
            { name: t("Comida rápida", "Comida rápida"), href: "/restaurantes" },
            { name: t("Registrar mi local", "Cadastrar meu local"), href: "/signup/restaurante" },
          ],
        }
        return {
          ok: true,
          focus: defaultFocus,
          niches: sets[defaultFocus],
          tip: t(
            isStoreSeller
              ? "Elegí un rubro de productos y pedime un borrador o tips de fotos/envío."
              : "Elegí un rubro y pedime un borrador o plan de crecimiento.",
            isStoreSeller
              ? "Escolha um ramo de produtos e peça um rascunho ou dicas de fotos/frete."
              : "Escolha um ramo e peça um rascunho ou plano de crescimento."
          ),
        }
      },
    }),

    get_faq_answer: tool({
      description: "Responde FAQs frecuentes de Servido: pagos, envíos, cadete, tienda, reclamos, cuenta.",
      inputSchema: z.object({
        topic: z.enum(["pagos", "envios", "cadete", "tienda", "reclamos", "cuenta", "publicar"]),
      }),
      execute: async ({ topic }) => {
        const faqs: Record<string, { answer: string; href: string }> = {
          pagos: {
            answer: t(
              "Los pagos se gestionan por los flujos de la app (Mercado Pago cuando aplica). Nunca compartas claves ni códigos por chat.",
              "Os pagamentos seguem os fluxos do app (Mercado Pago quando aplicável). Nunca compartilhe senhas ou códigos no chat."
            ),
            href: "/dashboard/buyer",
          },
          envios: {
            answer: t(
              "El envío lo define cada vendedor/local. Preguntá zona, costo y demora por chat antes de comprar.",
              "A entrega é definida por cada vendedor/local. Pergunte região, custo e prazo no chat antes de comprar."
            ),
            href: "/mensajes",
          },
          cadete: {
            answer: t(
              "Para ser cadete postulás con zona y vehículo. Un admin aprueba y recién ahí podés tomar pedidos.",
              "Para ser entregador você se candidata com zona e veículo. Um admin aprova e aí você pode pegar pedidos."
            ),
            href: "/signup/cadete",
          },
          tienda: {
            answer: t(
              "Podés crear tienda desde tu cuenta: Productos o Comida. Después publicás el catálogo.",
              "Você pode criar loja pela conta: Produtos ou Comida. Depois publique o catálogo."
            ),
            href: "/dashboard/buyer?tab=openStore",
          },
          reclamos: {
            answer: t(
              "Si hubo un problema con una compra, usá el flujo de reclamos desde tu panel/compra y explicá el caso con pruebas.",
              "Se houve problema com uma compra, use o fluxo de reclamações no painel/compra e explique com provas."
            ),
            href: "/dashboard/buyer?tab=claims",
          },
          cuenta: {
            answer: t(
              "Tu cuenta empieza simple y después podés vender, publicar o postularte como cadete sin crear otra.",
              "Sua conta começa simples e depois você pode vender, publicar ou se candidatar como entregador."
            ),
            href: "/dashboard/buyer",
          },
          publicar: {
            answer: t(
              "Desde Mi cuenta → Publicar un producto cargás fotos, precio y descripción. Servido Bot puede armarte el borrador.",
              "Em Minha conta → Publicar um produto você sobe fotos, preço e descrição. O Servido Bot pode montar o rascunho."
            ),
            href: "/dashboard/buyer?tab=publishProduct",
          },
        }
        return { ok: true, topic, ...faqs[topic] }
      },
    }),

    get_safety_tips: tool({
      description: "Tips de seguridad para comprar o vender en Servido.",
      inputSchema: z.object({
        side: z.enum(["buyer", "seller"]).optional(),
      }),
      execute: async ({ side = "buyer" }) => {
        const tips =
          side === "seller"
            ? t(
                "No compartas datos bancarios fuera de la app|Confirmá el pago antes de enviar|Pedí dirección clara|Guardá comprobantes|Desconfiá de urgencias raras",
                "Não compartilhe dados bancários fora do app|Confirme o pagamento antes de enviar|Peça endereço claro|Guarde comprovantes|Desconfie de urgências estranhas"
              ).split("|")
            : t(
                "Revisá fotos y descripción|Preguntá stock y envío por chat|No pagues por fuera si no confías|Verificá el perfil del vendedor|Usá el flujo de reclamos si hay problema",
                "Revise fotos e descrição|Pergunte estoque e frete no chat|Não pague por fora se não confiar|Verifique o perfil do vendedor|Use reclamações se houver problema"
              ).split("|")
        return { ok: true, side, tips }
      },
    }),

    create_growth_plan: tool({
      description: "Plan de crecimiento corto para seller, cadete, restaurant o buyer.",
      inputSchema: z.object({
        role: z.enum(["seller", "cadete", "restaurant", "buyer"]).optional(),
        goal: z.string().optional(),
      }),
      execute: async ({ role, goal }) => {
        const resolvedRole =
          role ||
          (isRestaurant
            ? "restaurant"
            : isCadete
              ? "cadete"
              : isStoreSeller
                ? "seller"
                : "buyer")
        const plans = {
          seller: {
            week: t(
              "Día 1: publicá 3 productos con buenas fotos|Día 2: respondé chats en <1 hora|Día 3: subí una historia o live|Día 4: revisá precios y opciones de envío|Día 5: pedí reseñas a compradores",
              "Dia 1: publique 3 produtos com boas fotos|Dia 2: responda chats em <1 hora|Dia 3: suba uma história ou live|Dia 4: revise preços e frete|Dia 5: peça avaliações"
            ).split("|"),
            href: "/dashboard/buyer?tab=publishProduct",
          },
          restaurant: {
            week: t(
              "Actualizá menú y fotos|Creá combo del día|Definí tiempos reales de entrega|Activá horarios pico|Respondé chats de pedidos al toque",
              "Atualize cardápio e fotos|Crie combo do dia|Defina tempos reais|Ative horários de pico|Responda chats de pedidos rápido"
            ).split("|"),
            href: "/dashboard/restaurant",
          },
          cadete: {
            week: t(
              "Completá registro y zona|Esperá aprobación del admin|Está online en almuerzo/cena|Priorizá pedidos cercanos|Cuidá tu reputación y seguridad",
              "Complete cadastro e zona|Aguarde aprovação do admin|Fique online no almoço/jantar|Priorize pedidos próximos|Cuide da reputação e segurança"
            ).split("|"),
            href: "/dashboard/cadete",
          },
          buyer: {
            week: t(
              "Explorá categorías|Compará 2–3 vendedores|Usá el chat|Confirmá entregas|Guardá favoritos",
              "Explore categorias|Compare 2–3 vendedores|Use o chat|Confirme entregas|Salve favoritos"
            ).split("|"),
            href: "/products",
          },
        }
        return { ok: true, role: resolvedRole, goal: goal || null, plan: plans[resolvedRole] }
      },
    }),

    seller_photo_checklist: tool({
      description:
        "Checklist de fotos para publicaciones de productos (vendedor de tienda). No usar para menús de restaurante.",
      inputSchema: z.object({
        category: z.string().optional(),
      }),
      execute: async ({ category }) => {
        return {
          ok: true,
          category: category || null,
          checklist: t(
            "Fondo limpio y luz natural|Mostrá el producto completo|Detalle de etiqueta/estado|Foto con escala (mano o regla)|Evitar filtros extremos|Primera foto = la más clara",
            "Fundo limpo e luz natural|Mostre o produto inteiro|Detalhe de etiqueta/estado|Foto com escala (mão ou régua)|Evite filtros extremos|Primeira foto = a mais clara"
          ).split("|"),
          tip: t(
            "Con buenas fotos vendés más. Después pedime un título o precio.",
            "Com boas fotos você vende mais. Depois peça um título ou preço."
          ),
          href: "/dashboard/buyer?tab=publishProduct",
        }
      },
    }),

    seller_shipping_guide: tool({
      description:
        "Guía de envíos y entrega para vendedores de productos: zona, costo, tiempos y mensajes al comprador.",
      inputSchema: z.object({
        mode: z.enum(["retiro", "envio", "ambos"]).optional(),
      }),
      execute: async ({ mode = "ambos" }) => {
        const tips =
          mode === "retiro"
            ? t(
                "Definí punto de encuentro seguro|Horarios claros de retiro|Pedí confirmación por chat|No compartas domicilio exacto si no querés",
                "Defina ponto seguro|Horários claros de retirada|Peça confirmação no chat|Não compartilhe endereço exato se não quiser"
              ).split("|")
            : mode === "envio"
              ? t(
                  "Indicá zona y costo antes de cerrar|Estimá demora realista|Pedí dirección completa|Avisá cuando salga el envío|Guardá comprobante",
                  "Indique região e custo antes de fechar|Estime prazo realista|Peça endereço completo|Avise quando sair|Guarde comprovante"
                ).split("|")
              : t(
                  "Ofrecé retiro y envío si podés|Publicá costos en la ficha o chat|Sé claro con demoras|Usá el chat para coordinar|No inventes tracking",
                  "Ofereça retirada e frete se puder|Publique custos na ficha ou chat|Seja claro com prazos|Use o chat|Não invente rastreio"
                ).split("|")
        return {
          ok: true,
          mode,
          tips,
          sampleReply: t(
            "¡Hola! Hago envío en tu zona por $X (1–2 días) o retiro coordinado. ¿Cuál preferís?",
            "Olá! Faço entrega na sua região por R$X (1–2 dias) ou retirada combinada. Qual prefere?"
          ),
          href: "/mensajes",
        }
      },
    }),

    restaurant_ops_tips: tool({
      description: "Tips operativos para locales de comida: menú, tiempos, combos y pedidos.",
      inputSchema: z.object({
        topic: z.enum(["menu", "tiempos", "combos", "pedidos"]).optional(),
      }),
      execute: async ({ topic = "menu" }) => {
        const map = {
          menu: t(
            "Menú corto y claro|Fotos reales de platos|Precios visibles|Marcá agotados|Actualizá al abrir/cerrar",
            "Cardápio curto e claro|Fotos reais|Preços visíveis|Marque esgotados|Atualize ao abrir/fechar"
          ),
          tiempos: t(
            "Prometé tiempos realistas|Avisá demoras por chat|Priorizá pedidos cercanos|Prepará en lotes en hora pico",
            "Prometa tempos reais|Avise atrasos no chat|Priorize pedidos próximos|Prepare em lotes no pico"
          ),
          combos: t(
            "Combo del día con margen|Nombre atractivo|Precio redondo|Foto del combo|Límite de stock del día",
            "Combo do dia com margem|Nome atrativo|Preço redondo|Foto do combo|Limite de estoque do dia"
          ),
          pedidos: t(
            "Confirmá pago/estado|Respondé chats rápido|Empacá bien|Avisá al cadete|Pedí feedback al cliente",
            "Confirme pagamento/status|Responda chats rápido|Embale bem|Avise o entregador|Peça feedback"
          ),
        }
        return {
          ok: true,
          topic,
          tips: map[topic].split("|"),
          href: "/dashboard/restaurant",
        }
      },
    }),

    cadete_ops_tips: tool({
      description: "Tips para cadetes/repartidores: zona, horarios, ganancias y seguridad.",
      inputSchema: z.object({
        topic: z.enum(["zona", "horarios", "ganancias", "seguridad"]).optional(),
      }),
      execute: async ({ topic = "ganancias" }) => {
        const map = {
          zona: t(
            "Elegí zona que conozcas|Actualizá si te mudás|Quedate cerca de locales activos|Avisá si no podés cubrir",
            "Escolha zona que conhece|Atualize se mudar|Fique perto de locais ativos|Avise se não puder cobrir"
          ),
          horarios: t(
            "Almuerzo y cena rinden más|Está online cuando podés cumplir|Avisá offline si descansás|No aceptes si no llegás a tiempo",
            "Almoço e jantar rendem mais|Fique online quando puder cumprir|Avise offline se descansar|Não aceite se não chegar a tempo"
          ),
          ganancias: t(
            "Pedidos cercanos = más viajes|Menos cancelaciones|Buen trato = más propinas|Llevá vuelto/cambio si aplica|Registrá tus viajes",
            "Pedidos próximos = mais viagens|Menos cancelamentos|Bom trato = mais gorjetas|Leve troco se precisar|Registre suas viagens"
          ),
          seguridad: t(
            "No compartas datos personales|Confirmá punto de entrega|Si algo se siente mal, cancelá|Usá casco/luces|No muestres efectivo",
            "Não compartilhe dados pessoais|Confirme o ponto|Se algo estranho, cancele|Use capacete/luzes|Não mostre dinheiro"
          ),
        }
        return {
          ok: true,
          topic,
          tips: map[topic].split("|"),
          href: isCadete ? "/dashboard/cadete" : "/signup/cadete",
        }
      },
    }),
  }
}
