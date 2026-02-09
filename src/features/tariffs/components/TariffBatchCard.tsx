
import { format } from 'date-fns';
import { FileText, Calendar, CheckCircle, AlertCircle, Clock, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { TariffBatch } from '@/shared/types';
import { useNavigate } from 'react-router-dom';

interface TariffBatchCardProps {
    batch: TariffBatch;
}

export function TariffBatchCard({ batch }: TariffBatchCardProps) {
    const navigate = useNavigate();

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'published': return 'bg-green-100 text-green-800 hover:bg-green-100';
            case 'pending_review': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
            case 'processing': return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
            case 'validation_failed': return 'bg-red-100 text-red-800 hover:bg-red-100';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'published': return <CheckCircle className="w-3 h-3 mr-1" />;
            case 'pending_review': return <AlertCircle className="w-3 h-3 mr-1" />;
            case 'processing': return <Clock className="w-3 h-3 mr-1" />;
            case 'validation_failed': return <AlertCircle className="w-3 h-3 mr-1" />;
            default: return null;
        }
    };

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    Lote #{batch.id.slice(0, 8)}
                </CardTitle>
                <Badge variant="secondary" className={getStatusColor(batch.status)}>
                    {getStatusIcon(batch.status)}
                    {batch.status.replace('_', ' ')}
                </Badge>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gray-400" />
                    {batch.file_count} <span className="text-sm font-normal text-gray-500">archivos</span>
                </div>
                <div className="text-xs text-gray-500 mt-2 flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    {format(new Date(batch.created_at), 'dd/MM/yyyy HH:mm')}
                </div>
            </CardContent>
            <CardFooter>
                <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate(`/admin/tariffs/${batch.id}`)}
                >
                    Ver Detalles
                    <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
            </CardFooter>
        </Card>
    );
}
