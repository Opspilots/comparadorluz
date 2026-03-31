import { ImageResponse } from '@vercel/og';

export const config = {
  runtime: 'edge',
};

export default function handler() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0f172a',
          padding: '40px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#1e293b',
            borderRadius: '24px',
            border: '1px solid #334155',
            padding: '40px',
            flex: 1,
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                backgroundColor: '#2563eb',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
              }}
            >
              ⚡
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '36px', fontWeight: 700, color: '#ffffff' }}>
                EnergyDeal CRM
              </span>
              <span style={{ fontSize: '16px', color: '#94a3b8' }}>
                Comparador Energético con IA
              </span>
            </div>
          </div>

          {/* Main tagline */}
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: '60px' }}>
            <span style={{ fontSize: '52px', fontWeight: 700, color: '#ffffff', lineHeight: 1.2 }}>
              Compara tarifas de luz y gas
            </span>
            <span style={{ fontSize: '52px', fontWeight: 700, color: '#ffffff', lineHeight: 1.2 }}>
              para tus clientes
            </span>
          </div>

          <span style={{ fontSize: '22px', color: '#94a3b8', marginTop: '24px' }}>
            Plataforma B2B para aseguradoras y corredurías
          </span>

          {/* Feature pills */}
          <div style={{ display: 'flex', gap: '16px', marginTop: '48px' }}>
            {['CRM Energético', 'Comparador de Tarifas', 'Gestión de Comisiones'].map((text) => (
              <div
                key={text}
                style={{
                  padding: '10px 24px',
                  borderRadius: '22px',
                  backgroundColor: 'rgba(37, 99, 235, 0.15)',
                  border: '1px solid rgba(37, 99, 235, 0.4)',
                  color: '#60a5fa',
                  fontSize: '16px',
                  fontWeight: 500,
                }}
              >
                {text}
              </div>
            ))}
          </div>

          {/* URL */}
          <span style={{ fontSize: '18px', color: '#64748b', marginTop: 'auto' }}>
            comparadorluz.vercel.app
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
