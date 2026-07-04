import {
  Briefcase,
  Coffee,
  GraduationCap,
  Heart,
  Mail,
  Rocket,
  Sparkles,
  Users,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { InfoCtaCard } from "@/components/info/info-cta-card"
import { InfoPageShell } from "@/components/info/info-page-shell"
import { InfoSection } from "@/components/info/info-section"

const benefits = [
  {
    icon: Rocket,
    title: "Crecimiento profesional",
    description: "Oportunidades reales de desarrollo y aprendizaje en un producto en expansión.",
  },
  {
    icon: Coffee,
    title: "Entorno flexible",
    description: "Trabajo colaborativo, dinámico y orientado a resultados.",
  },
  {
    icon: Zap,
    title: "Tecnología de punta",
    description: "Proyectos desafiantes con stack moderno: Next.js, Firebase y más.",
  },
  {
    icon: Users,
    title: "Equipo talentoso",
    description: "Personas apasionadas que comparten ideas y celebran los logros juntas.",
  },
  {
    icon: GraduationCap,
    title: "Aprendizaje continuo",
    description: "Cada día es una oportunidad para aprender algo nuevo y superar límites.",
  },
  {
    icon: Heart,
    title: "Impacto real",
    description: "Tu trabajo contribuye directamente al éxito de una plataforma que miles usan.",
  },
]

const openAreas = [
  "Desarrollo web y mobile",
  "Diseño de producto y UX",
  "Operaciones y soporte",
  "Marketing y comunidad",
]

export default function TrabajaConNosotrosPage() {
  return (
    <InfoPageShell
      badge="Carreras"
      badgeIcon={Briefcase}
      title="Trabajá con nosotros"
      subtitle="Estamos construyendo el futuro del comercio digital en Argentina. Buscamos talentos que quieran dejar huella en un equipo ágil, creativo y con propósito."
    >
      <div className="mb-10 grid gap-6 lg:grid-cols-2">
        <InfoSection title="¿Por qué unirte a Servido?">
          <p>
            En Servido ofrecemos un entorno de trabajo dinámico, desafiante y colaborativo, donde cada persona tiene la
            oportunidad de crecer y contribuir al éxito de la plataforma.
          </p>
          <p>
            Creemos en la innovación, la diversidad y el impacto positivo. Si buscás un lugar donde tus ideas sean
            valoradas y tu trabajo realmente importe, este es tu lugar.
          </p>
        </InfoSection>

        <InfoSection title="Nuestra cultura">
          <p>
            Fomentamos el aprendizaje continuo, el respeto mutuo y la excelencia. Nos encanta resolver problemas
            complejos y celebrar los éxitos en equipo.
          </p>
          <p>
            En Servido, cada día es una oportunidad para aprender, innovar y desafiar lo establecido.
          </p>
        </InfoSection>
      </div>

      <section className="mb-10">
        <div className="mb-6 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-900">
            <Sparkles className="h-4 w-4" />
          </span>
          <h2 className="text-xl font-semibold text-gray-900">Beneficios de trabajar en Servido</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-2xl border border-purple-100/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-900">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="font-semibold text-gray-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <InfoSection title="Áreas de interés" className="mb-10">
        <p>
          Siempre estamos abiertos a conocer perfiles con talento en distintas disciplinas. Estas son algunas de las
          áreas donde solemos buscar personas:
        </p>
        <ul>
          {openAreas.map((area) => (
            <li key={area}>{area}</li>
          ))}
        </ul>
      </InfoSection>

      <div className="relative overflow-hidden rounded-2xl border border-purple-200/60 bg-gradient-to-br from-[#2d0057] via-purple-900 to-violet-900 p-6 text-white shadow-xl sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-purple-400/20 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-lg">
            <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
              <Mail className="h-5 w-5" />
            </span>
            <h3 className="text-xl font-semibold">Enviá tu CV</h3>
            <p className="mt-2 text-sm leading-relaxed text-purple-100">
              Si estás listo para sumarte al equipo, mandanos tu currículum y una breve carta de presentación. ¡Esperamos
              conocerte!
            </p>
            <a
              href="mailto:servidoarg@gmail.com"
              className="mt-3 inline-block text-sm font-medium text-purple-200 underline-offset-2 hover:text-white hover:underline"
            >
              servidoarg@gmail.com
            </a>
          </div>
          <Button
            asChild
            size="lg"
            className="shrink-0 rounded-full bg-white text-purple-900 hover:bg-purple-50"
          >
            <a href="mailto:servidoarg@gmail.com?subject=Postulación%20Servido">Enviar postulación</a>
          </Button>
        </div>
      </div>

      <div className="mt-10">
        <InfoCtaCard
          icon={Users}
          title="Conocé más sobre Servido"
          description="Descubrí nuestra misión, visión y los valores que guían cada decisión en la plataforma."
          primaryLabel="Quiénes somos"
          primaryHref="/acerca-de-nosotros"
          secondaryLabel="Ver términos"
          secondaryHref="/terminos-y-condiciones"
        />
      </div>
    </InfoPageShell>
  )
}
