import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import type { User as AppUser } from '@/shared/types'
import { Mail, Calendar, KeyRound, LogOut, User, Palette, MessageSquare, ShieldAlert, Pencil, Check, X } from 'lucide-react'
import { BrandingSettingsCard } from '../components/BrandingSettingsCard'
import { MessagingSettingsCard } from '../components/MessagingSettingsCard'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/tabs'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'

export function SettingsPage() {
    const navigate = useNavigate()
    const [user, setUser] = useState<AppUser | null>(null)
    const [loading, setLoading] = useState(true)
    const [changingPassword, setChangingPassword] = useState(false)
    const [passwordSent, setPasswordSent] = useState(false)
    const [editingName, setEditingName] = useState(false)
    const [fullName, setFullName] = useState('')
    const [savingName, setSavingName] = useState(false)

    useEffect(() => {
        fetchUser()
    }, [])

    const fetchUser = async () => {
        try {
            const { data: { user: authUser } } = await supabase.auth.getUser()
            if (!authUser) return

            const { data: profileUser, error: profileError } = await supabase
                .from('users')
                .select('*')
                .eq('id', authUser.id)
                .maybeSingle()

            if (profileError) throw profileError
            setUser(profileUser as AppUser)
            setFullName((profileUser as AppUser)?.full_name || '')
        } catch (error) {
            console.error('Error fetching user:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut()
            navigate('/login')
        } catch (error) {
            console.error('Error signing out:', error)
        }
    }

    const handleChangePassword = async () => {
        if (!user?.email) return
        setChangingPassword(true)
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
                redirectTo: `${window.location.origin}/settings`,
            })
            if (error) throw error
            setPasswordSent(true)
            setTimeout(() => setPasswordSent(false), 5000)
        } catch (error) {
            console.error('Error sending password reset:', error)
        } finally {
            setChangingPassword(false)
        }
    }

    const handleSaveName = async () => {
        if (!user) return
        setSavingName(true)
        try {
            const { error } = await supabase
                .from('users')
                .update({ full_name: fullName })
                .eq('id', user.id)
            if (error) throw error
            setUser({ ...user, full_name: fullName })
            setEditingName(false)
        } catch (error) {
            console.error('Error updating name:', error)
        } finally {
            setSavingName(false)
        }
    }

    const handleCancelEditName = () => {
        setFullName(user?.full_name || '')
        setEditingName(false)
    }

    const isAdmin = user?.role === 'admin' || user?.role === 'manager'

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8 text-[#94a3b8] animate-in fade-in duration-300">
                Cargando...
            </div>
        )
    }

    if (!user) {
        return (
            <div className="flex items-center justify-center p-8 text-[#94a3b8] animate-in fade-in duration-300">
                No se pudo cargar el perfil de usuario.
            </div>
        )
    }

    return (
        <div className="max-w-3xl mx-auto py-6 pb-20 flex flex-col gap-6 animate-in fade-in duration-300">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-[#0f172a] tracking-[-0.03em]">
                    Configuraci&oacute;n
                </h1>
                <p className="text-sm text-[#64748b] mt-1">
                    Gestiona tu cuenta, marca y preferencias
                </p>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="perfil">
                <TabsList className="w-full justify-start bg-[#f1f5f9] rounded-[10px] p-1">
                    <TabsTrigger value="perfil" className="gap-1.5 rounded-[8px] data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <User size={15} />
                        Perfil
                    </TabsTrigger>
                    {isAdmin && (
                        <TabsTrigger value="marca" className="gap-1.5 rounded-[8px] data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <Palette size={15} />
                            Marca
                        </TabsTrigger>
                    )}
                    {isAdmin && (
                        <TabsTrigger value="mensajeria" className="gap-1.5 rounded-[8px] data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <MessageSquare size={15} />
                            Mensajer&iacute;a
                        </TabsTrigger>
                    )}
                    <TabsTrigger value="peligro" className="gap-1.5 rounded-[8px] data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <ShieldAlert size={15} />
                        Peligro
                    </TabsTrigger>
                </TabsList>

                {/* Profile Tab */}
                <TabsContent value="perfil" className="mt-4">
                    <Card>
                        <CardContent className="p-6 flex flex-col gap-6">
                            {/* User Info */}
                            <div>
                                <h3 className="text-xs font-bold text-[#64748b] uppercase tracking-[0.05em] mb-3">
                                    Informaci&oacute;n de Usuario
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="flex items-center gap-3 p-3 rounded-[10px] bg-[#f8fafc] border border-[#e2e8f0]">
                                        <Mail size={16} className="text-[#64748b] shrink-0" />
                                        <div>
                                            <div className="text-[11px] font-semibold text-[#64748b] uppercase">Correo</div>
                                            <div className="text-sm font-semibold text-[#0f172a]">{user.email}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 rounded-[10px] bg-[#f8fafc] border border-[#e2e8f0]">
                                        <Calendar size={16} className="text-[#64748b] shrink-0" />
                                        <div>
                                            <div className="text-[11px] font-semibold text-[#64748b] uppercase">Registro</div>
                                            <div className="text-sm font-semibold text-[#0f172a]">
                                                {new Date(user.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="h-px bg-[#e2e8f0]" />

                            {/* Editable Name */}
                            <div>
                                <h3 className="text-xs font-bold text-[#64748b] uppercase tracking-[0.05em] mb-3">
                                    Nombre Completo
                                </h3>
                                {editingName ? (
                                    <div className="flex items-center gap-2 max-w-md">
                                        <Input
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            placeholder="Tu nombre completo"
                                            className="flex-1"
                                        />
                                        <Button
                                            size="icon"
                                            onClick={handleSaveName}
                                            disabled={savingName}
                                        >
                                            <Check size={16} />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            onClick={handleCancelEditName}
                                        >
                                            <X size={16} />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 p-3 rounded-[10px] bg-[#f8fafc] border border-[#e2e8f0] max-w-md">
                                        <User size={16} className="text-[#64748b] shrink-0" />
                                        <div className="flex-1">
                                            <div className="text-sm font-semibold text-[#0f172a]">
                                                {user.full_name || 'Sin nombre'}
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setEditingName(true)}
                                            className="gap-1"
                                        >
                                            <Pencil size={14} />
                                            Editar
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Divider */}
                            <div className="h-px bg-[#e2e8f0]" />

                            {/* Password Reset */}
                            <div>
                                <h3 className="text-xs font-bold text-[#64748b] uppercase tracking-[0.05em] mb-3">
                                    Contrase&ntilde;a
                                </h3>
                                <div className="flex items-center justify-between p-3 rounded-[10px] bg-[#f8fafc] border border-[#e2e8f0] max-w-md">
                                    <div className="flex items-center gap-3">
                                        <KeyRound size={16} className="text-[#64748b] shrink-0" />
                                        <div>
                                            <div className="text-sm font-semibold text-[#0f172a]">Cambiar contrase&ntilde;a</div>
                                            <div className="text-xs text-[#64748b]">
                                                Se enviar&aacute; un enlace a {user.email}
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant={passwordSent ? 'secondary' : 'outline'}
                                        onClick={handleChangePassword}
                                        disabled={changingPassword || passwordSent}
                                        className={passwordSent ? 'bg-green-50 text-green-700 border-green-200' : ''}
                                    >
                                        {changingPassword ? 'Enviando...' : passwordSent ? 'Enlace enviado' : 'Enviar enlace'}
                                    </Button>
                                </div>
                                {passwordSent && (
                                    <p className="text-xs text-[#10b981] mt-2 font-medium">
                                        Se ha enviado un enlace de restablecimiento a {user.email}
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Branding Tab (admin only) */}
                {isAdmin && (
                    <TabsContent value="marca" className="mt-4">
                        <Card>
                            <CardContent className="p-6">
                                <BrandingSettingsCard />
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}

                {/* Messaging Tab (admin only) */}
                {isAdmin && (
                    <TabsContent value="mensajeria" className="mt-4">
                        <MessagingSettingsCard />
                    </TabsContent>
                )}

                {/* Danger Zone Tab */}
                <TabsContent value="peligro" className="mt-4">
                    <Card className="border-red-200">
                        <CardContent className="p-6 flex flex-col gap-4">
                            {/* Logout */}
                            <div className="flex items-center justify-between p-4 rounded-[10px] bg-red-50 border border-red-200">
                                <div className="flex items-center gap-3">
                                    <LogOut size={18} className="text-red-600" />
                                    <div>
                                        <div className="text-sm font-semibold text-red-900">Cerrar Sesi&oacute;n</div>
                                        <div className="text-xs text-red-700">
                                            Se cerrar&aacute; tu sesi&oacute;n activa en este dispositivo
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleLogout}
                                    className="border-red-300 text-red-600 hover:bg-red-100 hover:text-red-700"
                                >
                                    Cerrar sesi&oacute;n
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
