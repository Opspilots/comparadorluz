import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { useLocation } from 'react-router-dom'

interface TourStep {
    element: string;
    popover: {
        title: string;
        description: string;
        side: 'top' | 'right' | 'bottom' | 'left';
        align: 'start' | 'center' | 'end';
    };
}

// Filtra pasos cuyo selector no existe en el DOM para evitar errores de driver.js
function filterExistingSteps(steps: TourStep[]): TourStep[] {
    return steps.filter(step => {
        if (step.element === 'body') return true
        return document.querySelector(step.element) !== null
    })
}

function getStepsForPath(pathname: string): TourStep[] {

    // ── Dashboard ──────────────────────────────────────────────────────────
    if (pathname === '/') {
        return [
            {
                element: 'body',
                popover: { title: '👋 Panel Principal', description: 'Bienvenido a EnergyDeal CRM. Desde aquí tienes una visión general de tu negocio: clientes, contratos y actividad reciente.', side: 'left', align: 'start' }
            },
            {
                element: '.metric-card:first-child',
                popover: { title: 'Métricas Clave', description: 'Visualiza rápidamente el estado de tu cartera: clientes activos, contratos firmados e ingresos del mes.', side: 'bottom', align: 'start' }
            },
            {
                element: '.dashboard-chart',
                popover: { title: 'Gráfico de Evolución', description: 'Analiza cómo evolucionan tus ventas y comisiones a lo largo del tiempo.', side: 'top', align: 'start' }
            },
            {
                element: '.quick-actions',
                popover: { title: 'Acciones Rápidas', description: 'Atajos para las tareas más habituales: nuevo cliente, nueva comparativa o nuevo contrato.', side: 'top', align: 'start' }
            },
            {
                element: 'aside',
                popover: { title: 'Menú de Navegación', description: 'Accede a todas las secciones desde la barra lateral: CRM, Comparador, Contratos, Mensajería y más.', side: 'right', align: 'start' }
            },
        ]
    }

    // ── CRM — Nuevo / Editar cliente ───────────────────────────────────────
    if (pathname === '/crm/new' || /^\/crm\/[^/]+\/edit$/.test(pathname)) {
        return [
            {
                element: 'body',
                popover: { title: 'Formulario de Cliente', description: pathname === '/crm/new' ? 'Rellena los datos para dar de alta un nuevo cliente. El CIF es el identificador único; no puede repetirse.' : 'Modifica los datos del cliente. Los cambios se guardan al pulsar "Guardar".', side: 'left', align: 'start' }
            },
            {
                element: '.tour-customer-form-cif',
                popover: { title: 'CIF', description: 'Identificador fiscal de la empresa (ej. B12345678). Es único y obligatorio.', side: 'right', align: 'start' }
            },
            {
                element: '.tour-customer-form-status',
                popover: { title: 'Estado del Cliente', description: 'Indica en qué fase del proceso comercial se encuentra: Prospecto → Contactado → Propuesta → Negociación → Cliente → Perdido.', side: 'right', align: 'start' }
            },
        ]
    }

    // ── CRM — Detalle de cliente ───────────────────────────────────────────
    if (/^\/crm\/[^/]+$/.test(pathname)) {
        return [
            {
                element: 'body',
                popover: { title: 'Detalle del Cliente', description: 'Vista completa del cliente. Aquí encontrarás sus contactos, puntos de suministro (CUPS), contratos y actividad registrada.', side: 'left', align: 'start' }
            },
            {
                element: '.tour-customer-contacts',
                popover: { title: 'Contactos', description: 'Personas de contacto en la empresa: nombre, cargo, teléfono y correo. Puedes añadir varios.', side: 'top', align: 'start' }
            },
            {
                element: '.tour-customer-supply-points',
                popover: { title: 'Puntos de Suministro (CUPS)', description: 'Código Universal del Punto de Suministro. Cada contador de luz o gas tiene uno. Necesario para hacer comparativas.', side: 'top', align: 'start' }
            },
            {
                element: '.tour-customer-activity',
                popover: { title: 'Actividad', description: 'Historial de acciones: llamadas, reuniones, correos enviados. Mantén el seguimiento de cada cliente.', side: 'top', align: 'start' }
            },
        ]
    }

    // ── CRM — Nuevo contacto ───────────────────────────────────────────────
    if (/\/contacts\/new$/.test(pathname)) {
        return [
            {
                element: 'body',
                popover: { title: 'Nuevo Contacto', description: 'Añade una persona de contacto asociada al cliente. Puedes registrar su nombre, cargo, teléfono y correo electrónico.', side: 'left', align: 'start' }
            },
        ]
    }

    // ── CRM — Nuevo punto de suministro ───────────────────────────────────
    if (/\/supply-points\/new$/.test(pathname)) {
        return [
            {
                element: 'body',
                popover: { title: 'Nuevo Punto de Suministro', description: 'Registra un CUPS (código del contador). Es el identificador único de cada punto de luz o gas y es necesario para realizar comparativas.', side: 'left', align: 'start' }
            },
        ]
    }

    // ── CRM — Listado principal ────────────────────────────────────────────
    if (pathname.startsWith('/crm')) {
        return [
            {
                element: '.tour-crm-title',
                popover: { title: 'Gestión de Clientes', description: 'Aquí administras toda tu cartera de clientes. Cada cliente se identifica por su CIF y puede tener múltiples contactos y puntos de suministro.', side: 'bottom', align: 'start' }
            },
            {
                element: '.tour-crm-search',
                popover: { title: 'Búsqueda y Filtros', description: 'Encuentra clientes por nombre, CIF o estado comercial. El filtro de estado te ayuda a priorizar el seguimiento.', side: 'bottom', align: 'start' }
            },
            {
                element: '.tour-crm-new-btn',
                popover: { title: 'Nuevo Cliente', description: 'Da de alta un nuevo cliente manualmente. También puedes importarlos desde integraciones externas.', side: 'left', align: 'start' }
            },
            {
                element: '.tour-crm-list',
                popover: { title: 'Listado de Clientes', description: 'Haz clic en cualquier cliente para ver su detalle completo: contactos, CUPS, contratos y actividad.', side: 'top', align: 'start' }
            },
        ]
    }

    // ── Comparador — Historial ─────────────────────────────────────────────
    if (pathname === '/comparator/history') {
        return [
            {
                element: 'body',
                popover: { title: 'Historial de Comparativas', description: 'Aquí se guardan todas las comparativas realizadas. Puedes consultarlas, reenviarlas al cliente o usarlas como base para un contrato.', side: 'left', align: 'start' }
            },
            {
                element: '.tour-history-search',
                popover: { title: 'Buscar Comparativas', description: 'Filtra por cliente, fecha o estado para encontrar una comparativa anterior rápidamente.', side: 'bottom', align: 'start' }
            },
            {
                element: '.tour-history-list',
                popover: { title: 'Resultados', description: 'Cada fila muestra el cliente, el ahorro estimado y la tarifa recomendada. Haz clic para ver el desglose completo.', side: 'top', align: 'start' }
            },
        ]
    }

    // ── Comparador — Formulario principal ─────────────────────────────────
    if (pathname.startsWith('/comparator')) {
        return [
            {
                element: '.tour-comparator-title',
                popover: { title: 'Comparador de Tarifas', description: 'Calcula el ahorro potencial de un cliente comparando su factura actual con las mejores tarifas disponibles.', side: 'bottom', align: 'start' }
            },
            {
                element: '.tour-comparator-uploader',
                popover: { title: 'Subida de Factura (OCR)', description: 'Sube el PDF de la factura del cliente y el sistema extraerá automáticamente los datos de consumo. Ahorra tiempo y evita errores.', side: 'right', align: 'start' }
            },
            {
                element: '.tour-comparator-form',
                popover: { title: 'Datos del Suministro', description: 'Introduce o corrige manualmente: CUPS, potencia contratada, consumo por periodo y tipo de tarifa (luz/gas).', side: 'top', align: 'start' }
            },
            {
                element: '.tour-comparator-history-btn',
                popover: { title: 'Ver Historial', description: 'Accede a todas las comparativas realizadas anteriormente para consultar o reutilizarlas.', side: 'bottom', align: 'start' }
            },
        ]
    }

    // ── Tarifas — Subida de fichero ────────────────────────────────────────
    if (pathname === '/admin/tariffs/upload') {
        return [
            {
                element: 'body',
                popover: { title: 'Carga Masiva de Tarifas', description: 'Sube un fichero Excel con múltiples tarifas a la vez. El sistema las validará antes de publicarlas para evitar errores.', side: 'left', align: 'start' }
            },
            {
                element: '.tour-upload-dropzone',
                popover: { title: 'Zona de Arrastre', description: 'Arrastra tu fichero Excel aquí o haz clic para seleccionarlo. El formato debe seguir la plantilla oficial.', side: 'top', align: 'start' }
            },
            {
                element: '.tour-upload-template',
                popover: { title: 'Descargar Plantilla', description: 'Descarga la plantilla Excel con el formato correcto para rellenar las tarifas.', side: 'bottom', align: 'start' }
            },
        ]
    }

    // ── Tarifas — Detalle de lote ──────────────────────────────────────────
    if (/\/admin\/tariffs\/batches\//.test(pathname)) {
        return [
            {
                element: 'body',
                popover: { title: 'Detalle del Lote', description: 'Revisa las tarifas incluidas en este lote antes de publicarlas. Puedes aprobar, corregir o rechazar individualmente.', side: 'left', align: 'start' }
            },
            {
                element: '.tour-batch-status',
                popover: { title: 'Estado del Lote', description: 'Un lote pasa por: Subido → Validado → Publicado. Solo las tarifas publicadas aparecen en el comparador.', side: 'bottom', align: 'start' }
            },
        ]
    }

    // ── Tarifas — Nueva / Editar tarifa ───────────────────────────────────
    if (pathname === '/admin/tariffs/new' || /\/admin\/tariffs\/edit\//.test(pathname)) {
        return [
            {
                element: 'body',
                popover: { title: 'Editor de Tarifa', description: 'Define los precios y condiciones de una tarifa. Las tarifas nunca se sobrescriben: se crea una nueva versión con fecha de vigencia.', side: 'left', align: 'start' }
            },
            {
                element: '.tour-tariff-valid-from',
                popover: { title: 'Fecha de Vigencia', description: 'Desde qué fecha aplica esta versión de la tarifa. Las versiones anteriores quedan archivadas para auditoría.', side: 'right', align: 'start' }
            },
        ]
    }

    // ── Tarifas — Detalle de tarifa ────────────────────────────────────────
    if (/\/admin\/tariffs\/[^/]+$/.test(pathname) && pathname !== '/admin/tariffs') {
        return [
            {
                element: 'body',
                popover: { title: 'Detalle de Tarifa', description: 'Consulta todos los tramos de precio, periodos y condiciones de esta tarifa. Puedes crear una nueva versión desde aquí.', side: 'left', align: 'start' }
            },
        ]
    }

    // ── Tarifas — Listado principal ────────────────────────────────────────
    if (pathname.startsWith('/admin/tariffs')) {
        return [
            {
                element: '.tour-tariffs-title',
                popover: { title: 'Gestión de Tarifas', description: 'Administra el catálogo de tarifas eléctricas y de gas que ofreces a tus clientes. Las tarifas se versionan: nunca se pierden datos históricos.', side: 'bottom', align: 'start' }
            },
            {
                element: '.tour-tariffs-upload-btn',
                popover: { title: 'Carga Masiva', description: 'Sube un fichero Excel con múltiples tarifas a la vez. Ideal cuando recibes actualizaciones de tu comercializadora.', side: 'bottom', align: 'start' }
            },
            {
                element: '.tour-tariffs-filters',
                popover: { title: 'Filtros Avanzados', description: 'Busca por comercializadora, tipo de energía (luz/gas), potencia o fecha de vigencia.', side: 'bottom', align: 'start' }
            },
        ]
    }

    // ── Comercializadoras ──────────────────────────────────────────────────
    if (pathname.startsWith('/admin/suppliers')) {
        return [
            {
                element: 'body',
                popover: { title: 'Comercializadoras', description: 'Gestiona las empresas comercializadoras cuyas tarifas ofreces. Cada tarifa pertenece a una comercializadora.', side: 'left', align: 'start' }
            },
            {
                element: '.tour-suppliers-new-btn',
                popover: { title: 'Nueva Comercializadora', description: 'Añade una nueva empresa con su logo, nombre y datos de contacto.', side: 'left', align: 'start' }
            },
            {
                element: '.tour-suppliers-list',
                popover: { title: 'Listado', description: 'Haz clic en una comercializadora para ver sus tarifas activas o editar su información.', side: 'top', align: 'start' }
            },
        ]
    }


    // ── Comisionados — Detalle de agente ──────────────────────────────────
    if (/^\/commissioners\/[^/]+$/.test(pathname)) {
        return [
            {
                element: 'body',
                popover: { title: 'Detalle del Comisionado', description: 'Vista completa del agente comercial: reglas de comisión asignadas, contratos gestionados y estado de pagos.', side: 'left', align: 'start' }
            },
            {
                element: '.tour-commissioner-rules',
                popover: { title: 'Reglas de Comisión', description: 'Define cuánto cobra este agente por cada contrato: importe fijo, porcentaje o por tramos de potencia.', side: 'top', align: 'start' }
            },
            {
                element: '.tour-commissioner-contracts',
                popover: { title: 'Contratos del Agente', description: 'Listado de contratos gestionados por este agente y el estado de su comisión: Pendiente → Validada → Pagada.', side: 'top', align: 'start' }
            },
        ]
    }

    // ── Comisionados — Listado principal ──────────────────────────────────
    if (pathname.startsWith('/commissioners')) {
        return [
            {
                element: '.tour-commissioners-search',
                popover: { title: 'Buscador', description: 'Encuentra agentes comerciales por nombre o correo electrónico.', side: 'bottom', align: 'start' }
            },
            {
                element: '.tour-commissioners-new-btn',
                popover: { title: 'Nuevo Comisionado', description: 'Registra un nuevo agente en tu equipo y asígnale reglas de comisión personalizadas.', side: 'bottom', align: 'start' }
            },
            {
                element: '.tour-commissioners-list',
                popover: { title: 'Listado y Estadísticas', description: 'Visualiza el rendimiento de cada agente: contratos cerrados, comisiones pendientes y pagadas.', side: 'top', align: 'start' }
            },
        ]
    }

    // ── Mensajería — Campañas (nueva / editar) ────────────────────────────
    if (/\/admin\/messages\/campaigns\/(new|[^/]+\/edit|[^/]+)$/.test(pathname)) {
        return [
            {
                element: 'body',
                popover: { title: 'Editor de Campaña', description: 'Configura el asunto, el cuerpo del mensaje y los destinatarios. Puedes programarla para enviarla más tarde o lanzarla ahora.', side: 'left', align: 'start' }
            },
            {
                element: '.tour-campaign-channel',
                popover: { title: 'Canal de Envío', description: 'Elige entre Email (mediante Gmail, SMTP o Resend) o WhatsApp. Asegúrate de tener configurado el canal antes de enviar.', side: 'right', align: 'start' }
            },
            {
                element: '.tour-campaign-recipients',
                popover: { title: 'Destinatarios', description: 'Selecciona clientes individualmente o por segmento (estado, tipo de suministro, etc.).', side: 'top', align: 'start' }
            },
            {
                element: '.tour-campaign-schedule',
                popover: { title: 'Programación', description: 'Envía inmediatamente o programa la campaña para una fecha y hora concretas.', side: 'top', align: 'start' }
            },
        ]
    }

    // ── Mensajería — Listado de campañas ──────────────────────────────────
    if (pathname === '/admin/messages/campaigns') {
        return [
            {
                element: '.tour-campaigns-new-btn',
                popover: { title: 'Crear Campaña', description: 'Lanza nuevas campañas de Email o WhatsApp a grupos de clientes segmentados.', side: 'bottom', align: 'start' }
            },
            {
                element: '.tour-campaigns-search',
                popover: { title: 'Filtrar Campañas', description: 'Busca campañas pasadas o programadas por nombre, canal o estado.', side: 'bottom', align: 'start' }
            },
            {
                element: '.tour-campaigns-list',
                popover: { title: 'Historial de Campañas', description: 'Revisa el estado (Programada, Enviando, Completada) y métricas de apertura de cada campaña.', side: 'top', align: 'start' }
            },
        ]
    }

    // ── Mensajería — Conversación individual ──────────────────────────────
    if (/\/admin\/messages\/[^/]+$/.test(pathname) && !pathname.includes('campaigns')) {
        return [
            {
                element: 'body',
                popover: { title: 'Conversación', description: 'Historial de mensajes con este cliente. Puedes responder por Email o WhatsApp desde aquí.', side: 'left', align: 'start' }
            },
            {
                element: '.tour-conversation-input',
                popover: { title: 'Redactar Mensaje', description: 'Escribe tu respuesta y selecciona el canal de envío. Los mensajes quedan registrados en el historial del cliente.', side: 'top', align: 'start' }
            },
        ]
    }

    // ── Mensajería — Principal ─────────────────────────────────────────────
    if (pathname.startsWith('/admin/messages')) {
        return [
            {
                element: '.tour-campaigns-new-btn',
                popover: { title: 'Crear Campaña', description: 'Lanza campañas masivas de Email o WhatsApp a tus clientes.', side: 'bottom', align: 'start' }
            },
            {
                element: '.tour-messaging-conversations',
                popover: { title: 'Conversaciones', description: 'Accede al historial de mensajes con cada cliente. Las conversaciones se sincronizan con Gmail si tienes la integración activa.', side: 'right', align: 'start' }
            },
            {
                element: '.tour-campaigns-search',
                popover: { title: 'Buscar', description: 'Encuentra conversaciones o campañas anteriores rápidamente.', side: 'bottom', align: 'start' }
            },
        ]
    }

    // ── Contratos — Plantilla ──────────────────────────────────────────────
    if (pathname === '/contracts/template') {
        return [
            {
                element: 'body',
                popover: { title: 'Plantilla de Contrato', description: 'Define la estructura y el texto base de tus contratos. Usa variables dinámicas ({{cliente}}, {{tarifa}}, etc.) que se rellenan automáticamente.', side: 'left', align: 'start' }
            },
            {
                element: '.tour-template-variables',
                popover: { title: 'Variables Disponibles', description: 'Inserta datos del cliente, tarifa o comparativa directamente en el contrato sin tener que editarlo cada vez.', side: 'right', align: 'start' }
            },
        ]
    }

    // ── Contratos — Nuevo / Editar ─────────────────────────────────────────
    if (pathname === '/contracts/new' || /^\/contracts\/[^/]+$/.test(pathname)) {
        return [
            {
                element: 'body',
                popover: { title: 'Formulario de Contrato', description: 'Vincula una comparativa aprobada con un cliente para generar el contrato. Los datos se rellenan automáticamente desde la comparativa.', side: 'left', align: 'start' }
            },
            {
                element: '.tour-contract-comparison',
                popover: { title: 'Comparativa Vinculada', description: 'Selecciona la comparativa que originó este contrato. Los precios y ahorros quedan registrados como snapshot inmutable.', side: 'right', align: 'start' }
            },
            {
                element: '.tour-contract-status',
                popover: { title: 'Estado del Contrato', description: 'Flujo: Borrador → Enviado → Firmado → Activo → Finalizado. Cambia el estado manualmente o mediante firma electrónica.', side: 'right', align: 'start' }
            },
        ]
    }

    // ── Contratos — Vista previa ───────────────────────────────────────────
    if (/\/contracts\/[^/]+\/view$/.test(pathname)) {
        return [
            {
                element: 'body',
                popover: { title: 'Vista Previa del Contrato', description: 'Previsualiza el contrato tal como lo verá el cliente antes de enviarlo. Puedes descargarlo como PDF o enviarlo para firma.', side: 'left', align: 'start' }
            },
            {
                element: '.tour-contract-download',
                popover: { title: 'Descargar PDF', description: 'Genera y descarga el contrato en formato PDF listo para imprimir o adjuntar.', side: 'bottom', align: 'start' }
            },
            {
                element: '.tour-contract-send',
                popover: { title: 'Enviar al Cliente', description: 'Envía el contrato por email al cliente para su revisión o firma electrónica.', side: 'bottom', align: 'start' }
            },
        ]
    }

    // ── Contratos — Listado principal ──────────────────────────────────────
    if (pathname.startsWith('/contracts')) {
        return [
            {
                element: '.tour-contracts-title',
                popover: { title: 'Gestión de Contratos', description: 'Controla el estado de todos los contratos: desde borradores hasta contratos activos con clientes.', side: 'bottom', align: 'start' }
            },
            {
                element: '.tour-contracts-filters',
                popover: { title: 'Filtros de Estado', description: 'Filtra por estado (Borrador, Enviado, Firmado, Activo, Finalizado) para organizar tu pipeline comercial.', side: 'bottom', align: 'start' }
            },
            {
                element: '.tour-contracts-new-btn',
                popover: { title: 'Crear Contrato', description: 'Inicia un nuevo contrato asociando un cliente y una comparativa aprobada.', side: 'left', align: 'start' }
            },
        ]
    }

    // ── Cumplimiento (RGPD) ────────────────────────────────────────────────
    if (pathname.startsWith('/admin/compliance')) {
        return [
            {
                element: 'body',
                popover: { title: 'Cumplimiento RGPD', description: 'Gestiona el cumplimiento normativo de protección de datos: consentimientos, solicitudes ARCO+ y políticas de retención.', side: 'left', align: 'start' }
            },
            {
                element: '.tour-compliance-tabs',
                popover: { title: 'Secciones', description: 'Navega entre Consentimientos (registro de permisos), ARCO+ (derechos de los interesados) y Retención (políticas de borrado automático).', side: 'bottom', align: 'start' }
            },
            {
                element: '.tour-compliance-content',
                popover: { title: 'Contenido', description: 'Cada pestaña muestra su gestión correspondiente. Aquí puedes registrar consentimientos, tramitar solicitudes y configurar plazos de retención.', side: 'top', align: 'start' }
            },
        ]
    }

    // ── Ajustes ────────────────────────────────────────────────────────────
    if (pathname.startsWith('/settings') || pathname.startsWith('/admin/settings')) {
        return [
            {
                element: '.tour-settings-profile',
                popover: { title: 'Perfil de Usuario', description: 'Gestiona tu nombre, email y contraseña. Estos datos se usan en los contratos y correos enviados.', side: 'right', align: 'start' }
            },
            {
                element: '.tour-settings-messaging',
                popover: { title: 'Configuración de Mensajería', description: 'Conecta Gmail para enviar correos, configura SMTP propio o activa la integración con WhatsApp Business.', side: 'right', align: 'start' }
            },
            {
                element: '.tour-settings-danger',
                popover: { title: 'Zona de Peligro', description: 'Cierra sesión de forma segura. Ten cuidado con las acciones irreversibles de esta sección.', side: 'top', align: 'start' }
            },
        ]
    }

    // ── Fallback: página sin tour específico ───────────────────────────────
    return [
        {
            element: 'body',
            popover: {
                title: 'Ayuda',
                description: 'Esta sección no tiene una guía interactiva específica todavía. Usa el menú lateral para navegar a otra sección y pulsa "Ayuda y Guía" para ver su tour.',
                side: 'left',
                align: 'start'
            }
        },
        {
            element: 'aside',
            popover: {
                title: 'Navegación',
                description: 'Desde aquí accedes a todas las secciones: CRM, Comparador, Tarifas, Contratos, Mensajería y Comisionados.',
                side: 'right',
                align: 'start'
            }
        },
    ]
}

export function useTour() {
    const location = useLocation()

    const startTour = () => {
        const allSteps = getStepsForPath(location.pathname)
        const steps = filterExistingSteps(allSteps)

        if (steps.length === 0) return

        const driverObj = driver({
            showProgress: true,
            animate: true,
            nextBtnText: 'Siguiente',
            prevBtnText: 'Anterior',
            doneBtnText: 'Entendido',
            steps,
        })
        driverObj.drive()
    }

    const getStepCount = () => {
        const allSteps = getStepsForPath(location.pathname)
        return filterExistingSteps(allSteps).length
    }

    return { startTour, getStepCount }
}
