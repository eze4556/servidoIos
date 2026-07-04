import Link from "next/link"
import { FileText, Scale } from "lucide-react"
import { InfoCtaCard } from "@/components/info/info-cta-card"
import { InfoPageShell } from "@/components/info/info-page-shell"
import { InfoSection } from "@/components/info/info-section"

const sections = [
  { id: "rol", number: 1, title: "Rol de la Plataforma" },
  { id: "independencia", number: 2, title: "Independencia de las partes" },
  { id: "responsabilidad", number: 3, title: "Exclusión de Responsabilidad" },
  { id: "evaluaciones", number: 4, title: "Evaluaciones y calificaciones" },
  { id: "reembolsos", number: 5, title: "Reembolsos e intervención de la plataforma" },
  { id: "seguros", number: 6, title: "Seguros y coberturas" },
  { id: "reportes", number: 7, title: "Reporte de incidentes" },
  { id: "relacion", number: 8, title: "Relación entre Usuarios" },
  { id: "tarifas", number: 9, title: "Tarifas" },
  { id: "conducta", number: 10, title: "Normas de conducta y contenido" },
  { id: "sanciones", number: 11, title: "Sanciones" },
  { id: "indemnidad", number: 12, title: "Indemnidad" },
  { id: "contacto", number: 13, title: "Medios de Contacto Oficiales" },
  { id: "aceptacion", number: 14, title: "Aceptación" },
]

export default function TerminosYCondicionesPage() {
  return (
    <InfoPageShell
      badge="Legal"
      badgeIcon={Scale}
      title="Términos y condiciones de uso"
      subtitle="Al utilizar Servido aceptás las condiciones que rigen el uso de la plataforma, la relación entre compradores, vendedores y prestadores de servicios."
      lastUpdated="4 de julio de 2026"
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
          <InfoSection id="rol" number={1} title="Rol de la Plataforma">
            <p>
              Servido (en adelante, &quot;la Plataforma&quot;) actúa exclusivamente como un medio de vinculación entre
              personas que ofrecen servicios o productos (en adelante, &quot;Prestadores&quot;) y personas interesadas en
              contratarlos o adquirirlos (en adelante, &quot;Clientes&quot;).
            </p>
            <p>La Plataforma no forma parte del contrato que eventualmente se celebre entre el Prestador y el Cliente.</p>
            <p>
              Nuestra función es brindar un espacio virtual para la promoción, visibilidad y contacto, sin intervenir en
              la calidad, condiciones, ejecución o resultado de los servicios contratados.
            </p>
          </InfoSection>

          <InfoSection id="independencia" number={2} title="Independencia de las partes">
            <p>
              Cada Prestador registrado en la plataforma actúa en ejercicio de su autonomía profesional y comercial, sin
              que exista entre ellos y Servido relación laboral, societaria o de representación alguna.
            </p>
            <p>
              Servido no emplea, dirige ni controla las actividades de los Prestadores, sino que actúa como un canal que
              facilita el vínculo entre estos y los Usuarios.
            </p>
            <p>
              En ese marco, cada Prestador es plenamente responsable de cumplir con las disposiciones legales, fiscales y
              laborales que rijan su actividad, mientras que Servido se reserva el derecho de verificar que los
              compromisos asumidos por los Prestadores en la plataforma sean efectivamente cumplidos.
            </p>
          </InfoSection>

          <InfoSection id="responsabilidad" number={3} title="Exclusión de Responsabilidad">
            <p>
              Servido no asume responsabilidad alguna por daños, perjuicios, pérdidas, negligencias, accidentes,
              conflictos o incumplimientos que deriven de la relación entre Prestadores y Clientes.
            </p>
            <p>Esto incluye (pero no se limita a):</p>
            <ul>
              <li>Mala praxis o servicios defectuosos.</li>
              <li>Incumplimiento de tiempos, condiciones o precios pactados.</li>
              <li>Accidentes en el lugar del servicio.</li>
              <li>Daños materiales o personales ocasionados por el Prestador.</li>
              <li>Estafas, robos o cualquier hecho derivado del vínculo entre usuarios en esta plataforma.</li>
            </ul>
          </InfoSection>

          <InfoSection id="evaluaciones" number={4} title="Evaluaciones y calificaciones">
            <p>La plataforma permite que los Clientes califiquen a los Prestadores luego de una operación.</p>
            <p>
              Este sistema busca brindar mayor seguridad al resto de los usuarios, pero no implica garantía sobre la
              calidad, legalidad o idoneidad del servicio ofrecido.
            </p>
            <p>Es responsabilidad del Cliente evaluar con criterio antes de contratar.</p>
          </InfoSection>

          <InfoSection id="reembolsos" number={5} title="Reembolsos e intervención de la plataforma">
            <p>
              En caso de surgir un reclamo fundado por parte de un Cliente, y si se presentan pruebas suficientes,
              Servido podrá intimar al Prestador a ofrecer una solución o reembolso.
            </p>
            <p>
              Esta medida es excepcional, queda a criterio exclusivo de la plataforma y no implica responsabilidad legal
              directa.
            </p>
          </InfoSection>

          <InfoSection id="seguros" number={6} title="Seguros y coberturas">
            <p>
              La plataforma no ofrece seguros ni coberturas ante incidentes. Se recomienda que tanto Prestadores como
              Clientes cuenten con seguros propios o acuerdos previos para respaldar su actividad en caso de imprevistos.
            </p>
          </InfoSection>

          <InfoSection id="reportes" number={7} title="Reporte de incidentes">
            <p>Los usuarios pueden reportar situaciones dentro de la app.</p>
            <p>
              Servido podrá analizar internamente los casos reportados, aplicar sanciones si corresponde, y suspender
              cuentas con denuncias reiteradas y teniendo el poder absoluto de tomar las medidas necesarias dentro de la
              plataforma.
            </p>
            <p>Esto no implica obligación legal de intervención o resolución de conflictos privados.</p>
          </InfoSection>

          <InfoSection id="relacion" number={8} title="Relación entre Usuarios">
            <p>
              Cualquier vínculo, trato o acuerdo que se genere entre Usuarios de la plataforma, ya sea de tipo comercial,
              asociativo o colaborativo, será exclusivamente responsabilidad de quienes lo celebren.
            </p>
            <p>
              Servido no forma parte de dichas relaciones ni interviene en su negociación, desarrollo o cumplimiento, y
              por lo tanto no se hace responsable por los efectos o consecuencias que de ellas se deriven.
            </p>
            <p>
              La función de Servido se limita a facilitar el contacto inicial entre partes, dentro del marco de uso de la
              plataforma.
            </p>
          </InfoSection>

          <InfoSection id="tarifas" number={9} title="Tarifas">
            <p>
              Algunos servicios de Servido pueden requerir el pago de una tarifa (por ejemplo, suscripciones mensuales
              para publicar servicios).
            </p>
            <p>Estas tarifas serán informadas claramente antes de cada contratación.</p>
            <p>Servido se reserva el derecho de actualizarlas con previo aviso.</p>
          </InfoSection>

          <InfoSection id="conducta" number={10} title="Normas de conducta y contenido">
            <p>
              Los Usuarios deberán utilizar la Plataforma con respeto, responsabilidad y conforme a la normativa vigente.
              Está estrictamente prohibido:
            </p>
            <ul>
              <li>
                Ofrecer, publicar o solicitar productos o servicios que sean ilícitos, engañosos, falsificados o que
                infrinjan derechos de terceros.
              </li>
              <li>Crear perfiles con identidades falsas, usurpar datos ajenos o brindar información incorrecta.</li>
              <li>
                Manipular valoraciones, reseñas o sistemas de reputación mediante el uso de cuentas múltiples u otras
                prácticas desleales.
              </li>
              <li>
                Compartir contenido ofensivo, amenazante, discriminatorio, fraudulento o que promueva la violencia o el
                odio.
              </li>
              <li>
                Promocionar, solicitar u ofrecer servicios de índole sexual, así como compartir material sexual o
                erótico, incluso en imágenes.
              </li>
              <li>
                Publicar imágenes de menores de edad salvo en contextos familiares, educativos o institucionales
                debidamente justificados y autorizados legalmente.
              </li>
            </ul>
            <p>
              El incumplimiento de estas disposiciones podrá resultar en la suspensión temporal o eliminación permanente
              de la cuenta del Usuario, sin necesidad de previo aviso.
            </p>
            <p>
              Asimismo, en caso de que un producto recibido por el Usuario no se corresponda con lo acordado (ya sea por
              estar dañado, ser erróneo o por error del proveedor), podrá solicitar un reembolso, el cual será gestionado
              por Servido sin costo adicional para el Usuario.
            </p>
          </InfoSection>

          <InfoSection id="sanciones" number={11} title="Sanciones">
            <p>
              El incumplimiento de estos términos podrá derivar en advertencias, suspensión o eliminación definitiva de la
              cuenta del usuario, sin necesidad de previo aviso ni derecho a ningún tipo de reclamos legales.
            </p>
          </InfoSection>

          <InfoSection id="indemnidad" number={12} title="Indemnidad">
            <p>
              El Usuario se compromete a mantener indemne y a liberar de toda responsabilidad a Servido, así como a sus
              directivos, empleados, representantes y colaboradores, frente a cualquier reclamo, demanda, daño, perjuicio,
              sanción, multa, gasto (incluidos los honorarios legales) o responsabilidad de cualquier tipo, iniciado por
              terceros como consecuencia de su actividad en la Plataforma, el contenido que publique, los servicios que
              ofrezca o contrate, o cualquier incumplimiento de estos Términos y Condiciones o de las leyes aplicables.
            </p>
            <p>
              Una vez realizada la compra, Servido retendrá el dinero hasta que el producto llegue a manos de quien lo
              solicitó, o en su defecto, pedir la devolución del dinero correspondiente. Es por eso que frente a esto,
              Servido será el encargado de evaluar y distribuir los servicios anunciados sean concretados, y los productos
              solicitados sean entregados de manera correcta.
            </p>
          </InfoSection>

          <InfoSection id="contacto" number={13} title="Medios de Contacto Oficiales">
            <p>
              La única vía oficial de comunicación y contacto con Servido es a través de los canales habilitados dentro de
              nuestra plataforma o los que se encuentren expresamente publicados en ella.
            </p>
            <p>
              Servido cuenta con un equipo de trabajo identificado debidamente con credenciales y perfiles oficiales que
              incluyen distintivos verificables de la plataforma.
            </p>
            <p>
              Ante cualquier situación irregular, sospechosa o que genere dudas, el Usuario deberá comunicarse
              exclusivamente con los puntos de contacto indicados en la Plataforma. Cualquier interacción por fuera de
              estos medios no será considerada oficial, y Servido no se responsabiliza por daños, perjuicios o fraudes
              derivados de comunicaciones realizadas a través de canales no autorizados.
            </p>
          </InfoSection>

          <InfoSection id="aceptacion" number={14} title="Aceptación">
            <p>
              El uso de la Plataforma implica la aceptación expresa de estos Términos y Condiciones por parte de todos los
              usuarios (Prestadores y Clientes), quienes declaran haber leído, comprendido y aceptado lo aquí expuesto.
            </p>
            <p>
              Al registrarte en Servido confirmás que aceptás estos términos. Podés revisar también nuestras{" "}
              <Link
                href="/politicas-de-privacidad"
                className="font-medium text-purple-900 underline-offset-2 hover:underline"
              >
                políticas de privacidad
              </Link>
              .
            </p>
          </InfoSection>

          <InfoCtaCard
            icon={Scale}
            title="¿Tenés dudas?"
            description="Si necesitás más información sobre el uso de la plataforma, contactanos por los canales oficiales o conocé más sobre Servido."
            primaryLabel="Quiénes somos"
            primaryHref="/acerca-de-nosotros"
            secondaryLabel="Crear cuenta"
            secondaryHref="/signup"
          />
        </div>
      </div>
    </InfoPageShell>
  )
}
