import type { ReactNode } from 'react'
import { Lock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { PlanFeatures } from '@/shared/types'
import { usePlan } from '../hooks/usePlan'

interface FeatureGateProps {
  feature: keyof PlanFeatures
  children: ReactNode
  fallback?: ReactNode
}

function DefaultUpgradeOverlay() {
  const navigate = useNavigate()

  return (
    <div style={{ position: 'relative', display: 'block' }}>
      {/* Blurred content behind the overlay — rendered but inaccessible */}
      <div
        aria-hidden="true"
        style={{
          pointerEvents: 'none',
          opacity: 0.35,
          userSelect: 'none',
          filter: 'blur(3px)',
        }}
      />

      {/* Upgrade prompt card */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 32px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.07)',
          textAlign: 'center',
          gap: '16px',
        }}
      >
        {/* Lock icon circle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
          }}
        >
          <Lock size={24} color="#2563eb" />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <p
            style={{
              fontSize: '1rem',
              fontWeight: 600,
              color: '#0f172a',
              margin: 0,
            }}
          >
            Función no disponible en tu plan
          </p>
          <p
            style={{
              fontSize: '0.875rem',
              color: '#64748b',
              margin: 0,
              maxWidth: '320px',
            }}
          >
            Actualiza a Estándar o Profesional para acceder a esta funcionalidad.
          </p>
        </div>

        <button
          onClick={() => navigate('/settings/subscription')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 20px',
            borderRadius: '8px',
            background: '#2563eb',
            color: '#ffffff',
            fontSize: '0.875rem',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLButtonElement).style.background = '#1d4ed8'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLButtonElement).style.background = '#2563eb'
          }}
        >
          Ver planes →
        </button>
      </div>
    </div>
  )
}

export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const { canUseFeature, loading } = usePlan()

  if (loading) return null

  if (canUseFeature(feature)) {
    return <>{children}</>
  }

  return <>{fallback ?? <DefaultUpgradeOverlay />}</>
}
