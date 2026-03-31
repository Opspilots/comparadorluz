import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/shared/components/ui/input';
import { useCustomerSearch } from '../lib/useCustomerSearch';
import { Loader2, User, Search } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/shared/components/ui/dialog';

interface NewMessageDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function NewMessageDialog({ open, onOpenChange }: NewMessageDialogProps) {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');

    const { data: customers, isLoading } = useCustomerSearch(searchTerm);

    const handleSelectCustomer = (customerId: string) => {
        setSearchTerm('');
        onOpenChange(false);
        navigate(`/admin/messages/${customerId}`);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden gap-0">
                <DialogHeader className="px-6 py-5 border-b border-slate-200">
                    <DialogTitle>Nuevo Mensaje</DialogTitle>
                    <DialogDescription className="sr-only">Busca un cliente para iniciar una conversación</DialogDescription>
                </DialogHeader>

                <div className="p-6">
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <Input
                            placeholder="Buscar cliente por nombre..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                            className="pl-9 h-9 rounded-lg border-slate-200 bg-slate-50 text-sm"
                        />
                    </div>

                    <div className="max-h-[300px] overflow-y-auto border border-slate-200 rounded-lg">
                        {isLoading ? (
                            <div className="flex justify-center p-6">
                                <Loader2 className="w-5 h-5 text-slate-300 animate-spin" />
                            </div>
                        ) : searchTerm.length < 2 ? (
                            <div className="py-8 px-4 text-center text-slate-400 text-sm">
                                Escribe al menos 2 caracteres para buscar.
                            </div>
                        ) : customers?.length === 0 ? (
                            <div className="py-8 px-4 text-center text-slate-400 text-sm">
                                No se encontraron clientes.
                            </div>
                        ) : (
                            customers?.map((customer) => (
                                <button
                                    key={customer.id}
                                    className="flex items-center gap-3 w-full p-3 text-left border-b border-light hover:bg-slate-50 transition-colors last:border-0"
                                    onClick={() => handleSelectCustomer(customer.id)}
                                >
                                    <div className="w-9 h-9 shrink-0 rounded-full bg-blue-50 flex items-center justify-center">
                                        <User className="w-4 h-4 text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900 m-0">{customer.name}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">{customer.cif || 'Sin CIF'}</p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
