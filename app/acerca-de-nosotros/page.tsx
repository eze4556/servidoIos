import Link from "next/link"
import {
  Handshake,
  Heart,
  Lightbulb,
  Shield,
  Store,
  Target,
  Users,
} from "lucide-react"
import { InfoCtaCard } from "@/components/info/info-cta-card"
import { InfoPageShell } from "@/components/info/info-page-shell"
import { InfoSection } from "@/components/info/info-section"

const values = [
  {
    icon: Shield,
    title: "Confianza",
    description: "Relaciones sólidas basadas en transparencia, seguridad y honestidad en cada transacción.",
  },
  {
    icon: Lightbulb,
    title: "Innovación",
    description: "Mejoramos la plataforma constantemente para ofrecer una experiencia cada vez más simple.",
  },
  {
    icon: Users,
    title: "Comunidad",
    description: "Conectamos compradores y vendedores en un entorno de apoyo y colaboración.",
  },
  {
    icon: Handshake,
    title: "Integridad",
    description: "Operamos con ética y responsabilidad en todo lo que hacemos.",
  },
  {
    icon: Target,
    title: "Excelencia",
    description: "Nos esforzamos por brindar un servicio de calidad en cada detalle.",
  },
]

const highlights = [
  { label: "Marketplace", value: "Productos y servicios" },
  { label: "Comunidad", value: "Compradores y vendedores" },
  { label: "Seguridad", value: "Compra protegida" },
]

export default function AcercaDeNosotrosPage() {
  return (
    <InfoPageShell
      badge="Quiénes somos"
      badgeIcon={Users}
      title="Conectamos personas, productos y servicios"
      subtitle="Servido es el marketplace argentino donde compradores y vendedores se encuentran en un espacio seguro, moderno y fácil de usar."
    >
      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        {highlights.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-purple-100 bg-white px-5 py-4 text-center shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-purple-600">{item.label}</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <InfoSection title="Nuestra misión">
          <p>
            Conectar a personas que buscan productos y servicios con quienes los ofrecen, creando una comunidad
            vibrante y un mercado eficiente. Facilitamos transacciones justas y seguras, empoderando a individuos y
            pequeñas empresas para crecer en la economía digital.
          </p>
        </InfoSection>

        <InfoSection title="Nuestra visión">
          <p>
            Ser la plataforma de referencia para comprar y vender productos y servicios, reconocida por la facilidad
            de uso, la seguridad y la confianza que generamos. Innovamos para ofrecer la mejor experiencia a nuestra
            comunidad.
          </p>
        </InfoSection>
      </div>

      <section className="mt-10">
        <div className="mb-6 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-900">
            <Heart className="h-4 w-4" />
          </span>
          <h2 className="text-xl font-semibold text-gray-900">Nuestros valores</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {values.map(({ icon: Icon, title, description }) => (
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

      <div className="mt-10 space-y-6">
        <InfoSection title="Nuestro equipo">
          <p>
            Somos un equipo apasionado y dedicado, comprometido con una plataforma que realmente satisfaga las
            necesidades de nuestros usuarios. Valoramos la diversidad, la creatividad y el trabajo en equipo para
            alcanzar nuestros objetivos.
          </p>
          <p>
            ¿Querés sumarte?{" "}
            <Link href="/trabaja-con-nosotros" className="font-medium text-purple-900 underline-offset-2 hover:underline">
              Conocé las oportunidades para trabajar con nosotros
            </Link>
            .
          </p>
        </InfoSection>

        <InfoCtaCard
          icon={Store}
          title="¿Listo para empezar?"
          description="Explorá el catálogo, encontrá lo que necesitás o abrí tu tienda y empezá a vender en Servido."
          primaryLabel="Ver productos"
          primaryHref="/products"
          secondaryLabel="Vender en Servido"
          secondaryHref="/signup?role=seller"
        />
      </div>
    </InfoPageShell>
  )
}
