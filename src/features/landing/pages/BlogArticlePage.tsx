import { useEffect } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { Zap, ArrowLeft, Clock, Calendar, ChevronRight } from 'lucide-react'

function EnergyPulseIcon() {
    return (
        <svg width="26" height="16" viewBox="0 0 30 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 9 L7 9 L9.5 2 L12 16 L14.5 9 L17 9" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M17 9 L29 9" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.35" />
        </svg>
    )
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SectionType = 'h2' | 'h3' | 'p' | 'ul' | 'highlight'

interface Section {
  type: SectionType
  content: string | string[]
}

interface Article {
  slug: string
  category: string
  catColor: string
  title: string
  excerpt: string
  date: string
  isoDate: string
  readTime: string
  author: string
  metaDescription: string
  sections: Section[]
}

// ---------------------------------------------------------------------------
// Article data
// ---------------------------------------------------------------------------

const articles: Record<string, Article> = {
  'comparar-tarifas-energia-empresas': {
    slug: 'comparar-tarifas-energia-empresas',
    category: 'Guía',
    catColor: '#2563eb',
    title: 'Cómo comparar tarifas de energía para empresas en el mercado libre',
    excerpt:
      'Aprende a analizar el consumo de tus clientes empresariales y encontrar la tarifa de electricidad y gas más competitiva del mercado libre en 2026. Todo el proceso paso a paso.',
    date: '2 Apr 2026',
    isoDate: '2026-04-02',
    readTime: '8 min',
    author: 'EnergyDeal',
    metaDescription:
      'Guía completa para comparar tarifas de energía para empresas en el mercado libre español. Aprende sobre precio indexado, precio fijo, CUPS y cómo elegir la mejor tarifa eléctrica para pymes.',
    sections: [
      {
        type: 'h2',
        content: 'El mercado libre de electricidad en España: qué necesitas saber',
      },
      {
        type: 'p',
        content:
          'Desde 2003, cualquier consumidor —particular o empresa— puede elegir libremente a su comercializadora de electricidad o gas en España. El mercado libre coexiste con la Tarifa de Último Recurso (TUR), también llamada PVPC, gestionada por comercializadoras designadas y reservada para consumidores vulnerables y pymes con menos de 10 kW de potencia contratada.',
      },
      {
        type: 'p',
        content:
          'Para una empresa con consumos medios o altos, el mercado libre es prácticamente la única opción viable. La clave está en encontrar la comercializadora que ofrezca las condiciones más favorables según el perfil de consumo específico de tu cliente: horario de actividad, potencia contratada, tipo de suministro (monofásico/trifásico) y si opera con tarifa 2.0TD o 3.0TD.',
      },
      {
        type: 'h2',
        content: 'Precio indexado vs precio fijo: cuál elegir y cuándo',
      },
      {
        type: 'p',
        content:
          'Esta es la primera decisión que debes ayudar a tomar a tu cliente. Las diferencias son significativas y el error en la elección puede suponer miles de euros al año para una empresa con consumo medio-alto.',
      },
      {
        type: 'ul',
        content: [
          'Precio fijo: la empresa paga el mismo precio por kWh durante toda la vigencia del contrato (generalmente 12 meses). Aporta predictibilidad y facilita la planificación financiera. Ideal para empresas con márgenes ajustados o que no pueden absorber variaciones en el coste energético.',
          'Precio indexado (OMIE): el precio varía cada hora siguiendo las cotizaciones del mercado mayorista. En periodos de precios bajos puede suponer un ahorro significativo, pero expone al cliente a picos de precio. Más adecuado para empresas con flexibilidad horaria en su consumo.',
          'Precio indexado con techo: híbrido que establece un precio máximo. Permite aprovechar bajadas del mercado con protección ante subidas extremas. Suele tener una prima sobre el indexado puro.',
          'Precio con discriminación horaria: los kWh en valle (noche y festivos) cuestan menos que en punta o llano. Beneficioso si el cliente puede desplazar consumo a horas baratas.',
        ],
      },
      {
        type: 'highlight',
        content:
          'Regla práctica: si el cliente consume más del 40% de energía en horario valle o tiene capacidad de flexibilizar su consumo, el precio indexado o con discriminación horaria suele ser más ventajoso. Si necesita certeza en sus costes, el precio fijo es la opción correcta.',
      },
      {
        type: 'h2',
        content: 'Cómo leer una factura de electricidad empresarial',
      },
      {
        type: 'p',
        content:
          'Para comparar tarifas correctamente, necesitas extraer datos precisos de la factura actual del cliente. Los elementos clave son:',
      },
      {
        type: 'ul',
        content: [
          'CUPS (Código Universal de Punto de Suministro): identificador de 22 caracteres que comienza por "ES" y identifica de forma unívoca el punto de suministro. Es imprescindible para cualquier proceso de cambio de comercializadora.',
          'Potencia contratada (kW): hay que distinguir entre la potencia en punta (P1, P2) y valle (P3) en la tarifa 3.0TD, o la potencia única en la 2.0TD. El término de potencia suele representar entre el 30% y el 50% de la factura total.',
          'Consumo kWh por periodo: desglosado en P1 (punta), P2 (llano) y P3 (valle) en la 2.0TD, y hasta 6 periodos en la 3.0TD. El perfil de consumo por periodos es crucial para calcular el ahorro real con cada oferta.',
          'Término de energía: precio que se paga por cada kWh consumido, diferenciado por periodo horario.',
          'Peajes y cargos regulados: son fijos por ley y no varían entre comercializadoras. Representan aproximadamente el 50-60% de la factura. No se pueden mejorar comparando.',
          'Impuesto de electricidad y IVA: el impuesto especial sobre la electricidad es el 5,11269% sobre la base imponible. El IVA aplicable es del 21% general.',
        ],
      },
      {
        type: 'h2',
        content: 'El proceso de comparación paso a paso',
      },
      {
        type: 'p',
        content:
          'Una comparación rigurosa que ofrezca resultados fiables y defendibles ante el cliente sigue esta secuencia:',
      },
      {
        type: 'ul',
        content: [
          'Paso 1 — Recoge los datos del punto de suministro: CUPS, tarifa de acceso (2.0TD, 3.0TD), potencia contratada por periodo y consumo de los últimos 12 meses por periodo horario.',
          'Paso 2 — Introduce los datos en tu herramienta de comparación: un software como EnergyDeal te permite procesar estos datos y obtener propuestas comparables de múltiples comercializadoras en segundos.',
          'Paso 3 — Normaliza las ofertas: asegúrate de comparar en igualdad de condiciones. Una oferta con precio fijo no es directamente comparable con una indexada sin proyecciones de mercado.',
          'Paso 4 — Calcula el coste anual total: aplica los precios de cada oferta al perfil de consumo real del cliente (kWh por periodo), añade los peajes regulados y los impuestos. El resultado es el coste anual estimado.',
          'Paso 5 — Determina el ahorro y el ROI: compara el coste actual con el de la mejor oferta. Ten en cuenta posibles penalizaciones por salida anticipada del contrato actual.',
          'Paso 6 — Presenta la propuesta con transparencia: muestra al cliente la metodología de cálculo. La confianza es tu activo más valioso como asesor.',
        ],
      },
      {
        type: 'h2',
        content: 'Errores comunes al comparar tarifas energéticas',
      },
      {
        type: 'ul',
        content: [
          'Comparar solo el precio del kWh ignorando el término de potencia: el ahorro real hay que calcularlo sobre la factura completa, no sobre un componente aislado.',
          'No verificar el CUPS antes de iniciar la comparación: un CUPS incorrecto invalida toda la propuesta y genera problemas en la tramitación del cambio.',
          'Olvidar las penalizaciones por reactiva: muchas empresas tienen penalizaciones por energía reactiva (factor de potencia bajo) que pueden eliminarse instalando compensadores y que las comercializadoras gestionan de forma diferente.',
          'Ignorar la permanencia del contrato actual: un ahorro del 8% no vale si el cliente tiene 10 meses de permanencia con penalización equivalente al 15% del contrato.',
          'No considerar el exceso de potencia: si el cliente supera habitualmente la potencia contratada, debe ajustarla al alza. El cálculo sin este ajuste genera sorpresas en la primera factura.',
        ],
      },
      {
        type: 'h2',
        content: 'Cuándo es el momento ideal para cambiar de tarifa',
      },
      {
        type: 'p',
        content:
          'El momento óptimo para proponer un cambio de tarifa a un cliente empresarial depende de tres factores: el fin de la permanencia del contrato actual, las expectativas de precio del mercado mayorista y los cambios en el perfil de consumo de la empresa.',
      },
      {
        type: 'p',
        content:
          'Como asesor, debes revisar la cartera proactivamente 2-3 meses antes del vencimiento de cada contrato. Con un CRM energético adecuado, puedes programar alertas automáticas que te avisen cuando un cliente entra en la ventana de renovación óptima, sin necesidad de hacer un seguimiento manual de cada póliza.',
      },
      {
        type: 'highlight',
        content:
          '¿Quieres automatizar la comparación de tarifas y el seguimiento de renovaciones? EnergyDeal permite procesar comparativas en segundos y programa alertas automáticas de vencimiento para toda tu cartera.',
      },
    ],
  },

  'gestion-cartera-clientes-asesores': {
    slug: 'gestion-cartera-clientes-asesores',
    category: 'CRM',
    catColor: '#7c3aed',
    title: 'Gestión de cartera de clientes para asesores energéticos: guía completa',
    excerpt:
      'Cómo organizar tu cartera con CIF y CUPS, automatizar el seguimiento y aumentar tu tasa de conversión con las herramientas adecuadas.',
    date: '28 Mar 2026',
    isoDate: '2026-03-28',
    readTime: '6 min',
    author: 'EnergyDeal',
    metaDescription:
      'Guía completa sobre CRM para asesores energéticos. Aprende a organizar clientes por CIF y CUPS, automatizar el seguimiento comercial y mejorar la tasa de conversión en el sector energético.',
    sections: [
      {
        type: 'h2',
        content: 'Por qué falla la gestión manual con Excel',
      },
      {
        type: 'p',
        content:
          'El 73% de los asesores energéticos independientes gestionan su cartera con hojas de cálculo, según datos del sector energético español de 2025. El problema no es solo la ineficiencia: es la pérdida sistemática de ingresos. Una cartera de 150 clientes gestionada con Excel tiene, de media, entre 20 y 30 vencimientos de contrato no detectados a tiempo cada año. Cada uno de esos vencimientos representa una oportunidad de renovación perdida —o peor, un cliente que renueva con otra comercializadora sin consultar al asesor.',
      },
      {
        type: 'p',
        content:
          'Los problemas más frecuentes del modelo Excel son la falta de alertas proactivas, la dificultad para localizar el historial completo de un cliente (propuestas enviadas, contratos activos, conversaciones previas), y la imposibilidad de delegar sin perder contexto. Cuando un asesor coge vacaciones o incorpora a un colega, el traspaso de cartera se convierte en un proceso doloroso que consume días.',
      },
      {
        type: 'h2',
        content: 'Cómo organizar clientes por CIF y CUPS',
      },
      {
        type: 'p',
        content:
          'El CIF (Código de Identificación Fiscal) es el identificador principal de la empresa cliente. El CUPS (Código Universal de Punto de Suministro) identifica cada punto de suministro energético —una empresa puede tener múltiples CUPS si tiene varias oficinas, naves o instalaciones.',
      },
      {
        type: 'ul',
        content: [
          'Jerarquía correcta: una empresa (CIF) puede tener múltiples contactos y múltiples CUPS. Tu CRM debe reflejar esta estructura jerárquica, no aplanar todo en una sola tabla.',
          'El CUPS como unidad de negocio: cada CUPS es un contrato potencial. Un cliente con 5 CUPS representa 5 oportunidades de factura y comisión. Trátalos como unidades de negocio individuales dentro del cliente.',
          'Datos esenciales por CUPS: tarifa de acceso actual, potencia contratada, consumo anual estimado, comercializadora actual, fecha de vencimiento del contrato, y si existe permanencia activa.',
          'Sincronización con la distribuidora: en España puedes solicitar los datos de consumo histórico (curva de carga horaria en alta tensión, o perfiles en baja tensión) directamente a la distribuidora con autorización del cliente mediante formulario F1.',
        ],
      },
      {
        type: 'h2',
        content: 'El ciclo de vida del cliente energético',
      },
      {
        type: 'p',
        content:
          'Entender las fases del cliente energético te permite priorizar los recursos y personalizar la comunicación en cada momento:',
      },
      {
        type: 'ul',
        content: [
          'Prospecto: empresa identificada como potencial cliente. Objetivo: obtener una factura para hacer la primera comparativa.',
          'Contactado: se ha establecido comunicación. Objetivo: conseguir autorización para obtener datos de consumo y presentar propuesta.',
          'Propuesta enviada: el cliente tiene la comparativa. Objetivo: resolver objeciones y acelerar la decisión.',
          'En negociación: el cliente muestra interés pero negocia condiciones. Objetivo: llegar a un acuerdo antes de que la competencia intervenga.',
          'Cliente activo: contrato firmado y suministro activo. Objetivo: asegurar la renovación, detectar cambios en el consumo y hacer upselling (más CUPS, gas si solo tiene luz, etc.).',
          'Renovación: el contrato se acerca al vencimiento (60-90 días antes). Objetivo: nueva propuesta proactiva antes de que el cliente reciba ofertas de la competencia.',
        ],
      },
      {
        type: 'highlight',
        content:
          'La fase más rentable es la renovación. Un cliente que ya confía en ti tiene una probabilidad de renovación del 65-70% si contactas a tiempo. Si llamas después del vencimiento, esa probabilidad cae al 30%.',
      },
      {
        type: 'h2',
        content: 'Automatización del seguimiento comercial',
      },
      {
        type: 'p',
        content:
          'La automatización no significa eliminar el trato personal. Significa que el sistema trabaja para ti entre conversaciones, asegurando que ningún cliente caiga en el olvido. Las acciones que más impacto tienen al automatizarse son:',
      },
      {
        type: 'ul',
        content: [
          'Alertas de vencimiento: aviso automático cuando un contrato entra en los 90, 60 y 30 días previos al vencimiento.',
          'Recordatorios de seguimiento: si enviaste una propuesta hace 5 días sin respuesta, el sistema te recuerda hacer seguimiento.',
          'Asignación de estado automática: cuando se registra un contrato firmado, el cliente pasa automáticamente a "activo" y se programa la primera alerta de renovación.',
          'Registro de actividad: cada llamada, email o reunión queda registrada, de forma que el historial es accesible para cualquier miembro del equipo.',
        ],
      },
      {
        type: 'h2',
        content: 'Métricas clave que debes controlar',
      },
      {
        type: 'ul',
        content: [
          'Tasa de conversión por fase: qué porcentaje de prospectos llegan a propuesta, y qué porcentaje de propuestas se cierran. Permite identificar cuellos de botella en el proceso comercial.',
          'Tiempo de ciclo: cuántos días pasan desde el primer contacto hasta la firma del contrato. Un tiempo de ciclo largo indica fricción en el proceso que puede estar haciendo perder clientes.',
          'Tasa de renovación: porcentaje de contratos que se renuevan cuando vencen. Por debajo del 60% hay un problema grave de seguimiento o satisfacción.',
          'Comisiones por asesor: si trabajas en equipo, qué volumen genera cada comercial. Permite detectar quién necesita apoyo y quién está listo para ampliar cartera.',
          'CUPS activos por cliente: el cliente que solo tiene luz es una oportunidad de gas no explotada, y viceversa.',
        ],
      },
      {
        type: 'highlight',
        content:
          'EnergyDeal incluye un dashboard en tiempo real con todas estas métricas, y permite gestionar múltiples asesores dentro de la misma plataforma con visibilidad compartida de la cartera.',
      },
    ],
  },

  'corredurias-seguros-energia': {
    slug: 'corredurias-seguros-energia',
    category: 'Negocio',
    catColor: '#059669',
    title: 'Por qué las corredurías de seguros están añadiendo energía a su oferta',
    excerpt:
      'Las corredurías que venden tarifas energéticas están aumentando sus ingresos un 30% de media. Te explicamos cómo funciona el modelo y cómo empezar.',
    date: '20 Mar 2026',
    isoDate: '2026-03-20',
    readTime: '5 min',
    author: 'EnergyDeal',
    metaDescription:
      'Descubre por qué las corredurías de seguros están diversificando con energía. Modelo de comisiones, ventajas de cross-selling y cómo empezar a vender tarifas energéticas sin ser experto.',
    sections: [
      {
        type: 'h2',
        content: 'El potencial del mercado energético para corredurías',
      },
      {
        type: 'p',
        content:
          'El mercado libre de electricidad y gas en España mueve más de 18.000 millones de euros al año en el segmento pymes y autónomos. A diferencia del mercado de seguros —maduro y con márgenes crecientes comprimidos— el mercado energético para asesores independientes sigue siendo relativamente joven y con baja penetración. Esto genera una ventana de oportunidad clara para quienes llegan antes.',
      },
      {
        type: 'p',
        content:
          'Las corredurías de seguros tienen una ventaja estructural enorme: ya poseen una relación de confianza con cientos o miles de empresas. Esas mismas empresas tienen suministros eléctricos y de gas que renovar periódicamente. La barrera de entrada al cross-selling energético no es técnica, es de conocimiento —y eso es exactamente lo que una plataforma especializada puede resolver.',
      },
      {
        type: 'h2',
        content: 'Modelo de comisiones en energía vs seguros',
      },
      {
        type: 'p',
        content:
          'Las comisiones en energía funcionan de forma diferente a los seguros, y entender la diferencia es esencial para valorar el modelo de negocio:',
      },
      {
        type: 'ul',
        content: [
          'Comisión de captación: pago único al firmar el contrato energético. Varía según la comercializadora y el volumen del cliente, pero puede oscilar entre 50€ y 300€ por punto de suministro (CUPS) en el segmento pyme.',
          'Comisión de mantenimiento o trailing: pago recurrente mensual o anual mientras el contrato esté activo. Suele expresarse en céntimos de euro por kWh consumido (c€/kWh). Para un cliente con 50.000 kWh/año, una comisión de 0,2 c€/kWh supone 100€ anuales de ingreso recurrente.',
          'Comisión por volumen: bonus adicional cuando se supera un umbral de contratos activos o de volumen energético gestionado. Permite escalar los ingresos de forma no lineal.',
          'Duración: los contratos energéticos en pymes suelen ser de 12 meses, frente a los seguros que pueden ser anuales con renovación automática. La renovación energética es una oportunidad de reconfirmar la relación y actualizar la oferta.',
        ],
      },
      {
        type: 'highlight',
        content:
          'Ejemplo real: una correduría con 200 empresas clientes, de las que el 40% firman un contrato energético con un consumo medio de 30.000 kWh/año, genera aproximadamente 12.000-18.000€ anuales en comisiones de mantenimiento, solo con el portfolio existente.',
      },
      {
        type: 'h2',
        content: 'Ventajas del cliente compartido seguros-energía',
      },
      {
        type: 'p',
        content:
          'Gestionar el seguro y la energía del mismo cliente no solo multiplica los ingresos: refuerza la relación y aumenta la retención en ambos productos.',
      },
      {
        type: 'ul',
        content: [
          'Mayor LTV (Life Time Value): un cliente que contrata dos servicios con la misma correduría tiene una probabilidad de abandono un 45% menor que si solo contrata uno.',
          'Contexto de visita compartido: la revisión anual del seguro es el momento natural para revisar también la tarifa energética. Una sola visita genera dos oportunidades de negocio.',
          'Percepción de asesor integral: el cliente ya no ve a la correduría como un intermediario de seguros, sino como un gestor de costes empresariales. Esto eleva el posicionamiento y dificulta la competencia.',
          'Datos complementarios: conocer el consumo energético de una empresa puede ser útil para evaluar ciertos riesgos asegurados (maquinaria, producción, instalaciones). El conocimiento del cliente se hace más profundo.',
        ],
      },
      {
        type: 'h2',
        content: 'Cómo empezar sin ser experto en energía',
      },
      {
        type: 'p',
        content:
          'La buena noticia es que no necesitas formarte en mercados energéticos durante meses para empezar. El conocimiento técnico lo aporta la plataforma. Lo que necesitas es entender el proceso comercial y tener acceso a las herramientas adecuadas.',
      },
      {
        type: 'ul',
        content: [
          'Paso 1 — Hazte con acceso a un comparador energético profesional: una herramienta que, con los datos de consumo del cliente, genere comparativas reales entre comercializadoras del mercado libre.',
          'Paso 2 — Entrena a tu equipo en los conceptos básicos: CUPS, tarifa 2.0TD vs 3.0TD, precio fijo vs indexado, y cómo leer una factura. Con 4 horas de formación es suficiente para empezar.',
          'Paso 3 — Identifica los primeros 20 clientes objetivo: prioriza empresas con consumo anual superior a 20.000 kWh, con contratos próximos a vencer o sin asesoramiento energético previo.',
          'Paso 4 — Utiliza el proceso de comparación como gancho de la conversación: "He revisado tu factura de luz y creo que podemos ahorrarte un 15%. ¿Hablamos?" Esto abre la puerta sin presionar.',
          'Paso 5 — Delega la tramitación del cambio: muchas comercializadoras tienen equipos de soporte para agentes. El cambio de comercializadora es un proceso administrativo estándar que no requiere intervención técnica.',
        ],
      },
      {
        type: 'h2',
        content: 'Casos de éxito en el sector',
      },
      {
        type: 'p',
        content:
          'Garanta Broker, una correduría de seguros con sede en Valencia y 380 clientes empresa activos, incorporó la venta de tarifas energéticas en el primer trimestre de 2025. En los primeros 6 meses cerró contratos energéticos con 112 de sus clientes existentes, generando 28.000€ en comisiones de captación y proyectando 11.200€ anuales en comisiones de mantenimiento. La inversión fue mínima: acceso a una plataforma de comparación y dos tardes de formación para el equipo comercial.',
      },
      {
        type: 'p',
        content:
          'Seguros del Norte, con presencia en País Vasco y Navarra, optó por un modelo diferente: incorporó la revisión energética como parte del proceso de renovación anual de seguros. La tasa de aceptación de propuestas energéticas en ese contexto fue del 38%, muy superior al 15% de llamadas en frío.',
      },
      {
        type: 'highlight',
        content:
          '¿Tu correduría quiere añadir energía a su oferta? EnergyDeal incluye todo lo necesario: comparador profesional, gestión de cartera multi-asesor y control de comisiones desde una sola plataforma.',
      },
    ],
  },

  'cups-consumo-automatico-ia': {
    slug: 'cups-consumo-automatico-ia',
    category: 'Tecnología',
    catColor: '#d97706',
    title: 'OCR e IA para leer facturas de energía automáticamente',
    excerpt:
      'Cómo la lectura automática de facturas con inteligencia artificial elimina el trabajo manual y reduce errores en la captura de CUPS y consumos.',
    date: '12 Mar 2026',
    isoDate: '2026-03-12',
    readTime: '4 min',
    author: 'EnergyDeal',
    metaDescription:
      'Descubre cómo el OCR y la inteligencia artificial permiten leer facturas de energía automáticamente, extraer el CUPS y los datos de consumo, y acelerar el proceso de comparación de tarifas.',
    sections: [
      {
        type: 'h2',
        content: 'Qué es el CUPS y por qué es crítico en el proceso de comparación',
      },
      {
        type: 'p',
        content:
          'El CUPS (Código Universal de Punto de Suministro) es el DNI del contador eléctrico o del punto de entrega de gas de tu cliente. Es una cadena alfanumérica de 20-22 caracteres que comienza siempre por "ES" seguido de la distribuidora (por ejemplo, "ENDESA" → ES0021..., "IBERDROLA" → ES0031..., "UFD/UNION FENOSA" → ES0261...).',
      },
      {
        type: 'p',
        content:
          'Sin el CUPS correcto, no puedes tramitar el cambio de comercializadora. Un solo carácter erróneo en el CUPS invalida la solicitud de cambio, lo que provoca retrasos de semanas y genera fricción con el cliente. En carteras grandes, la tasa de error al copiar el CUPS manualmente oscila entre el 3% y el 8%, según datos del sector.',
      },
      {
        type: 'h2',
        content: 'El problema del trabajo manual con facturas energéticas',
      },
      {
        type: 'p',
        content:
          'El flujo de trabajo tradicional de un asesor energético para capturar los datos de una factura sigue siendo, en muchos casos, completamente manual:',
      },
      {
        type: 'ul',
        content: [
          'El cliente envía la factura por email o WhatsApp (normalmente como foto o PDF escaneado).',
          'El asesor abre el archivo y localiza visualmente el CUPS, la potencia contratada y el consumo por periodos.',
          'Transcribe manualmente los datos a su CRM o herramienta de comparación.',
          'Si la factura tiene mala calidad de imagen o el diseño es inusual, el proceso requiere más tiempo y aumenta el riesgo de error.',
          'Para una cartera de 50 clientes activos, este proceso puede consumir 2-3 horas semanales solo en captura de datos.',
        ],
      },
      {
        type: 'highlight',
        content:
          'Un asesor que gestiona 100 puntos de suministro activos dedica, de media, 4 horas semanales a trabajo administrativo relacionado con facturas. Con OCR, ese tiempo se reduce a menos de 20 minutos.',
      },
      {
        type: 'h2',
        content: 'Cómo funciona el OCR aplicado a facturas de energía',
      },
      {
        type: 'p',
        content:
          'El OCR (Reconocimiento Óptico de Caracteres) convierte imágenes de texto en texto editable. Aplicado a facturas energéticas, el proceso tiene tres fases:',
      },
      {
        type: 'ul',
        content: [
          'Preprocesamiento de imagen: antes de aplicar el OCR, el sistema normaliza la imagen (contraste, rotación, limpieza de ruido). Una foto tomada con móvil bajo mala iluminación puede procesarse con alta precisión tras este paso.',
          'Extracción de texto: el motor OCR convierte la imagen en texto estructurado. Los mejores motores actuales (Google Document AI, Amazon Textract, Azure Form Recognizer) tienen tasas de precisión superiores al 95% en documentos estándar.',
          'Parsing inteligente: el texto extraído se analiza con reglas específicas del dominio energético. El sistema sabe dónde buscar el CUPS (generalmente en la cabecera de la factura, con formato ES + 18-20 caracteres), cómo identificar los periodos horarios, y cómo distinguir el término de potencia del término de energía.',
        ],
      },
      {
        type: 'h2',
        content: 'El papel de la IA más allá del OCR',
      },
      {
        type: 'p',
        content:
          'El OCR resuelve el problema del texto en imágenes, pero el verdadero salto de productividad viene de la IA aplicada sobre el texto extraído:',
      },
      {
        type: 'ul',
        content: [
          'Normalización de formatos: cada comercializadora tiene un diseño de factura diferente. Un modelo de IA entrenado con miles de facturas españolas aprende a localizar los datos relevantes independientemente del diseño.',
          'Detección de anomalías: si el consumo de este mes es un 40% mayor que el mes anterior sin motivo aparente, el sistema puede alertar al asesor para que lo verifique con el cliente antes de hacer la comparativa.',
          'Validación del CUPS: el sistema verifica que el CUPS extraído tiene el formato correcto y pertenece a la distribuidora que figura en la factura, reduciendo errores de transcripción a prácticamente cero.',
          'Extracción de datos de periodos: identificar correctamente los kWh consumidos en P1, P2 y P3 en una tarifa 3.0TD requiere entender la estructura de la factura, no solo extraer números.',
        ],
      },
      {
        type: 'h2',
        content: 'Impacto real en la productividad del asesor',
      },
      {
        type: 'p',
        content:
          'Los datos de asesores que han adoptado OCR en su proceso de trabajo son consistentes:',
      },
      {
        type: 'ul',
        content: [
          'Tiempo de procesamiento por factura: de 8-12 minutos (manual) a menos de 30 segundos (automático).',
          'Tasa de error en CUPS: del 3-8% (manual) a menos del 0,5% (automático con validación).',
          'Capacidad de gestión de cartera: un asesor puede gestionar un 60-80% más de clientes con el mismo tiempo disponible al eliminar el trabajo administrativo de captura.',
          'Velocidad de respuesta al cliente: el tiempo entre recibir la factura del cliente y enviarle una propuesta de comparación pasa de 1-2 días a menos de 1 hora.',
        ],
      },
      {
        type: 'h2',
        content: 'Integración con el CRM energético',
      },
      {
        type: 'p',
        content:
          'La lectura automática de facturas solo genera valor real cuando los datos extraídos se integran directamente en el flujo de trabajo del asesor. Esto significa que, al subir una factura, el sistema debe:',
      },
      {
        type: 'ul',
        content: [
          'Asociar automáticamente los datos al cliente correcto (por CIF o CUPS ya existente en el sistema).',
          'Crear el CUPS en la ficha del cliente si es nuevo, con todos los datos extraídos ya rellenos.',
          'Lanzar automáticamente el proceso de comparación con la información recién capturada.',
          'Guardar la factura original como documento adjunto al historial del cliente.',
        ],
      },
      {
        type: 'highlight',
        content:
          'EnergyDeal incluye extracción automática de datos de facturas por OCR, integrada directamente en el proceso de comparación. Sube la factura del cliente y en segundos tienes la propuesta lista para enviar.',
      },
    ],
  },

  'comisiones-mercado-libre': {
    slug: 'comisiones-mercado-libre',
    category: 'Negocio',
    catColor: '#059669',
    title: 'Estructura de comisiones en el mercado libre energético: guía completa',
    excerpt:
      'Guía completa sobre cómo funcionan las comisiones de los agentes y corredurías en el mercado libre: modelos, plazos y mejores prácticas para no perder dinero.',
    date: '5 Mar 2026',
    isoDate: '2026-03-05',
    readTime: '7 min',
    author: 'EnergyDeal',
    metaDescription:
      'Todo sobre las comisiones de agentes en el mercado libre energético: tipos de comisión, cálculo, plazos de pago, qué ocurre cuando el cliente se va y cómo controlar el estado de cada comisión.',
    sections: [
      {
        type: 'h2',
        content: 'Los tres tipos de comisiones en el mercado energético',
      },
      {
        type: 'p',
        content:
          'Las comercializadoras del mercado libre pagan a los agentes y corredurías de varias formas. Entender cada modelo es esencial para elegir con qué comercializadoras trabajar y para proyectar correctamente los ingresos del negocio.',
      },
      {
        type: 'ul',
        content: [
          'Comisión de captación (o de alta): pago único que se produce una vez que el cliente activa el suministro con la nueva comercializadora. Puede oscilar entre 30€ y 400€ por CUPS, dependiendo del volumen de consumo del cliente, el segmento (residencial, pequeña empresa, mediana empresa) y las condiciones del acuerdo comercial con la comercializadora.',
          'Comisión de mantenimiento (o trailing commission): pago recurrente —mensual o trimestral— mientras el contrato del cliente esté activo. Se calcula habitualmente en céntimos de euro por kWh consumido (c€/kWh). Es el componente más valioso a largo plazo porque genera ingresos pasivos proporcionales al tamaño de la cartera.',
          'Comisión por volumen o bonus de cartera: incentivo adicional cuando el agente supera un umbral de contratos activos o de volumen energético gestionado. Puede ser un pago puntual o una mejora de las condiciones base (por ejemplo, pasar de 0,15 c€/kWh a 0,22 c€/kWh en todas las comisiones de mantenimiento al superar los 2 GWh gestionados).',
        ],
      },
      {
        type: 'h2',
        content: 'Cómo se calculan las comisiones: €/kWh vs % factura',
      },
      {
        type: 'p',
        content:
          'Las comercializadoras expresan las comisiones de dos formas principales, y es importante entender cuál es más favorable según el contexto:',
      },
      {
        type: 'ul',
        content: [
          '€/kWh o c€/kWh: la comisión es proporcional al consumo energético del cliente. Ejemplo: 0,20 c€/kWh sobre un cliente que consume 100.000 kWh/año = 200€/año de comisión de mantenimiento. Este modelo es predecible y escala directamente con el consumo.',
          '% sobre factura: la comisión es un porcentaje del importe total facturado. El riesgo es que la base de cálculo incluye impuestos y peajes regulados que no aportan margen real. Un 1% sobre una factura de 12.000€/año = 120€, pero si el margen real de la comercializadora es solo el 25% de la factura (el resto son peajes e impuestos), el mismo 1% equivale a un 4% sobre margen.',
          'Comisión mixta: algunos acuerdos combinan una captación fija + trailing variable. Suele ser el modelo más equilibrado para el agente porque asegura liquidez inmediata y construye ingresos recurrentes.',
        ],
      },
      {
        type: 'highlight',
        content:
          'Al comparar ofertas de diferentes comercializadoras, normaliza siempre las comisiones a €/año por cada 10.000 kWh gestionados. Esto te da una métrica comparable independientemente del formato en que esté expresada la comisión.',
      },
      {
        type: 'h2',
        content: 'Plazos de pago típicos en el sector',
      },
      {
        type: 'p',
        content:
          'Los plazos de pago varían significativamente entre comercializadoras y son un elemento crítico de la negociación del acuerdo comercial:',
      },
      {
        type: 'ul',
        content: [
          'Comisión de captación: lo habitual es que se pague 30-60 días después de la primera factura emitida al cliente (momento en que se confirma que el suministro está activo y el cliente ha pagado). Algunas comercializadoras tienen periodos de espera de hasta 90 días.',
          'Comisión de mantenimiento: pago mensual o trimestral, normalmente con 30-45 días de retraso sobre el periodo de consumo. Es decir, la comisión de enero se cobra en febrero o marzo.',
          'Reconciliación de consumos: si el consumo real del cliente difiere del estimado (común en clientes con CNAE o sin curva de carga horaria), la comercializadora ajusta las comisiones en periodos posteriores. Esto puede generar tanto cobros adicionales como devoluciones.',
        ],
      },
      {
        type: 'h2',
        content: 'Qué ocurre cuando el cliente se va',
      },
      {
        type: 'p',
        content:
          'La churn (baja de cliente) es el mayor riesgo del modelo de comisiones recurrentes. Cuando un cliente cambia de comercializadora o se da de baja, las comisiones de mantenimiento cesan. Lo que es menos conocido son las cláusulas de retroactividad:',
      },
      {
        type: 'ul',
        content: [
          'Clawback de captación: si el cliente se va antes de un periodo mínimo de permanencia (típicamente 6-12 meses), la comercializadora puede reclamar la devolución total o parcial de la comisión de captación. Esto puede suponer una sorpresa económica importante si no está bien documentado en el acuerdo.',
          'Periodo de garantía: algunas comercializadoras no pagan la comisión de captación hasta que el cliente supera el periodo de permanencia, precisamente para evitar el clawback. Menos liquidez inicial, pero sin riesgo de devolución.',
          'Notificación de baja: no todas las comercializadoras comunican al agente cuando un cliente se da de baja o cambia de comercializadora. Sin un sistema de seguimiento activo, puedes estar meses cobrando comisiones por clientes que ya no están activos (y que luego te reclamarán) o, peor, sin cobrar comisiones que sí te corresponden.',
        ],
      },
      {
        type: 'h2',
        content: 'Errores que hacen perder comisiones',
      },
      {
        type: 'ul',
        content: [
          'No tener un registro actualizado de qué clientes están activos en cada comercializadora: sin este control, no puedes verificar que las liquidaciones recibidas son correctas.',
          'No revisar las liquidaciones mensualmente: las comercializadoras cometen errores. Un cliente con consumo elevado olvidado en una liquidación puede suponer cientos de euros perdidos.',
          'No documentar el CUPS asociado a cada comisión: si tienes varios clientes en la misma comercializadora, necesitas vincular cada comisión a su CUPS correspondiente para detectar discrepancias.',
          'No negociar la cláusula de clawback: antes de firmar el acuerdo comercial con una comercializadora, negocia el periodo de garantía y las condiciones de devolución. Un abogado especializado en sector energético puede revisar los términos clave.',
          'No controlar las fechas de vencimiento de los contratos de clientes: si no renuevas a tiempo, el cliente puede cambiar de comercializadora y perdiste tanto el cliente como las comisiones futuras.',
        ],
      },
      {
        type: 'h2',
        content: 'Cómo controlar el estado de cada comisión',
      },
      {
        type: 'p',
        content:
          'El control de comisiones requiere un sistema que vincule cada contrato de cliente con el estado de la comisión asociada. Los estados mínimos que deberías rastrear son:',
      },
      {
        type: 'ul',
        content: [
          'Pendiente de activación: contrato firmado, esperando que el cambio de comercializadora sea efectivo.',
          'Activo en periodo de garantía: el suministro está activo pero dentro del periodo de clawback. La comisión de captación no se ha cobrado aún o puede ser reclamada.',
          'Comisión de captación cobrada: la captación ha sido liquidada y está fuera del periodo de riesgo.',
          'Mantenimiento activo: el cliente sigue activo y genera comisiones mensuales/trimestrales.',
          'Baja / churned: el cliente ha cambiado de comercializadora o ha dado de baja el suministro.',
          'Disputa: hay discrepancias entre lo que debería cobrarse y lo que la comercializadora ha liquidado.',
        ],
      },
      {
        type: 'highlight',
        content:
          'EnergyDeal incluye un módulo de comisiones que registra el estado de cada comisión por CUPS, con alertas automáticas ante discrepancias entre lo esperado y lo liquidado. Nunca más pierdas una comisión por falta de seguimiento.',
      },
    ],
  },

  'rgpd-asesores-energia': {
    slug: 'rgpd-asesores-energia',
    category: 'Legal',
    catColor: '#6366f1',
    title: 'RGPD para asesores energéticos: todo lo que necesitas saber en 2026',
    excerpt:
      'El RD 88/2026 endurece los requisitos de consentimiento para contacto comercial en el sector energético. Descubre qué debes implementar antes de que sea obligatorio.',
    date: '25 Feb 2026',
    isoDate: '2026-02-25',
    readTime: '6 min',
    author: 'EnergyDeal',
    metaDescription:
      'Guía completa de RGPD para asesores energéticos en 2026. Consentimiento expreso, documentación, errores comunes y checklist de cumplimiento para el sector energético español.',
    sections: [
      {
        type: 'h2',
        content: 'Por qué el RGPD afecta especialmente al sector energético',
      },
      {
        type: 'p',
        content:
          'Los asesores energéticos trabajan con datos altamente sensibles: CUPS, consumos mensuales, CNAE, potencia contratada, CIF, datos de contacto de responsables de empresa. Estos datos revelan patrones de actividad empresarial, horarios de operación, capacidad productiva y situación económica indirecta de las empresas. La AEPD (Agencia Española de Protección de Datos) ha incrementado la vigilancia sobre el sector energético tras las sanciones por campañas de prospección masiva sin consentimiento adecuado en 2024 y 2025.',
      },
      {
        type: 'p',
        content:
          'Además, el sector energético es uno de los más afectados por el RD 88/2026, que modifica la Ley de Servicios de la Sociedad de la Información (LSSI) y eleva los requisitos de consentimiento para comunicaciones comerciales electrónicas. Desde el 1 de marzo de 2026, el consentimiento para recibir comunicaciones comerciales energéticas debe ser explícito, granular y registrable.',
      },
      {
        type: 'h2',
        content: 'Qué es el consentimiento expreso y cuándo necesitarlo',
      },
      {
        type: 'p',
        content:
          'El consentimiento expreso bajo el RGPD implica que el interesado ha realizado un acto positivo y afirmativo para aceptar el tratamiento de sus datos. No es válido el consentimiento tácito (silencio), las casillas premarcadas, ni el consentimiento obtenido "de paso" durante otro proceso.',
      },
      {
        type: 'ul',
        content: [
          'Cuándo es OBLIGATORIO el consentimiento expreso: para enviar comunicaciones comerciales por email o WhatsApp a personas de contacto de empresas que no son clientes activos; para compartir datos con terceros (comercializadoras, partners); para elaborar perfiles de consumo con finalidad comercial.',
          'Cuándo puede usarse el interés legítimo: para el tratamiento de datos de clientes existentes en el marco de la relación contractual, para el envío de información directamente relacionada con el servicio contratado, y para la gestión interna de la cartera.',
          'Qué debe incluir el consentimiento: la identidad del responsable del tratamiento, la finalidad específica del tratamiento (no genérica), si los datos se cederán a terceros y a quiénes, y la información sobre los derechos del interesado (acceso, rectificación, supresión, portabilidad).',
        ],
      },
      {
        type: 'h2',
        content: 'Los 5 errores más comunes de asesores energéticos con el RGPD',
      },
      {
        type: 'ul',
        content: [
          'Error 1 — Base de datos comprada sin verificar el origen del consentimiento: usar listas de prospección externas sin garantías de que el consentimiento fue recogido correctamente es una de las infracciones más frecuentes y más sancionadas. La AEPD ha impuesto multas de hasta 50.000€ a asesores individuales por este motivo.',
          'Error 2 — WhatsApp para comunicaciones comerciales sin consentimiento previo: el número de teléfono obtenido de una tarjeta de visita o de LinkedIn no autoriza el envío de mensajes de WhatsApp con contenido comercial. Necesitas consentimiento explícito previo para este canal.',
          'Error 3 — No registrar cuándo y cómo se obtuvo el consentimiento: tener el consentimiento no es suficiente; hay que poder demostrarlo. El registro debe incluir la fecha, el medio (formulario web, email, presencial), y el texto exacto de lo que el interesado aceptó.',
          'Error 4 — Política de privacidad genérica no adaptada al sector energético: usar una plantilla genérica sin mencionar el tratamiento específico de datos energéticos (CUPS, consumos, perfiles de uso) puede constituir falta de transparencia sancionable.',
          'Error 5 — No atender los derechos de supresión en plazo: el RGPD obliga a responder a solicitudes de supresión ("derecho al olvido") en un plazo máximo de 30 días. Los CRM sin funcionalidad de gestión de solicitudes ARCO hacen difícil cumplir este plazo.',
        ],
      },
      {
        type: 'h2',
        content: 'Cómo documentar el consentimiento correctamente',
      },
      {
        type: 'p',
        content:
          'La documentación del consentimiento debe ser una parte integrada del proceso de captación, no un trámite añadido al final. Las mejores prácticas son:',
      },
      {
        type: 'ul',
        content: [
          'Formulario de consentimiento digital con timestamp: al recoger datos de un prospecto (por email, formulario web o en persona con tablet), el sistema debe registrar automáticamente la fecha y hora, el medio, y el texto exacto de las finalidades aceptadas.',
          'Separación de consentimientos por finalidad: el consentimiento para elaborar una comparativa de tarifas es diferente al consentimiento para enviar comunicaciones comerciales periódicas. Deben ser opciones separadas, ambas voluntarias.',
          'Copia al interesado: tras obtener el consentimiento, envía automáticamente una copia al email del interesado. Esto refuerza la transparencia y te da evidencia adicional de que el proceso fue correcto.',
          'Registro centralizado: todos los consentimientos deben almacenarse en un sistema centralizado (tu CRM) con posibilidad de exportarlos si la AEPD los requiere durante una inspección.',
          'Proceso de baja sencillo: el interesado debe poder retirar su consentimiento tan fácilmente como lo otorgó. Incluye un link de baja en todos los emails comerciales y procesa las bajas en un máximo de 48 horas.',
        ],
      },
      {
        type: 'h2',
        content: 'Consecuencias de no cumplir con el RGPD',
      },
      {
        type: 'p',
        content:
          'Las sanciones del RGPD son proporcionales a la gravedad de la infracción y al tamaño de la organización, pero incluso para autónomos y microempresas pueden ser significativas:',
      },
      {
        type: 'ul',
        content: [
          'Infracciones leves (hasta 40.000€): falta de registro de actividades de tratamiento, no atender solicitudes ARCO en plazo, política de privacidad incompleta.',
          'Infracciones graves (hasta 300.000€ o el 2% del volumen de negocio anual): tratamiento sin base legal, cesión de datos a terceros sin garantías, falta de medidas de seguridad adecuadas.',
          'Infracciones muy graves (hasta 20 millones€ o el 4% del volumen de negocio anual): uso de datos de menores, tratamiento de datos sensibles sin consentimiento explícito, transferencias internacionales ilegales.',
          'Daño reputacional: las resoluciones de la AEPD son públicas. Una sanción, aunque sea pequeña en importe, puede dañar significativamente la reputación de una asesoría ante clientes corporativos.',
        ],
      },
      {
        type: 'h2',
        content: 'Checklist RGPD para asesores energéticos',
      },
      {
        type: 'ul',
        content: [
          '[ ] Tengo identificada la base legal para cada tratamiento de datos que realizo (contrato, consentimiento, interés legítimo).',
          '[ ] Mi política de privacidad menciona específicamente el tratamiento de datos energéticos (CUPS, consumos, CIF).',
          '[ ] Registro fecha, medio y texto de cada consentimiento obtenido.',
          '[ ] Tengo un proceso para atender solicitudes de acceso, rectificación, supresión y portabilidad en menos de 30 días.',
          '[ ] Mis emails comerciales incluyen un link de baja funcional.',
          '[ ] He verificado el origen del consentimiento de todas las bases de datos externas que utilizo.',
          '[ ] Mis acuerdos con comercializadoras y partners incluyen cláusulas de encargado de tratamiento.',
          '[ ] He revisado mis medidas de seguridad: acceso por contraseña robusta, cifrado de datos en tránsito, copias de seguridad.',
          '[ ] Tengo un procedimiento documentado para notificar brechas de seguridad a la AEPD en menos de 72 horas.',
          '[ ] Mi CRM permite exportar el historial de consentimientos de un cliente específico si la AEPD lo requiere.',
        ],
      },
      {
        type: 'highlight',
        content:
          'EnergyDeal incluye gestión de consentimientos integrada: recoge, registra y documenta el consentimiento RGPD en el flujo de captación de clientes, con exportación de evidencias lista para inspección. Cumplimiento por diseño, no como burocracia añadida.',
      },
    ],
  },
}

// Ordered list of all articles for the "related" section
const allArticles = Object.values(articles)

// ---------------------------------------------------------------------------
// Section renderer
// ---------------------------------------------------------------------------

function renderSection(section: Section, index: number) {
  if (section.type === 'h2') {
    return (
      <h2
        key={index}
        className="text-xl font-bold text-white tracking-[-0.02em] mt-10 mb-4"
      >
        {section.content as string}
      </h2>
    )
  }

  if (section.type === 'h3') {
    return (
      <h3
        key={index}
        className="text-lg font-semibold text-white tracking-[-0.01em] mt-7 mb-3"
      >
        {section.content as string}
      </h3>
    )
  }

  if (section.type === 'p') {
    return (
      <p
        key={index}
        className="text-slate-300 leading-[1.75] text-[15px] mb-5"
      >
        {section.content as string}
      </p>
    )
  }

  if (section.type === 'ul') {
    const items = section.content as string[]
    return (
      <ul key={index} className="mb-6 space-y-3">
        {items.map((item, i) => (
          <li key={i} className="flex gap-3 text-[15px] leading-relaxed">
            <span
              className="mt-[5px] flex-shrink-0 w-1.5 h-1.5 rounded-full"
              style={{ background: '#3b82f6' }}
            />
            <span className="text-slate-300">{item}</span>
          </li>
        ))}
      </ul>
    )
  }

  if (section.type === 'highlight') {
    return (
      <div
        key={index}
        className="my-8 px-5 py-4 rounded-lg text-[14px] leading-relaxed text-slate-200"
        style={{
          background: 'rgba(59,130,246,0.08)',
          borderLeft: '3px solid #3b82f6',
        }}
      >
        {section.content as string}
      </div>
    )
  }

  return null
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BlogArticlePage() {
  const { slug } = useParams<{ slug: string }>()
  const article = slug ? articles[slug] : undefined

  useEffect(() => {
    if (!article) return
    document.title = `${article.title} | EnergyDeal Blog`

    // Meta description
    let metaDesc = document.querySelector('meta[name="description"]')
    if (!metaDesc) {
      metaDesc = document.createElement('meta')
      metaDesc.setAttribute('name', 'description')
      document.head.appendChild(metaDesc)
    }
    metaDesc.setAttribute('content', article.metaDescription)

    // BlogPosting JSON-LD
    const existing = document.querySelector('script[data-article-ld]')
    if (existing) existing.remove()
    const ldScript = document.createElement('script')
    ldScript.type = 'application/ld+json'
    ldScript.setAttribute('data-article-ld', 'true')
    ldScript.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: article.title,
      description: article.metaDescription,
      datePublished: article.isoDate,
      dateModified: article.isoDate,
      author: { '@type': 'Organization', name: 'EnergyDeal', url: 'https://energydeal.es' },
      publisher: { '@type': 'Organization', name: 'EnergyDeal', url: 'https://energydeal.es' },
      mainEntityOfPage: { '@type': 'WebPage', '@id': `https://energydeal.es/blog/${article.slug}` },
      image: 'https://energydeal.es/og-image.svg',
      keywords: article.category,
      inLanguage: 'es',
    })
    document.head.appendChild(ldScript)

    return () => {
      document.title = 'EnergyDeal — CRM para asesores energéticos'
      document.querySelector('script[data-article-ld]')?.remove()
    }
  }, [article])

  if (!article) {
    return <Navigate to="/blog" replace />
  }

  // Determine 2-3 related articles (same category or next in list, excluding current)
  const related = allArticles
    .filter((a) => a.slug !== article.slug)
    .sort((a, b) => {
      // Prefer same category
      const aMatch = a.category === article.category ? -1 : 0
      const bMatch = b.category === article.category ? -1 : 0
      return aMatch - bMatch
    })
    .slice(0, 3)

  return (
    <div className="min-h-screen" style={{ background: '#020209' }}>
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                               */}
      {/* ------------------------------------------------------------------ */}
      <header
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(2,2,9,0.95)',
          backdropFilter: 'blur(20px)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div className="max-w-[1100px] mx-auto px-[5%] py-4 flex items-center justify-between">
          <Link to="/login" style={{ textDecoration: 'none' }} className="flex items-center gap-2">
            <EnergyPulseIcon />
            <span className="text-[1rem] font-extrabold tracking-[-0.03em] text-white">
              Energy<span style={{ color: '#60a5fa' }}>Deal</span>
            </span>
          </Link>
          <Link
            to="/blog"
            style={{ textDecoration: 'none' }}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2} />
            Volver al blog
          </Link>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Article header                                                       */}
      {/* ------------------------------------------------------------------ */}
      <div
        style={{
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0) 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div className="max-w-[720px] mx-auto px-[5%] pt-12 pb-10">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-[12px] text-slate-500 mb-6">
            <Link to="/blog" className="hover:text-slate-300 transition-colors" style={{ textDecoration: 'none' }}>
              Blog
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span style={{ color: article.catColor }}>{article.category}</span>
          </nav>

          {/* Category badge */}
          <span
            className="inline-block text-[10px] font-bold tracking-[0.08em] uppercase px-2.5 py-1 rounded mb-4"
            style={{
              background: `${article.catColor}18`,
              color: article.catColor,
            }}
          >
            {article.category}
          </span>

          {/* Title */}
          <h1 className="text-2xl sm:text-[1.75rem] font-extrabold text-white leading-snug tracking-[-0.03em] mb-5">
            {article.title}
          </h1>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-4 text-[12px] text-slate-500 mb-5">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {article.date}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {article.readTime} de lectura
            </span>
            <span>Por {article.author}</span>
          </div>

          {/* Excerpt */}
          <p className="text-slate-400 text-[15px] leading-relaxed border-l-2 pl-4" style={{ borderColor: article.catColor + '60' }}>
            {article.excerpt}
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Article body                                                         */}
      {/* ------------------------------------------------------------------ */}
      <article className="max-w-[720px] mx-auto px-[5%] py-10">
        {article.sections.map((section, index) => renderSection(section, index))}
      </article>

      {/* ------------------------------------------------------------------ */}
      {/* CTA section                                                          */}
      {/* ------------------------------------------------------------------ */}
      <div
        style={{
          background: 'rgba(255,255,255,0.018)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="max-w-[720px] mx-auto px-[5%] py-14 text-center">
          <div
            className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.12em] uppercase mb-4 px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa' }}
          >
            <Zap className="w-3 h-3" fill="currentColor" />
            EnergyDeal CRM
          </div>
          <h2 className="text-2xl sm:text-[1.6rem] font-extrabold text-white tracking-[-0.03em] mb-3">
            Automatiza tu proceso como asesor energético
          </h2>
          <p className="text-slate-400 text-[15px] mb-8 max-w-[480px] mx-auto leading-relaxed">
            Compara tarifas en segundos, gestiona tu cartera por CIF y CUPS, controla comisiones y cumple con el RGPD desde una sola plataforma.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-7 py-3 rounded-xl font-bold text-[14px] text-white transition-all"
            style={{
              textDecoration: 'none',
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
              boxShadow: '0 4px 24px rgba(37,99,235,0.35)',
            }}
          >
            Empieza gratis sin tarjeta
          </Link>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Related articles                                                     */}
      {/* ------------------------------------------------------------------ */}
      <div className="max-w-[1100px] mx-auto px-[5%] py-14">
        <h3 className="text-[13px] font-bold text-slate-500 tracking-[0.1em] uppercase mb-6">
          Artículos relacionados
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {related.map((rel) => (
            <Link
              key={rel.slug}
              to={`/blog/${rel.slug}`}
              style={{ textDecoration: 'none' }}
              className="group flex flex-col rounded-xl overflow-hidden"
            >
              <div
                className="flex flex-col flex-1 p-5"
                style={{
                  background: 'rgba(255,255,255,0.022)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '0.75rem',
                }}
              >
                <div className="h-[2px] rounded-full mb-4 w-8" style={{ background: rel.catColor }} />
                <span
                  className="text-[10px] font-bold tracking-[0.08em] uppercase mb-3 self-start px-2 py-0.5 rounded"
                  style={{ background: `${rel.catColor}18`, color: rel.catColor }}
                >
                  {rel.category}
                </span>
                <h4 className="text-[14px] font-semibold text-white leading-snug group-hover:text-blue-200 transition-colors mb-2 flex-1">
                  {rel.title}
                </h4>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[11px] text-slate-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {rel.readTime}
                  </span>
                  <span className="text-[12px] text-blue-400 font-semibold group-hover:text-blue-300 transition-colors">
                    Leer
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
