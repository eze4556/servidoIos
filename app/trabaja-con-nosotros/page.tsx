import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Code2,
  Coffee,
  GraduationCap,
  Heart,
  LineChart,
  Mail,
  Megaphone,
  Palette,
  Rocket,
  Sparkles,
  Users,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { InfoCtaCard } from "@/components/info/info-cta-card"
import { InfoPageShell } from "@/components/info/info-page-shell"
import { InfoSection } from "@/components/info/info-section"

const highlights = [
  { label: "Modalidad", value: "Remoto / híbrido" },
  { label: "Ubicación", value: "Argentina" },
  { label: "Equipo", value: "En crecimiento" },
]

const benefits = [
  {
    icon: Rocket,
    title: "Crecimiento profesional",
    description: "Desarrollo real en un producto que escala con miles de usuarios.",
    accent: "from-purple-500/10 to-violet-500/5",
  },
  {
    icon: Coffee,
    title: "Entorno flexible",
    description: "Trabajo colaborativo, dinámico y orientado a resultados.",
    accent: "from-amber-500/10 to-orange-500/5",
  },
  {
    icon: Zap,
    title: "Stack moderno",
    description: "Next.js, Firebase, TypeScript y herramientas de última generación.",
    accent: "from-sky-500/10 to-blue-500/5",
  },
  {
    icon: Users,
    title: "Equipo cercano",
    description: "Decisiones ágiles, feedback directo y celebración de logros.",
    accent: "from-emerald-500/10 to-teal-500/5",
  },
  {
    icon: GraduationCap,
    title: "Aprendizaje continuo",
    description: "Espacio para probar ideas, equivocarte y mejorar rápido.",
    accent: "from-rose-500/10 to-pink-500/5",
  },
  {
    icon: Heart,
    title: "Impacto visible",
    description: "Lo que construís llega a compradores y vendedores reales.",
    accent: "from-fuchsia-500/10 to-purple-500/5",
  },
]

const openAreas = [
  {
    icon: Code2,
    title: "Desarrollo web y mobile",
    description: "Frontend, backend, integraciones y performance.",
  },
  {
    icon: Palette,
    title: "Diseño de producto y UX",
    description: "Interfaces, research y experiencia de usuario.",
  },
  {
    icon: LineChart,
    title: "Operaciones y soporte",
    description: "Procesos, atención al usuario y mejora continua.",
  },
  {
    icon: Megaphone,
    title: "Marketing y comunidad",
    description: "Contenido, redes y crecimiento de la plataforma.",
  },
]

const processSteps = [
  {
    step: "01",
    title: "Enviá tu postulación",
    description: "Mandanos tu CV y una carta breve contando por qué querés sumarte.",
  },
  {
    step: "02",
    title: "Conocémonos",
    description: "Charlamos sobre tu experiencia, intereses y cómo podés aportar.",
  },
  {
    step: "03",
    title: "Sumate al equipo",
    description: "Si hay match, te acompañamos en la integración y primeros proyectos.",
  },
]

const applicationChecklist = [
  "CV actualizado (PDF o link)",
  "Rol o área de interés",
  "Portfolio, GitHub o trabajos previos (si aplica)",
  "Disponibilidad y modalidad preferida",
]

const faqs = [
  {
    question: "¿Necesito experiencia previa en marketplaces?",
    answer:
      "No es obligatorio. Valoramos actitud, capacidad de aprender y ganas de construir producto. Si tenés experiencia en e-commerce o fintech, suma puntos.",
  },
  {
    question: "¿Trabajan de forma remota?",
    answer:
      "Sí, contemplamos modalidad remota y híbrida según el rol. Lo importante es la comunicación y el compromiso con el equipo.",
  },
  {
    question: "¿Qué debo incluir en el mail de postulación?",
    answer:
      "Tu CV, el área que te interesa, una breve presentación y links a portfolio o proyectos. Cuantos más contexto nos des, mejor podemos conocerte.",
  },
  {
    question: "¿Hay posiciones abiertas fijas?",
    answer:
      "Siempre estamos abiertos a conocer talento. Aunque no haya una búsqueda activa para tu perfil, guardamos postulaciones para futuras oportunidades.",
  },
]

const culturePillars = [
  "Innovación con propósito",
  "Respeto y transparencia",
  "Ownership de lo que construís",
  "Mejora continua",
]

export default function TrabajaConNosotrosPage() {
  return (
    <InfoPageShell
      badge="Carreras"
      badgeIcon={Briefcase}
      title="Construí el marketplace del futuro con nosotros"
      subtitle="En Servido conectamos compradores y vendedores en toda Argentina. Buscamos personas curiosas, proactivas y con ganas de dejar huella en un producto digital en expansión."
    >
      {/* Stats */}
      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        {highlights.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-purple-100 bg-white px-5 py-4 text-center shadow-sm transition-shadow hover:shadow-md"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-purple-600">{item.label}</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Intro + cultura */}
      <div className="mb-10 grid gap-6 lg:grid-cols-5">
        <InfoSection title="¿Por qué unirte a Servido?" className="lg:col-span-3">
          <p>
            Somos un equipo que construye tecnología con impacto real: cada mejora en la plataforma ayuda a que más
            personas compren, vendan y confíen en el comercio digital.
          </p>
          <p>
            Buscamos personas que disfruten resolver problemas, trabajar en equipo y proponer ideas. Si te motiva
            crecer en un entorno ágil y con propósito, queremos conocerte.
          </p>
        </InfoSection>

        <div className="relative overflow-hidden rounded-2xl border border-purple-200/60 bg-gradient-to-br from-purple-900 to-violet-950 p-6 text-white shadow-lg lg:col-span-2">
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-purple-400/25 blur-2xl" />
          <div className="relative z-10">
            <Sparkles className="mb-3 h-6 w-6 text-purple-200" />
            <p className="text-lg font-semibold leading-snug">
              &ldquo;Creemos que el mejor trabajo surge cuando hay desafío, autonomía y un equipo que te acompaña.&rdquo;
            </p>
            <p className="mt-4 text-sm text-purple-200">— Cultura Servido</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {culturePillars.map((pillar) => (
                <span
                  key={pillar}
                  className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-purple-100 ring-1 ring-white/15"
                >
                  {pillar}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Beneficios */}
      <section className="mb-10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-900">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Beneficios de trabajar acá</h2>
              <p className="text-sm text-gray-500">Lo que ofrecemos a quienes se suman</p>
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map(({ icon: Icon, title, description, accent }) => (
            <div
              key={title}
              className={`group rounded-2xl border border-purple-100/80 bg-gradient-to-br ${accent} bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md`}
            >
              <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-purple-900 text-white shadow-sm transition-transform group-hover:scale-105">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="font-semibold text-gray-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Áreas */}
      <section className="mb-10">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Áreas donde buscamos talento</h2>
          <p className="mt-1 text-sm text-gray-500">Siempre abiertos a perfiles con ganas de aportar</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {openAreas.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="flex gap-4 rounded-2xl border border-purple-100/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-900">
                <Icon className="h-6 w-6" />
              </span>
              <div>
                <h3 className="font-semibold text-gray-900">{title}</h3>
                <p className="mt-1 text-sm text-gray-600">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Proceso */}
      <section className="mb-10 rounded-2xl border border-purple-100/80 bg-purple-50/40 p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-gray-900">Cómo es el proceso</h2>
        <p className="mt-1 text-sm text-gray-500">Simple, transparente y sin vueltas</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {processSteps.map(({ step, title, description }) => (
            <div key={step} className="relative rounded-2xl bg-white p-5 shadow-sm ring-1 ring-purple-100/80">
              <span className="text-3xl font-bold text-purple-200">{step}</span>
              <h3 className="mt-2 font-semibold text-gray-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Postulación */}
      <div className="relative mb-10 overflow-hidden rounded-3xl border border-purple-200/60 bg-gradient-to-br from-[#2d0057] via-purple-900 to-violet-900 p-6 text-white shadow-xl sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-purple-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-violet-300/15 blur-3xl" />

        <div className="relative z-10 grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
              <Mail className="h-5 w-5" />
            </span>
            <h3 className="text-2xl font-bold tracking-tight">Enviá tu postulación</h3>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-purple-100">
              Escribinos con tu CV y contanos qué te motiva de Servido. Revisamos cada mensaje con atención.
            </p>
            <a
              href="mailto:servidoarg@gmail.com"
              className="mt-5 flex w-full min-w-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-white/15 sm:max-w-md sm:justify-start sm:text-left"
              style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
            >
              servidoarg@gmail.com
            </a>
            <div className="mt-6 w-full sm:w-auto">
              <Button
                asChild
                size="lg"
                className="rounded-full bg-white text-purple-900 hover:bg-purple-50"
              >
                <a href="mailto:servidoarg@gmail.com?subject=Postulación%20Servido%20-%20[Nombre%20y%20área]">
                  Postularme ahora
                </a>
              </Button>
            </div>
          </div>

          <div className="rounded-2xl bg-white/10 p-5 ring-1 ring-white/15 backdrop-blur-sm">
            <p className="mb-4 text-sm font-semibold text-purple-100">Incluí en tu mail:</p>
            <ul className="space-y-3">
              {applicationChecklist.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-purple-50">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900">Preguntas frecuentes</h2>
        <p className="mt-1 mb-6 text-sm text-gray-500">Dudas comunes sobre trabajar en Servido</p>
        <div className="space-y-3">
          {faqs.map(({ question, answer }) => (
            <details
              key={question}
              className="group rounded-2xl border border-purple-100/80 bg-white shadow-sm open:shadow-md"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-medium text-gray-900 marker:content-none [&::-webkit-details-marker]:hidden">
                {question}
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-50 text-purple-900 transition-transform group-open:rotate-180">
                  <ArrowRight className="h-3.5 w-3.5 rotate-90" />
                </span>
              </summary>
              <div className="border-t border-purple-50 px-5 pb-4 pt-1">
                <p className="text-sm leading-relaxed text-gray-600">{answer}</p>
              </div>
            </details>
          ))}
        </div>
      </section>

      <InfoCtaCard
        icon={Users}
        title="Conocé más sobre Servido"
        description="Descubrí nuestra misión, visión y los valores que guían cada decisión en la plataforma."
        primaryLabel="Quiénes somos"
        primaryHref="/acerca-de-nosotros"
        secondaryLabel="Ver términos"
        secondaryHref="/terminos-y-condiciones"
      />
    </InfoPageShell>
  )
}
