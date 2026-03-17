import { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { Send, Phone, Mail, User, Paperclip, X, FileIcon, Download, FileText } from 'lucide-react';
import { Message, uploadAttachment } from '../lib/messaging-service';

interface ChatWindowProps {
    customerName: string;
    customerContact: string;
    messages: Message[];
    onSendMessage: (content: string, subject?: string, attachments?: Message['attachments']) => void;
    isLoading?: boolean;
    channel: 'email' | 'whatsapp';
    disableInput?: boolean;
}

const STYLES = {
    container: {
        display: 'flex',
        flexDirection: 'column' as const,
        height: '100%',
        backgroundColor: '#ffffff',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8faff 100%)'
    },
    header: {
        padding: '1rem',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backdropFilter: 'blur(12px)',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        position: 'sticky' as const,
        top: 0,
        zIndex: 10,
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
    },
    avatar: {
        width: '2.5rem',
        height: '2.5rem',
        backgroundColor: '#eff6ff',
        borderRadius: '9999px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#2563eb',
        boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)'
    },
    messagesArea: {
        flex: 1,
        overflowY: 'auto' as const,
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '1rem',
        backgroundColor: 'transparent',
        backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)',
        backgroundSize: '20px 20px'
    },
    emptyState: {
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        opacity: 0.4
    },
    inputArea: {
        padding: '1rem',
        borderTop: '1px solid #e5e7eb',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.05)'
    },
    sendButton: {
        height: '42px',
        width: '42px',
        borderRadius: '0.75rem',
        boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)',
        transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        cursor: 'pointer',
        background: '#2563eb',
        color: 'white'
    },
    attachmentPreview: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem',
        background: '#f3f4f6',
        borderRadius: '0.5rem',
        fontSize: '0.75rem',
        marginBottom: '0.5rem',
        border: '1px solid #e5e7eb'
    }
};

export function ChatWindow({ customerName, customerContact, messages, onSendMessage, isLoading, channel, disableInput = false }: ChatWindowProps) {
    const [newMessage, setNewMessage] = useState('');
    const [subject, setSubject] = useState('');
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSend = async () => {
        if (!newMessage.trim() && selectedFiles.length === 0) return;

        setIsUploading(true);
        try {
            const attachments: Message['attachments'] = [];

            for (const file of selectedFiles) {
                const uploaded = await uploadAttachment(file);
                attachments.push(uploaded);
            }

            onSendMessage(newMessage, channel === 'email' ? subject : undefined, attachments.length > 0 ? attachments : undefined);

            setNewMessage('');
            setSubject('');
            setSelectedFiles([]);
        } catch (error) {
            console.error("Error sending message:", error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey && !isUploading) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div style={STYLES.container}>
            {/* Header */}
            <div style={STYLES.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={STYLES.avatar}>
                        <User size={20} />
                    </div>
                    <div>
                        <div style={{ fontWeight: 600, color: '#111827', lineHeight: 1.2, margin: 0, fontSize: '1rem' }}>{customerName}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#6b7280', marginTop: '0.125rem' }}>
                            {channel === 'whatsapp' ? <Phone size={12} style={{ color: '#22c55e' }} /> : <Mail size={12} style={{ color: '#60a5fa' }} />}
                            <span style={{ opacity: 0.8 }}>{customerContact}</span>
                        </div>
                    </div>
                </div>
                <div>
                    <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        textTransform: 'capitalize',
                        backgroundColor: channel === 'whatsapp' ? '#f0fdf4' : '#eff6ff',
                        color: channel === 'whatsapp' ? '#15803d' : '#1d4ed8',
                        border: `1px solid ${channel === 'whatsapp' ? '#bbf7d0' : '#bfdbfe'}`
                    }}>
                        {channel}
                    </span>
                </div>
            </div>

            {/* Messages Area */}
            <div style={STYLES.messagesArea}>
                {messages.length === 0 ? (
                    <div style={STYLES.emptyState}>
                        <div style={{ padding: '1rem', background: '#f3f4f6', borderRadius: '9999px', marginBottom: '0.75rem' }}>
                            <Send size={32} style={{ color: '#9ca3af' }} />
                        </div>
                        <p style={{ color: '#6b7280', fontWeight: 500, margin: 0 }}>No hay mensajes todavía. Inicia la conversación.</p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg.id}
                            style={{ width: '100%', display: 'flex', justifyContent: msg.direction === 'inbound' ? 'flex-start' : 'flex-end' }}
                        >
                            <div
                                style={{
                                    maxWidth: '75%',
                                    padding: '0.875rem',
                                    borderRadius: '1rem',
                                    fontSize: '14px',
                                    position: 'relative',
                                    boxShadow: msg.direction === 'inbound' ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : '0 10px 15px -3px rgba(59, 130, 246, 0.2)',
                                    backgroundColor: msg.direction === 'inbound' ? '#ffffff' : '#2563eb',
                                    color: msg.direction === 'inbound' ? '#1f2937' : '#ffffff',
                                    border: msg.direction === 'inbound' ? '1px solid #f3f4f6' : 'none',
                                    borderBottomLeftRadius: msg.direction === 'inbound' ? '0' : '1rem',
                                    borderBottomRightRadius: msg.direction === 'inbound' ? '1rem' : '0',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.5rem'
                                }}
                            >
                                {msg.subject && (
                                    <p style={{
                                        margin: 0,
                                        fontWeight: 'bold',
                                        fontSize: '12px',
                                        opacity: 0.9,
                                        borderBottom: msg.direction === 'inbound' ? '1px solid #f1f5f9' : '1px solid rgba(255,255,255,0.2)',
                                        paddingBottom: '0.25rem'
                                    }}>
                                        Asunto: {msg.subject}
                                    </p>
                                )}

                                {msg.content.trim().startsWith('<') ? (
                                    <div
                                        style={{ margin: 0, lineHeight: 1.6, fontSize: '13px' }}
                                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(msg.content) }}
                                    />
                                ) : (
                                    <p style={{ margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                                )}

                                {msg.attachments && msg.attachments.length > 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                                        {msg.attachments.map((att, idx) => (
                                            <a
                                                key={idx}
                                                href={att.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                    padding: '0.5rem',
                                                    background: msg.direction === 'inbound' ? '#f8fafc' : 'rgba(255,255,255,0.1)',
                                                    borderRadius: '0.5rem',
                                                    textDecoration: 'none',
                                                    color: 'inherit',
                                                    border: msg.direction === 'inbound' ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.2)'
                                                }}
                                            >
                                                <FileIcon style={{ width: 14, height: 14 }} />
                                                <span style={{ fontSize: '11px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
                                                <Download style={{ width: 12, height: 12 }} />
                                            </a>
                                        ))}
                                    </div>
                                )}

                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.375rem',
                                    marginTop: '0.25rem',
                                    justifyContent: 'flex-end'
                                }}>
                                    <span style={{
                                        fontSize: '10px',
                                        fontWeight: 500,
                                        letterSpacing: '0.025em',
                                        textTransform: 'uppercase' as const,
                                        color: msg.direction === 'inbound' ? '#9ca3af' : 'rgba(219, 234, 254, 0.7)'
                                    }}>
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {msg.status && msg.direction !== 'inbound' && (
                                        <span style={{
                                            fontSize: '10px',
                                            fontWeight: 'bold',
                                            color: 'rgba(191, 219, 254, 0.8)'
                                        }}>
                                            • {msg.status.toUpperCase()}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div style={STYLES.inputArea}>
                {/* Selected Files Preview */}
                {selectedFiles.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        {selectedFiles.map((file, i) => (
                            <div key={i} style={STYLES.attachmentPreview}>
                                <FileText size={12} style={{ color: '#3b82f6' }} />
                                <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                                <button
                                    onClick={() => removeFile(i)}
                                    style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {channel === 'email' && (
                    <div style={{ marginBottom: '0.75rem' }}>
                        <input
                            placeholder="Asunto del correo..."
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            disabled={isLoading || isUploading || disableInput}
                            style={{
                                width: '100%',
                                height: '36px',
                                fontSize: '13px',
                                borderRadius: '0.5rem',
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                padding: '0 0.75rem'
                            }}
                        />
                    </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading || isUploading || disableInput}
                        style={{
                            padding: '0.5rem',
                            borderRadius: '0.5rem',
                            background: '#f1f5f9',
                            color: '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            alignSelf: 'center',
                            height: '42px',
                            width: '42px',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <Paperclip size={20} />
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        multiple
                        style={{ display: 'none' }}
                    />

                    <div style={{ flex: 1, position: 'relative' }}>
                        <input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder={disableInput ? "Selecciona un contacto..." : "Escribe un mensaje..."}
                            onKeyDown={handleKeyDown}
                            style={{
                                width: '100%',
                                backgroundColor: '#f9fafb',
                                border: '1px solid #e5e7eb',
                                padding: '0.75rem 1rem',
                                borderRadius: '0.75rem',
                                transition: 'all 0.2s',
                                fontSize: '14px'
                            }}
                            disabled={isLoading || isUploading || disableInput}
                        />
                    </div>
                    <button
                        onClick={handleSend}
                        disabled={isLoading || isUploading || (!newMessage.trim() && selectedFiles.length === 0) || disableInput}
                        style={{
                            ...STYLES.sendButton,
                            opacity: (isLoading || isUploading || (!newMessage.trim() && selectedFiles.length === 0) || disableInput) ? 0.5 : 1
                        }}
                    >
                        {isUploading ? (
                            <div style={{ width: '20px', height: '20px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                        ) : (
                            <Send size={20} />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
