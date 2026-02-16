import { TariffWizard } from '../components/wizard/TariffWizard';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function TariffEditorPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const supplyType = location.state?.supplyType as 'electricity' | 'gas' | undefined;

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
                <button
                    onClick={() => navigate('/admin/tariffs')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: 'transparent',
                        border: 'none',
                        color: '#6b7280',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        padding: 0
                    }}
                >
                    <ArrowLeft size={16} /> Volver a Tarifas
                </button>
            </div>

            <TariffWizard initialSupplyType={supplyType} />
        </div>
    );
}
