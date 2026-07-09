import Link from "next/link"
import { FileText, Mail, Shield } from "lucide-react"
import { InfoCtaCard } from "@/components/info/info-cta-card"
import { InfoPageShell } from "@/components/info/info-page-shell"
import { InfoSection } from "@/components/info/info-section"

const sections = [
  { id: "informacion", number: 1, title: "Información que recopilamos" },
  { id: "cuenta", number: 2, title: "Creación de cuenta" },
  { id: "ubicacion", number: 3, title: "Uso de la ubicación" },
  { id: "publicidad", number: 4, title: "Publicidad" },
  { id: "terceros", number: 5, title: "Compartir información con terceros" },
  { id: "seguridad", number: 6, title: "Seguridad de los datos" },
  { id: "contacto", number: 7, title: "Contacto" },
  { id: "cambios", number: 8, title: "Cambios en esta política" },
]

export default function PoliticasDePrivacidadPage() {
  return (
    <InfoPageShell
      badge="Legal"
      badgeIcon={Shield}
      title="Política de Privacidad – ServiDo"
      subtitle="En ServiDo nos comprometemos a proteger la privacidad de nuestros usuarios y a manejar sus datos personales con transparencia y seguridad. Esta política describe qué información recopilamos, cómo la utilizamos y qué medidas tomamos para protegerla."
      lastUpdated="4 de agosto de 2025"
    >
      <div className="grid gap-8 lg:grid-cols-[220px_1fr] lg:gap-10 xl:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <nav className="sticky top-28 rounded-2xl border border-purple-100 bg-white p-4 shadow-sm">
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-700">
              <FileText className="h-3.5 w-3.5" />
              Índice
            </p>
            <ol className="space-y-1 text-sm">
              {sections.map(({ id, number, title }) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    className="block rounded-lg px-2 py-1.5 text-gray-600 transition-colors hover:bg-purple-50 hover:text-purple-900"
                  >
                    <span className="font-medium text-purple-800">{number}.</span> {title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <div className="space-y-5">
          <InfoSection id="informacion" number={1} title="Información que recopilamos">
            <p>Al registrarse y utilizar ServiDo, podemos recolectar la siguiente información personal:</p>
            <ul>
              <li>Nombre y apellido</li>
              <li>Dirección de correo electrónico</li>
              <li>Número de teléfono</li>
              <li>Ubicación geográfica (para coordinar envíos y mostrar servicios cercanos)</li>
            </ul>
          </InfoSection>

          <InfoSection id="cuenta" number={2} title="Creación de cuenta">
            <p>
              Para utilizar ServiDo, el usuario debe crear una cuenta ingresando a la opción &quot;Registrarse&quot; en la
              plataforma y completando los datos solicitados.
            </p>
          </InfoSection>

          <InfoSection id="ubicacion" number={3} title="Uso de la ubicación">
            <p>ServiDo utiliza la ubicación del usuario para:</p>
            <ul>
              <li>Coordinar entregas o envíos de productos y servicios.</li>
              <li>Mostrar resultados relevantes cercanos a su ubicación.</li>
            </ul>
            <p>
              El usuario puede gestionar los permisos de ubicación desde la configuración de su dispositivo.
            </p>
          </InfoSection>

          <InfoSection id="publicidad" number={4} title="Publicidad">
            <p>
              ServiDo muestra anuncios dentro de la aplicación. Estos anuncios pueden ser propios o de terceros, pero no
              implican la entrega de datos personales del usuario a anunciantes.
            </p>
          </InfoSection>

          <InfoSection id="terceros" number={5} title="Compartir información con terceros">
            <p>
              ServiDo no comparte datos personales ni información de los usuarios con terceros, salvo obligación legal.
            </p>
          </InfoSection>

          <InfoSection id="seguridad" number={6} title="Seguridad de los datos">
            <p>
              En ServiDo implementamos medidas técnicas y organizativas para proteger la información de nuestros
              usuarios:
            </p>
            <ul>
              <li>
                <strong>Encriptación:</strong> utilizamos encriptación para proteger los datos tanto en tránsito como en
                reposo.
              </li>
              <li>
                <strong>Servidores seguros:</strong> las operaciones se ejecutan en servidores robustos, protegidos con
                firewalls y sistemas de detección de intrusiones, ubicados en entornos controlados con acceso
                restringido.
              </li>
            </ul>
          </InfoSection>

          <InfoSection id="contacto" number={7} title="Contacto">
            <p>Para consultas o solicitudes relacionadas con privacidad, puede comunicarse con nosotros a:</p>
            <p>
              <a
                href="mailto:servidoarg@gmail.com"
                className="inline-flex items-center gap-2 font-medium text-purple-800 hover:text-purple-950 hover:underline"
              >
                <Mail className="h-4 w-4" />
                servidoarg@gmail.com
              </a>
            </p>
          </InfoSection>

          <InfoSection id="cambios" number={8} title="Cambios en esta política">
            <p>
              Podemos actualizar esta política de privacidad ocasionalmente. Cualquier cambio será publicado en esta
              misma sección con la fecha de última actualización.
            </p>
          </InfoSection>

          <InfoCtaCard
            icon={Shield}
            title="¿Tenés dudas sobre privacidad?"
            description="Escribinos por correo o revisá los términos y condiciones de uso de la plataforma."
            primaryLabel="Contactar por email"
            primaryHref="mailto:servidoarg@gmail.com"
            secondaryLabel="Ver términos y condiciones"
            secondaryHref="/terminos-y-condiciones"
          />
        </div>
      </div>
    </InfoPageShell>
  )
}
