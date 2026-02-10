import { TariffWizard } from '../components/wizard/TariffWizard';
import { Button } from '@/shared/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function TariffEditorPage() {
    const navigate = useNavigate();

    return (
        <div className="container mx-auto py-6">
            <div className="mb-6">
                <Button variant="ghost" onClick={() => navigate('/admin/tariffs')} className="gap-2 pl-0 hover:pl-2 transition-all">
                    <ArrowLeft className="h-4 w-4" /> Volver a Tarifas
                </Button>
            </div>

            <TariffWizard />
        </div>
    );
}

