import React, { useState, useEffect, useMemo } from 'react';
import type { WebmailAccount, EmailMessage, EmailAttachment, User } from '../types';
import { supabase } from '../supabaseClient';

interface WebmailProps {
    currentUser: User | null;
}

const DEFAULT_ACCOUNTS: WebmailAccount[] = [
    {
        id: 'acc-1',
        email: 'sales@blueamp.cnergy.co.in',
        senderName: 'Bluamp Sales & Operations',
        imapHost: 'mail.blueamp.cnergy.co.in',
        imapPort: 993,
        smtpHost: 'mail.blueamp.cnergy.co.in',
        smtpPort: 465,
        username: 'sales@blueamp.cnergy.co.in',
        password: '',
        isDefault: true,
    },
    {
        id: 'acc-2',
        email: 'support@blueamp.cnergy.co.in',
        senderName: 'Bluamp Technical Support',
        imapHost: 'mail.blueamp.cnergy.co.in',
        imapPort: 993,
        smtpHost: 'mail.blueamp.cnergy.co.in',
        smtpPort: 465,
        username: 'support@blueamp.cnergy.co.in',
        password: '',
        isDefault: false,
    }
];

const INITIAL_SAMPLE_EMAILS: EmailMessage[] = [
    {
        id: 'email-1',
        accountEmail: 'sales@blueamp.cnergy.co.in',
        folder: 'inbox',
        from: 'EVE Energy Co. <sales@eveenergy.com>',
        to: 'sales@blueamp.cnergy.co.in',
        subject: 'Quotation: Grade A 3.2V 280Ah LFP Prismatic Cells (Batch #8492)',
        date: new Date(Date.now() - 3600000 * 2).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
        timestamp: Date.now() - 3600000 * 2,
        snippet: 'Dear Bluamp Team, Please find attached our updated price list for Grade A 3.2V 280Ah LiFePO4 cells for immediate Q3 dispatch...',
        bodyHtml: `
            <div style="font-family: Inter, sans-serif; color: #1e293b; line-height: 1.6;">
                <p>Dear Bluamp Energies Team,</p>
                <p>Thank you for reaching out regarding your bulk raw material requirements for your 48V / 100Ah modular battery line.</p>
                <p>We are pleased to offer our updated pricing for <strong>Grade A 3.2V 280Ah LiFePO4 Prismatic Cells</strong>:</p>
                <ul>
                    <li><strong>Unit Price:</strong> ₹4,250 / cell (Excl. GST)</li>
                    <li><strong>Batch Size:</strong> 256 cells per pallet</li>
                    <li><strong>Cycle Life:</strong> &gt; 6,000 cycles @ 80% DOD</li>
                    <li><strong>Warranty:</strong> 5 Years Manufacturer Warranty</li>
                </ul>
                <p>Please review the attached datasheet & warranty protocol. Let us know if you require proforma invoicing.</p>
                <br/>
                <p>Best regards,<br/><strong>Chen Wei</strong><br/>Global Sales Director | EVE Energy Co.</p>
            </div>
        `,
        isUnread: true,
        isStarred: true,
        hasAttachments: true,
        attachments: [
            { filename: 'EVE_280Ah_Datasheet_v4.pdf', size: '2.4 MB', type: 'application/pdf' },
            { filename: 'Warranty_Protocol_2026.pdf', size: '1.1 MB', type: 'application/pdf' }
        ]
    },
    {
        id: 'email-2',
        accountEmail: 'sales@blueamp.cnergy.co.in',
        folder: 'inbox',
        from: 'GST Tax Portal <no-reply@gst.gov.in>',
        to: 'sales@blueamp.cnergy.co.in',
        subject: 'E-Way Bill Generated: EWB #849201948123 (Outward Goods)',
        date: new Date(Date.now() - 3600000 * 6).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
        timestamp: Date.now() - 3600000 * 6,
        snippet: 'E-Way Bill 849201948123 has been generated for consignment value Rs. 4,85,000 shipped to Cnergy Solar Grid Solutions...',
        bodyHtml: `
            <div style="font-family: Arial, sans-serif; color: #334155; line-height: 1.5;">
                <h3 style="color: #205f64; margin-top: 0;">Government of India - GST E-Way Bill System</h3>
                <p>This is an automated notification regarding E-Way Bill generation:</p>
                <table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 13px;">
                    <tr style="background: #f1f5f9;"><td style="padding: 8px; border: 1px solid #cbd5e1;"><strong>E-Way Bill No:</strong></td><td style="padding: 8px; border: 1px solid #cbd5e1;">849201948123</td></tr>
                    <tr><td style="padding: 8px; border: 1px solid #cbd5e1;"><strong>Generator:</strong></td><td style="padding: 8px; border: 1px solid #cbd5e1;">Bluamp Energies Pvt Ltd</td></tr>
                    <tr style="background: #f1f5f9;"><td style="padding: 8px; border: 1px solid #cbd5e1;"><strong>Recipient:</strong></td><td style="padding: 8px; border: 1px solid #cbd5e1;">Cnergy Solar Grid Solutions</td></tr>
                    <tr><td style="padding: 8px; border: 1px solid #cbd5e1;"><strong>Consignment Value:</strong></td><td style="padding: 8px; border: 1px solid #cbd5e1;">₹ 4,85,000/-</td></tr>
                    <tr style="background: #f1f5f9;"><td style="padding: 8px; border: 1px solid #cbd5e1;"><strong>Valid Until:</strong></td><td style="padding: 8px; border: 1px solid #cbd5e1;">28-Jul-2026 23:59 PM</td></tr>
                </table>
                <p>Download your official GST compliance copy from the GST portal.</p>
            </div>
        `,
        isUnread: false,
        isStarred: false,
        hasAttachments: false
    },
    {
        id: 'email-3',
        accountEmail: 'support@blueamp.cnergy.co.in',
        folder: 'inbox',
        from: 'Rajesh Sharma <rajesh@cnergysolar.com>',
        to: 'support@blueamp.cnergy.co.in',
        subject: 'Warranty Registration & BMS Firmware Inquiry - Order #BLU-9021',
        date: new Date(Date.now() - 3600000 * 24).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
        timestamp: Date.now() - 3600000 * 24,
        snippet: 'Hi Bluamp Support, We commissioned 10 units of your 48V 100Ah lithium storage packs yesterday. We would like to confirm RS485 protocol details...',
        bodyHtml: `
            <div style="font-family: sans-serif; color: #1f2937;">
                <p>Hi Bluamp Support Team,</p>
                <p>We recently commissioned 10 units of your <strong>Bluamp Pro 48V 100Ah Lithium Storage Packs</strong> (Serial range: <code>BLU-2026-0401</code> to <code>BLU-2026-0410</code>) at our Pune commercial site.</p>
                <p>The system is performing smoothly. Could you please share:</p>
                <ol>
                    <li>The RS485 / CANbus pinout diagram for Deye Inverter integration.</li>
                    <li>Official warranty registration confirmation certificate.</li>
                </ol>
                <p>Thanks & Regards,<br/><strong>Rajesh Sharma</strong><br/>Lead Technical Engineer | Cnergy Solar Ltd</p>
            </div>
        `,
        isUnread: true,
        isStarred: true,
        hasAttachments: false
    }
];

export default function Webmail({ currentUser }: WebmailProps) {
    // Accounts state
    const [accounts, setAccounts] = useState<WebmailAccount[]>(() => {
        try {
            const saved = localStorage.getItem('bluamp_webmail_accounts');
            return saved ? JSON.parse(saved) : DEFAULT_ACCOUNTS;
        } catch {
            return DEFAULT_ACCOUNTS;
        }
    });

    const [selectedAccountEmail, setSelectedAccountEmail] = useState<string>(() => {
        return accounts.find(a => a.isDefault)?.email || accounts[0]?.email || 'sales@blueamp.cnergy.co.in';
    });

    // Active account object
    const activeAccount = useMemo(() => {
        return accounts.find(a => a.email === selectedAccountEmail) || accounts[0] || DEFAULT_ACCOUNTS[0];
    }, [accounts, selectedAccountEmail]);

    // Emails state
    const [emails, setEmails] = useState<EmailMessage[]>(() => {
        try {
            const saved = localStorage.getItem('bluamp_webmail_messages');
            return saved ? JSON.parse(saved) : INITIAL_SAMPLE_EMAILS;
        } catch {
            return INITIAL_SAMPLE_EMAILS;
        }
    });

    // Active folder & filters
    const [activeFolder, setActiveFolder] = useState<'inbox' | 'starred' | 'sent' | 'drafts' | 'trash'>('inbox');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

    // Syncing status
    const [isFetching, setIsFetching] = useState(false);
    const [fetchStatusMessage, setFetchStatusMessage] = useState<string | null>(null);

    // Modals
    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

    // Compose Form
    const [composeForm, setComposeForm] = useState({
        to: '',
        cc: '',
        subject: '',
        body: '',
        attachmentName: '',
        attachmentBase64: '',
    });
    const [isSending, setIsSending] = useState(false);
    const [sendFeedback, setSendFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Account Form state
    const [accountForm, setAccountForm] = useState<WebmailAccount>({
        id: '',
        email: '',
        senderName: '',
        imapHost: 'mail.blueamp.cnergy.co.in',
        imapPort: 993,
        smtpHost: 'mail.blueamp.cnergy.co.in',
        smtpPort: 465,
        username: '',
        password: '',
        isDefault: false
    });
    const [testingConnection, setTestingConnection] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    // Save state changes to localStorage & Supabase
    useEffect(() => {
        try {
            localStorage.setItem('bluamp_webmail_accounts', JSON.stringify(accounts));
        } catch (e) {}
    }, [accounts]);

    useEffect(() => {
        try {
            localStorage.setItem('bluamp_webmail_messages', JSON.stringify(emails));
        } catch (e) {}
    }, [emails]);

    // Load accounts from Supabase table if available
    useEffect(() => {
        const loadSupabaseAccounts = async () => {
            try {
                const { data, error } = await supabase.from('webmail_accounts').select('*');
                if (!error && data && data.length > 0) {
                    const mapped: WebmailAccount[] = data.map((item: any) => ({
                        id: item.id,
                        email: item.email,
                        senderName: item.sender_name || item.email,
                        imapHost: item.imap_host || 'mail.blueamp.cnergy.co.in',
                        imapPort: item.imap_port || 993,
                        smtpHost: item.smtp_host || 'mail.blueamp.cnergy.co.in',
                        smtpPort: item.smtp_port || 465,
                        username: item.auth_username || item.email,
                        password: item.auth_password || '',
                        isDefault: item.is_default || false,
                    }));
                    setAccounts(mapped);
                }
            } catch (e) {
                console.log('Supabase webmail_accounts sync notice:', e);
            }
        };
        loadSupabaseAccounts();
    }, []);

    // Filtered Email List
    const folderEmails = useMemo(() => {
        return emails.filter(m => {
            if (activeFolder === 'starred') return m.isStarred && m.folder !== 'trash';
            return m.folder === activeFolder;
        });
    }, [emails, activeFolder]);

    const filteredEmails = useMemo(() => {
        if (!searchQuery.trim()) return folderEmails;
        const q = searchQuery.toLowerCase();
        return folderEmails.filter(e =>
            e.subject.toLowerCase().includes(q) ||
            e.from.toLowerCase().includes(q) ||
            e.snippet.toLowerCase().includes(q) ||
            e.to.toLowerCase().includes(q)
        );
    }, [folderEmails, searchQuery]);

    // Selected email object
    const selectedEmail = useMemo(() => {
        return emails.find(e => e.id === selectedEmailId) || null;
    }, [emails, selectedEmailId]);

    // Count unread
    const unreadCount = useMemo(() => {
        return emails.filter(e => e.folder === 'inbox' && e.isUnread).length;
    }, [emails]);

    // Select email & mark read
    const handleSelectEmail = (email: EmailMessage) => {
        setSelectedEmailId(email.id);
        if (email.isUnread) {
            setEmails(prev => prev.map(e => e.id === email.id ? { ...e, isUnread: false } : e));
        }
    };

    // Toggle Star
    const handleToggleStar = (emailId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setEmails(prev => prev.map(m => m.id === emailId ? { ...m, isStarred: !m.isStarred } : m));
    };

    // Delete Email
    const handleDeleteEmail = (emailId: string) => {
        setEmails(prev => prev.map(m => {
            if (m.id === emailId) {
                if (m.folder === 'trash') return null as any;
                return { ...m, folder: 'trash' };
            }
            return m;
        }).filter(Boolean));
        if (selectedEmailId === emailId) {
            setSelectedEmailId(null);
        }
    };

    // IMAP Fetch Call
    const handleRefreshImap = async () => {
        setIsFetching(true);
        setFetchStatusMessage('Connecting to IMAP server...');
        try {
            const res = await fetch('/api/webmail-fetch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ account: activeAccount, mode: 'fetch' }),
            });
            const result = await res.json();
            if (result.success && Array.isArray(result.emails)) {
                if (result.emails.length === 0) {
                    setFetchStatusMessage('No new messages found on server.');
                } else {
                    setEmails(prev => {
                        const existingIds = new Set(prev.map(p => p.id));
                        const newOnes = result.emails.filter((e: any) => !existingIds.has(e.id));
                        return [...newOnes, ...prev];
                    });
                    setFetchStatusMessage(`Synced ${result.emails.length} emails from server!`);
                }
            } else {
                setFetchStatusMessage(`Sync Warning: ${result.error || 'Server returned no messages.'}`);
            }
        } catch (err: any) {
            setFetchStatusMessage(`Fetch Error: ${err.message || 'Could not reach server endpoint.'}`);
        } finally {
            setIsFetching(false);
            setTimeout(() => setFetchStatusMessage(null), 5000);
        }
    };

    // Test Connection Call
    const handleTestConnection = async () => {
        setTestingConnection(true);
        setTestResult(null);
        try {
            const res = await fetch('/api/webmail-fetch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ account: accountForm, mode: 'test' }),
            });
            const data = await res.json();
            if (data.success) {
                setTestResult({ success: true, message: data.message || 'Connection successful!' });
            } else {
                setTestResult({ success: false, message: data.error || 'Failed to connect.' });
            }
        } catch (err: any) {
            setTestResult({ success: false, message: err.message || 'Network error reaching server endpoint.' });
        } finally {
            setTestingConnection(false);
        }
    };

    // Save Account
    const handleSaveAccount = async () => {
        if (!accountForm.email || !accountForm.username) return;

        const updatedAccount: WebmailAccount = {
            ...accountForm,
            id: accountForm.id || `acc-${Date.now()}`
        };

        setAccounts(prev => {
            const exists = prev.some(a => a.id === updatedAccount.id);
            if (exists) {
                return prev.map(a => a.id === updatedAccount.id ? updatedAccount : a);
            }
            return [...prev, updatedAccount];
        });

        setSelectedAccountEmail(updatedAccount.email);
        setIsAccountModalOpen(false);

        // Sync to Supabase
        try {
            await supabase.from('webmail_accounts').upsert({
                id: updatedAccount.id,
                username: currentUser?.username || 'admin',
                email: updatedAccount.email,
                sender_name: updatedAccount.senderName,
                imap_host: updatedAccount.imapHost,
                imap_port: updatedAccount.imapPort,
                smtp_host: updatedAccount.smtpHost,
                smtp_port: updatedAccount.smtpPort,
                auth_username: updatedAccount.username,
                auth_password: updatedAccount.password,
                is_default: updatedAccount.isDefault,
                updated_at: Date.now()
            });
        } catch (e) {
            console.log('Account Supabase save warning:', e);
        }
    };

    // Handle File Attachment Selection
    const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setComposeForm(prev => ({
                    ...prev,
                    attachmentName: file.name,
                    attachmentBase64: reader.result as string
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    // Send Mail Handler
    const handleSendMail = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSending(true);
        setSendFeedback(null);

        try {
            const res = await fetch('/api/webmail-send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    account: activeAccount,
                    to: composeForm.to,
                    cc: composeForm.cc,
                    subject: composeForm.subject,
                    html: composeForm.body.replace(/\n/g, '<br/>'),
                    attachmentBase64: composeForm.attachmentBase64,
                    attachmentName: composeForm.attachmentName,
                })
            });

            const data = await res.json();
            if (data.success) {
                setSendFeedback({ type: 'success', text: 'Email sent successfully via SMTP!' });

                // Add to Sent folder locally
                const sentMessage: EmailMessage = {
                    id: `sent-${Date.now()}`,
                    accountEmail: activeAccount.email,
                    folder: 'sent',
                    from: `"${activeAccount.senderName}" <${activeAccount.email}>`,
                    to: composeForm.to,
                    subject: composeForm.subject,
                    date: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
                    timestamp: Date.now(),
                    snippet: composeForm.body.substring(0, 100),
                    bodyHtml: `<div style="font-family: Arial, sans-serif; padding: 10px; color: #333;">${composeForm.body.replace(/\n/g, '<br/>')}</div>`,
                    isUnread: false,
                    hasAttachments: Boolean(composeForm.attachmentName),
                    attachments: composeForm.attachmentName ? [{ filename: composeForm.attachmentName, size: 'Attached', type: 'application/octet-stream' }] : []
                };

                setEmails(prev => [sentMessage, ...prev]);

                setTimeout(() => {
                    setIsComposeOpen(false);
                    setComposeForm({ to: '', cc: '', subject: '', body: '', attachmentName: '', attachmentBase64: '' });
                    setSendFeedback(null);
                }, 1500);
            } else {
                setSendFeedback({ type: 'error', text: data.error || 'SMTP Dispatch Failed.' });
            }
        } catch (err: any) {
            setSendFeedback({ type: 'error', text: err.message || 'Network error reaching SMTP server endpoint.' });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-120px)] bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden text-slate-100 font-sans">
            
            {/* TOP HEADER & ACCOUNT BAR */}
            <div className="bg-slate-950 px-6 py-3.5 border-b border-slate-800/80 flex flex-wrap justify-between items-center gap-4">
                
                {/* Brand & Account Selector */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-[#205f64]/30 px-3 py-1.5 rounded-xl border border-[#205f64]/50">
                        <span className="text-xl">✉️</span>
                        <h2 className="text-sm font-black tracking-widest text-[#2ca4c2] uppercase font-brand">
                            Bluamp Webmail
                        </h2>
                    </div>

                    {/* Account Dropdown */}
                    <div className="relative">
                        <select
                            value={selectedAccountEmail}
                            onChange={(e) => setSelectedAccountEmail(e.target.value)}
                            className="bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#2ca4c2] cursor-pointer"
                        >
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.email}>
                                    {acc.senderName ? `${acc.senderName} (${acc.email})` : acc.email}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={() => {
                            setAccountForm({
                                id: '',
                                email: '',
                                senderName: '',
                                imapHost: 'mail.blueamp.cnergy.co.in',
                                imapPort: 993,
                                smtpHost: 'mail.blueamp.cnergy.co.in',
                                smtpPort: 465,
                                username: '',
                                password: '',
                                isDefault: false
                            });
                            setTestResult(null);
                            setIsAccountModalOpen(true);
                        }}
                        className="text-xs font-semibold text-slate-400 hover:text-[#2ca4c2] transition-colors flex items-center gap-1"
                    >
                        <span>➕ Add Account</span>
                    </button>
                </div>

                {/* Search Bar & Global Actions */}
                <div className="flex items-center gap-3">
                    <div className="relative w-64">
                        <input
                            type="text"
                            placeholder="Search email, sender, subject..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-900/90 border border-slate-700 text-xs rounded-xl pl-8 pr-3 py-2 text-slate-200 outline-none focus:border-[#2ca4c2] focus:ring-1 focus:ring-[#2ca4c2]"
                        />
                        <span className="absolute left-2.5 top-2.5 text-slate-500 text-xs">🔍</span>
                    </div>

                    {/* Fetch Refresh Button */}
                    <button
                        onClick={handleRefreshImap}
                        disabled={isFetching}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-2 rounded-xl border border-slate-700 transition-all flex items-center gap-1.5"
                        title="Sync via IMAP flow"
                    >
                        <span className={isFetching ? 'animate-spin' : ''}>🔄</span>
                        <span>{isFetching ? 'Syncing...' : 'Live Sync'}</span>
                    </button>

                    {/* Compose Button */}
                    <button
                        onClick={() => setIsComposeOpen(true)}
                        className="bg-gradient-to-r from-[#205f64] to-[#2ca4c2] hover:opacity-90 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md flex items-center gap-1.5"
                    >
                        <span>✏️ Compose</span>
                    </button>

                    {/* Account Settings Button */}
                    <button
                        onClick={() => {
                            setAccountForm(activeAccount);
                            setTestResult(null);
                            setIsAccountModalOpen(true);
                        }}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
                        title="Account Connection Settings"
                    >
                        ⚙️
                    </button>
                </div>
            </div>

            {/* SYNC NOTIFICATION BANNER */}
            {fetchStatusMessage && (
                <div className="bg-gradient-to-r from-[#205f64] to-slate-900 px-6 py-2 border-b border-slate-700/60 flex items-center justify-between text-xs text-cyan-200">
                    <span className="font-semibold">{fetchStatusMessage}</span>
                    <button onClick={() => setFetchStatusMessage(null)} className="text-slate-400 hover:text-white">✕</button>
                </div>
            )}

            {/* MAIN THREE-COLUMN WORKSPACE */}
            <div className="flex-1 flex overflow-hidden">
                
                {/* 1. SIDEBAR NAVIGATION */}
                <div className="w-56 bg-slate-950/80 border-r border-slate-800/80 p-3 flex flex-col justify-between shrink-0">
                    <div className="space-y-1">
                        <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                            Mailboxes ({activeAccount.email.split('@')[0]})
                        </div>

                        <button
                            onClick={() => { setActiveFolder('inbox'); setSelectedEmailId(null); }}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                activeFolder === 'inbox' ? 'bg-[#205f64] text-white shadow-md' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                            }`}
                        >
                            <span className="flex items-center gap-2.5">📬 Inbox</span>
                            {unreadCount > 0 && (
                                <span className="bg-[#2ca4c2] text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full">
                                    {unreadCount}
                                </span>
                            )}
                        </button>

                        <button
                            onClick={() => { setActiveFolder('starred'); setSelectedEmailId(null); }}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                activeFolder === 'starred' ? 'bg-[#205f64] text-white shadow-md' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                            }`}
                        >
                            <span className="flex items-center gap-2.5">⭐ Starred</span>
                            <span className="text-[10px] text-slate-500 font-semibold">
                                {emails.filter(e => e.isStarred && e.folder !== 'trash').length}
                            </span>
                        </button>

                        <button
                            onClick={() => { setActiveFolder('sent'); setSelectedEmailId(null); }}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                activeFolder === 'sent' ? 'bg-[#205f64] text-white shadow-md' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                            }`}
                        >
                            <span className="flex items-center gap-2.5">📤 Sent Items</span>
                            <span className="text-[10px] text-slate-500 font-semibold">
                                {emails.filter(e => e.folder === 'sent').length}
                            </span>
                        </button>

                        <button
                            onClick={() => { setActiveFolder('drafts'); setSelectedEmailId(null); }}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                activeFolder === 'drafts' ? 'bg-[#205f64] text-white shadow-md' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                            }`}
                        >
                            <span className="flex items-center gap-2.5">📝 Drafts</span>
                        </button>

                        <button
                            onClick={() => { setActiveFolder('trash'); setSelectedEmailId(null); }}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                activeFolder === 'trash' ? 'bg-[#205f64] text-white shadow-md' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                            }`}
                        >
                            <span className="flex items-center gap-2.5">🗑️ Trash</span>
                            <span className="text-[10px] text-slate-500 font-semibold">
                                {emails.filter(e => e.folder === 'trash').length}
                            </span>
                        </button>
                    </div>

                    {/* Server Host Info Box */}
                    <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-1">
                        <div className="text-[10px] font-bold text-[#2ca4c2] uppercase tracking-wider font-brand">Active IMAP Host</div>
                        <div className="text-[11px] font-mono text-slate-300 truncate">{activeAccount.imapHost}</div>
                        <div className="text-[10px] text-slate-500 flex justify-between">
                            <span>Port: {activeAccount.imapPort}</span>
                            <span className="text-emerald-400">SSL Ready</span>
                        </div>
                    </div>
                </div>

                {/* 2. EMAIL LIST PANEL */}
                <div className="w-80 sm:w-96 bg-slate-900 border-r border-slate-800/80 flex flex-col shrink-0">
                    <div className="p-3.5 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            {activeFolder} ({filteredEmails.length})
                        </span>
                        <span className="text-[10px] text-slate-500">
                            Sorted by recent
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
                        {filteredEmails.length > 0 ? (
                            filteredEmails.map(email => {
                                const isSelected = email.id === selectedEmailId;
                                return (
                                    <div
                                        key={email.id}
                                        onClick={() => handleSelectEmail(email)}
                                        className={`p-3.5 transition-all cursor-pointer relative ${
                                            isSelected ? 'bg-slate-800/90 border-l-4 border-l-[#2ca4c2]' : 'hover:bg-slate-800/40'
                                        } ${email.isUnread ? 'bg-slate-900/90' : 'opacity-80'}`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => handleToggleStar(email.id, e)}
                                                    className="text-xs hover:scale-125 transition-transform"
                                                >
                                                    {email.isStarred ? '⭐' : '☆'}
                                                </button>
                                                <span className={`text-xs font-bold truncate max-w-[180px] ${email.isUnread ? 'text-white' : 'text-slate-300'}`}>
                                                    {email.from.split('<')[0] || email.from}
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-slate-500 font-mono">
                                                {email.date.split(',')[0]}
                                            </span>
                                        </div>

                                        <h4 className={`text-xs mb-1 line-clamp-1 ${email.isUnread ? 'font-black text-slate-100' : 'font-semibold text-slate-300'}`}>
                                            {email.subject}
                                        </h4>

                                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                                            {email.snippet}
                                        </p>

                                        {email.hasAttachments && (
                                            <div className="mt-2 flex items-center gap-1 text-[10px] text-cyan-400 font-medium">
                                                <span>📎 Attachment ({email.attachments?.length || 1})</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="p-8 text-center text-slate-500 text-xs">
                                <span className="text-2xl block mb-2">📭</span>
                                No messages found in this folder.
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. EMAIL DETAIL READER */}
                <div className="flex-1 bg-slate-950/60 flex flex-col overflow-y-auto">
                    {selectedEmail ? (
                        <div className="p-6 max-w-4xl space-y-6">
                            
                            {/* Actions Header */}
                            <div className="flex flex-wrap justify-between items-center gap-3 pb-4 border-b border-slate-800">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            setComposeForm({
                                                to: selectedEmail.from.includes('<') ? selectedEmail.from.split('<')[1].replace('>', '') : selectedEmail.from,
                                                cc: '',
                                                subject: `Re: ${selectedEmail.subject}`,
                                                body: `\n\n--- On ${selectedEmail.date}, ${selectedEmail.from} wrote:\n${selectedEmail.snippet}`,
                                                attachmentName: '',
                                                attachmentBase64: ''
                                            });
                                            setIsComposeOpen(true);
                                        }}
                                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold border border-slate-700 transition-colors flex items-center gap-1.5"
                                    >
                                        <span>↩️ Reply</span>
                                    </button>

                                    <button
                                        onClick={() => {
                                            setComposeForm({
                                                to: '',
                                                cc: '',
                                                subject: `Fwd: ${selectedEmail.subject}`,
                                                body: `\n\n---------- Forwarded message ---------\nFrom: ${selectedEmail.from}\nDate: ${selectedEmail.date}\nSubject: ${selectedEmail.subject}\nTo: ${selectedEmail.to}\n\n${selectedEmail.snippet}`,
                                                attachmentName: '',
                                                attachmentBase64: ''
                                            });
                                            setIsComposeOpen(true);
                                        }}
                                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold border border-slate-700 transition-colors flex items-center gap-1.5"
                                    >
                                        <span>➡️ Forward</span>
                                    </button>

                                    <button
                                        onClick={(e) => handleToggleStar(selectedEmail.id, e)}
                                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold border border-slate-700 transition-colors"
                                    >
                                        {selectedEmail.isStarred ? '⭐ Starred' : '☆ Star'}
                                    </button>
                                </div>

                                <button
                                    onClick={() => handleDeleteEmail(selectedEmail.id)}
                                    className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded-lg text-xs font-bold border border-rose-800/60 transition-colors flex items-center gap-1"
                                >
                                    <span>🗑️ Delete</span>
                                </button>
                            </div>

                            {/* Email Meta */}
                            <div>
                                <h2 className="text-xl font-bold text-white mb-4 leading-snug">
                                    {selectedEmail.subject}
                                </h2>

                                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex justify-between items-start gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#205f64] to-[#2ca4c2] flex items-center justify-center text-white font-black text-sm shadow-md">
                                            {selectedEmail.from.substring(0, 1).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-100">{selectedEmail.from}</div>
                                            <div className="text-xs text-slate-400">To: <span className="text-slate-300">{selectedEmail.to}</span></div>
                                        </div>
                                    </div>
                                    <div className="text-right text-xs text-slate-400 font-mono">
                                        {selectedEmail.date}
                                    </div>
                                </div>
                            </div>

                            {/* Attachments list */}
                            {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                                <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Attachments ({selectedEmail.attachments.length})</div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {selectedEmail.attachments.map((att, idx) => (
                                            <div key={idx} className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex justify-between items-center">
                                                <div className="flex items-center gap-2 truncate">
                                                    <span className="text-base">📄</span>
                                                    <div className="truncate">
                                                        <div className="text-xs font-bold text-slate-200 truncate">{att.filename}</div>
                                                        <div className="text-[10px] text-slate-500">{att.size}</div>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => alert(`Simulated download for ${att.filename}`)}
                                                    className="text-xs font-bold text-[#2ca4c2] hover:underline"
                                                >
                                                    Download
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Body HTML */}
                            <div className="bg-white rounded-xl p-6 text-slate-900 shadow-inner min-h-[300px] border border-slate-700">
                                <div 
                                    dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }} 
                                />
                            </div>

                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8">
                            <span className="text-4xl mb-3">📧</span>
                            <p className="text-sm font-semibold">Select an email from the list to view full conversation details.</p>
                        </div>
                    )}
                </div>

            </div>

            {/* COMPOSE MODAL */}
            {isComposeOpen && (
                <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
                        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex justify-between items-center">
                            <h3 className="text-sm font-black text-[#2ca4c2] uppercase tracking-wider font-brand flex items-center gap-2">
                                <span>✏️ New Email Message</span>
                                <span className="text-xs font-normal text-slate-400">({activeAccount.email})</span>
                            </h3>
                            <button onClick={() => setIsComposeOpen(false)} className="text-slate-400 hover:text-white">✕</button>
                        </div>

                        <form onSubmit={handleSendMail} className="p-6 space-y-4">
                            {sendFeedback && (
                                <div className={`p-3 rounded-xl text-xs font-bold ${
                                    sendFeedback.type === 'success' ? 'bg-emerald-950 text-emerald-200 border border-emerald-800' : 'bg-rose-950 text-rose-200 border border-rose-800'
                                }`}>
                                    {sendFeedback.text}
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">To</label>
                                <input
                                    type="email"
                                    required
                                    placeholder="recipient@domain.com"
                                    value={composeForm.to}
                                    onChange={e => setComposeForm({ ...composeForm, to: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-[#2ca4c2]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">CC (Optional)</label>
                                <input
                                    type="email"
                                    placeholder="cc@domain.com"
                                    value={composeForm.cc}
                                    onChange={e => setComposeForm({ ...composeForm, cc: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-[#2ca4c2]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Subject</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Email Subject Line"
                                    value={composeForm.subject}
                                    onChange={e => setComposeForm({ ...composeForm, subject: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-[#2ca4c2]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Message Body</label>
                                <textarea
                                    rows={8}
                                    required
                                    placeholder="Write your email message here..."
                                    value={composeForm.body}
                                    onChange={e => setComposeForm({ ...composeForm, body: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none focus:ring-2 focus:ring-[#2ca4c2] resize-none leading-relaxed"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Attach File</label>
                                <input
                                    type="file"
                                    onChange={handleAttachmentChange}
                                    className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700"
                                />
                                {composeForm.attachmentName && (
                                    <span className="text-xs text-cyan-400 font-semibold mt-1 block">
                                        Attached: {composeForm.attachmentName}
                                    </span>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setIsComposeOpen(false)}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSending}
                                    className="px-6 py-2 bg-gradient-to-r from-[#205f64] to-[#2ca4c2] text-white rounded-xl text-xs font-bold shadow-md hover:opacity-90 disabled:opacity-50"
                                >
                                    {isSending ? 'Sending via SMTP...' : '🚀 Send Email'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ACCOUNT SETTINGS / CONNECTION MODAL */}
            {isAccountModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col text-slate-100">
                        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex justify-between items-center">
                            <h3 className="text-sm font-black text-[#2ca4c2] uppercase tracking-wider font-brand">
                                ⚙️ Webmail Connection Settings
                            </h3>
                            <button onClick={() => setIsAccountModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
                        </div>

                        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                            {testResult && (
                                <div className={`p-3 rounded-xl text-xs font-bold ${
                                    testResult.success ? 'bg-emerald-950 text-emerald-200 border border-emerald-800' : 'bg-rose-950 text-rose-200 border border-rose-800'
                                }`}>
                                    {testResult.message}
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    placeholder="sales@blueamp.cnergy.co.in"
                                    value={accountForm.email}
                                    onChange={e => setAccountForm({ ...accountForm, email: e.target.value, username: accountForm.username || e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-[#2ca4c2]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Display Sender Name</label>
                                <input
                                    type="text"
                                    placeholder="Bluamp Sales Team"
                                    value={accountForm.senderName}
                                    onChange={e => setAccountForm({ ...accountForm, senderName: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-[#2ca4c2]"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">IMAP Host Server</label>
                                    <input
                                        type="text"
                                        placeholder="mail.blueamp.cnergy.co.in"
                                        value={accountForm.imapHost}
                                        onChange={e => setAccountForm({ ...accountForm, imapHost: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-[#2ca4c2]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">IMAP Port</label>
                                    <input
                                        type="number"
                                        value={accountForm.imapPort}
                                        onChange={e => setAccountForm({ ...accountForm, imapPort: parseInt(e.target.value) || 993 })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-[#2ca4c2]"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">SMTP Host Server</label>
                                    <input
                                        type="text"
                                        placeholder="mail.blueamp.cnergy.co.in"
                                        value={accountForm.smtpHost}
                                        onChange={e => setAccountForm({ ...accountForm, smtpHost: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-[#2ca4c2]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">SMTP Port</label>
                                    <input
                                        type="number"
                                        value={accountForm.smtpPort}
                                        onChange={e => setAccountForm({ ...accountForm, smtpPort: parseInt(e.target.value) || 465 })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-[#2ca4c2]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Auth Username</label>
                                <input
                                    type="text"
                                    placeholder="sales@blueamp.cnergy.co.in"
                                    value={accountForm.username}
                                    onChange={e => setAccountForm({ ...accountForm, username: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-[#2ca4c2]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Auth Password</label>
                                <input
                                    type="password"
                                    placeholder="••••••••••••"
                                    value={accountForm.password || ''}
                                    onChange={e => setAccountForm({ ...accountForm, password: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-[#2ca4c2]"
                                />
                            </div>

                            <div className="pt-2 flex justify-between items-center">
                                <button
                                    type="button"
                                    onClick={handleTestConnection}
                                    disabled={testingConnection}
                                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl text-xs font-bold border border-slate-700"
                                >
                                    {testingConnection ? 'Testing handshake...' : '🔍 Test Connection'}
                                </button>

                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsAccountModalOpen(false)}
                                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSaveAccount}
                                        className="px-5 py-2 bg-[#205f64] hover:bg-[#18484c] text-white rounded-xl text-xs font-bold shadow-md"
                                    >
                                        Save Account
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
