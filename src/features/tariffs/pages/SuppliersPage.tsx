import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/shared/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, ToggleLeft, ToggleRight, X, Check, Building2 } from 'lucide-react';

interface Supplier {
    id: string;
    name: string;
    slug: string;
    website?: string;
    logo_url?: string;
    is_active: boolean;
    is_green: boolean;
    market_share_pct?: number | null;
    parent_group?: string | null;
    created_at: string;
}

function slugify(name: string): string {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

const emptyForm = {
    name: '',
    slug: '',
    website: '',
    logo_url: '',
    is_green: false,
    market_share_pct: '',
    parent_group: '',
};

export default function SuppliersPage() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Supplier | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    const fetchSuppliers = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('suppliers')
            .select('*')
            .order('name');
        if (error) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } else {
            setSuppliers(data || []);
        }
        setLoading(false);
    }, [toast]);

    useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

    const openCreate = () => {
        setEditing(null);
        setForm(emptyForm);
        setShowForm(true);
    };

    const openEdit = (s: Supplier) => {
        setEditing(s);
        setForm({
            name: s.name,
            slug: s.slug,
            website: s.website || '',
            logo_url: s.logo_url || '',
            is_green: s.is_green,
            market_share_pct: s.market_share_pct != null ? String(s.market_share_pct) : '',
            parent_group: s.parent_group || '',
        });
        setShowForm(true);
    };

    const handleNameChange = (name: string) => {
        setForm(prev => ({
            ...prev,
            name,
            slug: editing ? prev.slug : slugify(name),
        }));
    };

    const handleSave = async () => {
        if (!form.name.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'El nombre es obligatorio.' });
            return;
        }
        setSaving(true);
        const payload = {
            name: form.name.trim(),
            slug: form.slug.trim() || slugify(form.name),
            website: form.website.trim() || null,
            logo_url: form.logo_url.trim() || null,
            is_green: form.is_green,
            market_share_pct: form.market_share_pct !== '' ? parseFloat(form.market_share_pct) : null,
            parent_group: form.parent_group.trim() || null,
        };

        let error;
        if (editing) {
            ({ error } = await supabase.from('suppliers').update(payload).eq('id', editing.id));
        } else {
            ({ error } = await supabase.from('suppliers').insert(payload));
        }

        if (error) {
            toast({ variant: 'destructive', title: 'Error al guardar', description: error.message });
        } else {
            toast({ title: editing ? 'Comercializadora actualizada' : 'Comercializadora creada' });
            setShowForm(false);
            fetchSuppliers();
        }
        setSaving(false);
    };

    const toggleActive = async (s: Supplier) => {
        const { error } = await supabase
            .from('suppliers')
            .update({ is_active: !s.is_active })
            .eq('id', s.id);
        if (error) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } else {
            setSuppliers(prev => prev.map(x => x.id === s.id ? { ...x, is_active: !s.is_active } : x));
        }
    };

    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.375rem',
        border: '1px solid #d1d5db', fontSize: '0.875rem', outline: 'none',
    };
    const labelStyle: React.CSSProperties = {
        display: 'block', fontSize: '0.75rem', fontWeight: 600,
        color: '#374151', marginBottom: '0.25rem',
    };

    return (
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '2rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Building2 size={22} /> Comercializadoras
                    </h1>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
                        Gestiona el catálogo de proveedores de energía
                    </p>
                </div>
                <button
                    onClick={openCreate}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <Plus size={16} /> Nueva Comercializadora
                </button>
            </div>

            {/* Form Dialog */}
            {showForm && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
                    zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                }}>
                    <div style={{
                        background: 'white', borderRadius: '0.75rem', padding: '1.5rem',
                        width: '100%', maxWidth: '520px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>
                                {editing ? 'Editar Comercializadora' : 'Nueva Comercializadora'}
                            </h2>
                            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                            <div>
                                <label style={labelStyle}>Nombre *</label>
                                <input
                                    style={inputStyle}
                                    value={form.name}
                                    onChange={e => handleNameChange(e.target.value)}
                                    placeholder="ej. Iberdrola"
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Slug (identificador URL)</label>
                                <input
                                    style={inputStyle}
                                    value={form.slug}
                                    onChange={e => setForm(prev => ({ ...prev, slug: e.target.value }))}
                                    placeholder="ej. iberdrola"
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Sitio web</label>
                                <input
                                    style={inputStyle}
                                    value={form.website}
                                    onChange={e => setForm(prev => ({ ...prev, website: e.target.value }))}
                                    placeholder="https://..."
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>URL del logo</label>
                                <input
                                    style={inputStyle}
                                    value={form.logo_url}
                                    onChange={e => setForm(prev => ({ ...prev, logo_url: e.target.value }))}
                                    placeholder="https://..."
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div>
                                    <label style={labelStyle}>Grupo / Holding</label>
                                    <input
                                        style={inputStyle}
                                        value={form.parent_group}
                                        onChange={e => setForm(prev => ({ ...prev, parent_group: e.target.value }))}
                                        placeholder="ej. EDP Group"
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Cuota de mercado (%)</label>
                                    <input
                                        style={inputStyle}
                                        type="number"
                                        step="0.01"
                                        value={form.market_share_pct}
                                        onChange={e => setForm(prev => ({ ...prev, market_share_pct: e.target.value }))}
                                        placeholder="ej. 27.30"
                                    />
                                </div>
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                                <input
                                    type="checkbox"
                                    checked={form.is_green}
                                    onChange={e => setForm(prev => ({ ...prev, is_green: e.target.checked }))}
                                />
                                100% energía renovable
                            </label>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                            <button
                                onClick={() => setShowForm(false)}
                                className="btn btn-secondary"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="btn btn-primary"
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                <Check size={16} /> {saving ? 'Guardando...' : 'Guardar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Table */}
            <div style={{ background: 'white', borderRadius: '0.5rem', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Cargando...</div>
                ) : suppliers.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                        No hay comercializadoras registradas.
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nombre</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Grupo</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Verde</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Activa</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {suppliers.map((s, i) => (
                                <tr key={s.id} style={{ borderBottom: i < suppliers.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                                    <td style={{ padding: '0.875rem 1rem' }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#111827' }}>{s.name}</div>
                                        {s.website && (
                                            <a href={s.website} target="_blank" rel="noopener noreferrer"
                                                style={{ fontSize: '0.75rem', color: '#2563eb', textDecoration: 'none' }}>
                                                {s.website}
                                            </a>
                                        )}
                                    </td>
                                    <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                                        {s.parent_group || '—'}
                                    </td>
                                    <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                                        {s.is_green ? (
                                            <span style={{ background: '#d1fae5', color: '#065f46', fontSize: '0.75rem', fontWeight: 600, padding: '0.125rem 0.5rem', borderRadius: '9999px' }}>Sí</span>
                                        ) : (
                                            <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>—</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                                        <button
                                            onClick={() => toggleActive(s)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: s.is_active ? '#16a34a' : '#9ca3af' }}
                                            title={s.is_active ? 'Desactivar' : 'Activar'}
                                        >
                                            {s.is_active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                                        </button>
                                    </td>
                                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                                        <button
                                            onClick={() => openEdit(s)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '0.25rem' }}
                                            title="Editar"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <p style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#9ca3af' }}>
                {suppliers.length} comercializadoras · {suppliers.filter(s => s.is_active).length} activas
            </p>
        </div>
    );
}
