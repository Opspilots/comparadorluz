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

export function useTour() {
    const location = useLocation()

    const startTour = () => {
        let steps: TourStep[] = []

        if (location.pathname === '/') {
            steps = [
                {
                    element: 'body',
                    popover: { title: 'Panel Principal', description: 'Bienvenido a tu cuadro de mando. Aquí tienes una visión general de tu negocio.', side: 'left', align: 'start' }
                },
                {
                    element: '.metric-card:first-child',
                    popover: { title: 'Métricas', description: 'Visualiza rápidamente el estado de tu cartera de clientes y contratos.', side: 'bottom', align: 'start' }
                },
                {
                    element: '.dashboard-chart',
                    popover: { title: 'Gráficos', description: 'Analiza la evolución temporal de tus ventas.', side: 'top', align: 'start' }
                },
                {
                    element: '.quick-actions',
                    popover: { title: 'Acciones Rápidas', description: 'Accesos directos para las tareas más frecuentes.', side: 'top', align: 'start' }
                },
                {
                    element: '.sidebar-nav',
                    popover: { title: 'Menú de Navegación', description: 'Accede a las diferentes secciones desde aquí.', side: 'right', align: 'start' }
                }
            ]
        } else if (location.pathname.startsWith('/crm')) {
            steps = [
                {
                    element: '.tour-crm-title',
                    popover: { title: 'Gestión de Clientes', description: 'Aquí podrás administrar toda tu base de datos de clientes.', side: 'bottom', align: 'start' }
                },
                {
                    element: '.tour-crm-search',
                    popover: { title: 'Búsqueda y Filtros', description: 'Encuentra clientes rápidamente por nombre o CIF.', side: 'bottom', align: 'start' }
                },
                {
                    element: '.tour-crm-new-btn',
                    popover: { title: 'Nuevo Cliente', description: 'Da de alta un nuevo cliente manualmente desde aquí.', side: 'left', align: 'start' }
                },
                {
                    element: '.tour-crm-list',
                    popover: { title: 'Listado de Clientes', description: 'Consulta el estado y detalles de cada cliente.', side: 'top', align: 'start' }
                }
            ]
        } else if (location.pathname.startsWith('/contracts')) {
            steps = [
                {
                    element: '.tour-contracts-title',
                    popover: { title: 'Gestión de Contratos', description: 'Controla el estado de todos los contratos generados.', side: 'bottom', align: 'start' }
                },
                {
                    element: '.tour-contracts-filters',
                    popover: { title: 'Filtros de Estado', description: 'Filtra por estado (Pendiente, Firmado, Activo, etc.) para organizar tu trabajo.', side: 'bottom', align: 'start' }
                },
                {
                    element: '.tour-contracts-new-btn',
                    popover: { title: 'Crear Contrato', description: 'Inicia el proceso de creación de un nuevo contrato.', side: 'left', align: 'start' }
                }
            ]
        } else if (location.pathname.startsWith('/comparator')) {
            steps = [
                {
                    element: '.tour-comparator-title',
                    popover: { title: 'Comparador de Tarifas', description: 'Herramienta para calcular el ahorro potencial de tus clientes.', side: 'bottom', align: 'start' }
                },
                {
                    element: '.tour-comparator-uploader',
                    popover: { title: 'Subida de Factura', description: 'Sube un PDF para extraer los datos automáticamente (OCR).', side: 'right', align: 'start' }
                },
                {
                    element: '.tour-comparator-form',
                    popover: { title: 'Datos Manuales', description: 'O introduce/corrige los datos del punto de suministro manualmente.', side: 'top', align: 'start' }
                },
                {
                    element: '.tour-comparator-history-btn',
                    popover: { title: 'Historial', description: 'Accede a comparativas guardadas anteriormente.', side: 'bottom', align: 'start' }
                }
            ]
        } else if (location.pathname.startsWith('/admin/tariffs')) {
            steps = [
                {
                    element: '.tour-tariffs-title',
                    popover: { title: 'Gestión de Tarifas', description: 'Administra las tarifas de energía que ofreces.', side: 'bottom', align: 'start' }
                },
                {
                    element: '.tour-tariffs-upload-btn',
                    popover: { title: 'Carga Masiva', description: 'Sube ficheros Excel con múltiples tarifas a la vez.', side: 'bottom', align: 'start' }
                },
                {
                    element: '.tour-tariffs-filters',
                    popover: { title: 'Filtros Avanzados', description: 'Busca tarifas específicas por comercializadora, tipo o fecha.', side: 'bottom', align: 'start' }
                }
            ]
        } else if (location.pathname.startsWith('/commissioners')) {
            steps = [
                {
                    element: '.tour-commissioners-search',
                    popover: { title: 'Buscador', description: 'Encuentra comisionados por nombre o correo electrónico.', side: 'bottom', align: 'start' }
                },
                {
                    element: '.tour-commissioners-new-btn',
                    popover: { title: 'Nuevo Comisionado', description: 'Registra un nuevo agente en tu equipo.', side: 'bottom', align: 'start' }
                },
                {
                    element: '.tour-commissioners-list',
                    popover: { title: 'Listado y Estadísticas', description: 'Visualiza el rendimiento y las comisiones pendientes de cada agente.', side: 'top', align: 'start' }
                }
            ]
        } else if (location.pathname.startsWith('/admin/messages')) {
            steps = [
                {
                    element: '.tour-campaigns-new-btn',
                    popover: { title: 'Crear Campaña', description: 'Lanza nuevas campañas de Email o WhatsApp.', side: 'bottom', align: 'start' }
                },
                {
                    element: '.tour-campaigns-search',
                    popover: { title: 'Filtrar Campañas', description: 'Busca campañas pasadas o programadas.', side: 'bottom', align: 'start' }
                },
                {
                    element: '.tour-campaigns-list',
                    popover: { title: 'Historial', description: 'Revisa el estado y resultados de tus envíos.', side: 'top', align: 'start' }
                }
            ]
        } else if (location.pathname.startsWith('/settings')) {
            steps = [
                {
                    element: '.tour-settings-profile',
                    popover: { title: 'Perfil', description: 'Gestiona tu información personal.', side: 'right', align: 'start' }
                },
                {
                    element: '.tour-settings-messaging',
                    popover: { title: 'Mensajería', description: 'Configura tus proveedores de Email (SMTP/Resend) y WhatsApp.', side: 'right', align: 'start' }
                },
                {
                    element: '.tour-settings-danger',
                    popover: { title: 'Zona de Peligro', description: 'Cierra sesión de forma segura.', side: 'top', align: 'start' }
                }
            ]
        }

        if (steps.length > 0) {
            const driverObj = driver({
                showProgress: true,
                animate: true,
                nextBtnText: 'Siguiente',
                prevBtnText: 'Anterior',
                doneBtnText: 'Entendido',
                steps: steps
            })
            driverObj.drive()
        }
    }

    return { startTour }
}
