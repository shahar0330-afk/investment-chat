'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import './globals.css';

const TOOL_LABELS = {
  get_fundamentals: 'בודק נתוני חברה',
  get_market_overview: 'סוקר מצב שוק',
  get_sector_stocks: 'סורק מניות בסקטור',
  get_etf_data: 'בודק קרנות סל',
  calculate_financial_plan: 'מחשב תכנית פיננסית',
  update_portfolio: 'מעדכן תמונת נכסים',
};

const WELCOME_CHIPS = [
  'רוצה לבנות תיק השקעות',
  'צריך לבדוק את הפנסיה שלי',
  'חושב לקחת משכנתא',
  'רוצה לדעת כמה מס אני משלם',
  'צריך ביטוח חיים?',
  'איך מתכננים פרישה?',
];

// ─── Helpers ───

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function getChatTitle(messages) {
  const firstUser = messages.find(m => m.role === 'user');
  if (!firstUser) return 'שיחה חדשה';
  const text = typeof firstUser.content === 'string'
    ? firstUser.content
    : firstUser._display?.find(b => b.type === 'text')?.text || 'שיחה חדשה';
  return text.slice(0, 40) + (text.length > 40 ? '...' : '');
}

function formatMessage(text) {
  if (!text) return '';
  let html = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  html = html.replace(/\n/g, '<br/>');
  html = html.replace(/<br\/>\s*<li>/g, '<li>');
  html = html.replace(/<\/li>\s*<br\/>/g, '</li>');
  html = html.replace(/<br\/>\s*<\/ul>/g, '</ul>');
  html = html.replace(/<br\/>\s*<h3>/g, '<h3>');
  return html;
}

function renderMessageContent(msg) {
  if (typeof msg.content === 'string') {
    return <div className="message-bubble" dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />;
  }
  if (Array.isArray(msg.content)) {
    return (
      <div className="message-bubble">
        {msg.content.map((block, i) => {
          if (block.type === 'text') return <div key={i} dangerouslySetInnerHTML={{ __html: formatMessage(block.text) }} />;
          if (block.type === 'file_info') return (
            <div key={i} className="file-badge">
              <span className="file-icon">{block.isImage ? '🖼️' : '📄'}</span>
              <span>{block.fileName}</span>
            </div>
          );
          return null;
        })}
      </div>
    );
  }
  return null;
}

// ─── Storage helpers ───

function loadFromStorage(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch { return fallback; }
}

function saveToStorage(key, value) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// ─── Asset categories ───

const ASSET_CATEGORIES = [
  { id: 'bank', label: 'חשבון בנק', color: '#1B6EC2' },
  { id: 'stocks', label: 'תיק מניות', color: '#34A853' },
  { id: 'pension', label: 'פנסיה', color: '#7B61FF' },
  { id: 'gemel', label: 'קופת גמל', color: '#E5A127' },
  { id: 'hishtalmut', label: 'קרן השתלמות', color: '#00ACC1' },
  { id: 'savings', label: 'חיסכון / פיקדון', color: '#43A047' },
  { id: 'realestate', label: 'נדל"ן', color: '#8D6E63' },
  { id: 'crypto', label: 'קריפטו', color: '#F7931A' },
  { id: 'insurance', label: 'ביטוח מנהלים', color: '#E8735A' },
  { id: 'cash', label: 'מזומן', color: '#26A69A' },
  { id: 'loan', label: 'הלוואה / משכנתא', color: '#EF5350' },
  { id: 'other', label: 'אחר', color: '#78909C' },
];

const ASSET_ICONS = {
  bank: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="14" rx="3"/><path d="M6 6V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"/><line x1="2" y1="11" x2="22" y2="11"/></svg>,
  stocks: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
  pension: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-6h6v6"/><path d="M9 9h0"/><path d="M15 9h0"/></svg>,
  gemel: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
  hishtalmut: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 3 3 6 3s6-1 6-3v-5"/></svg>,
  savings: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2"/><path d="M2 9.5c1 0 2 1 2 2.5"/><circle cx="16" cy="11" r=".5" fill={c}/></svg>,
  realestate: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  crypto: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.5 8h5a2 2 0 0 1 0 4H9.5V8z"/><path d="M9.5 12h5.5a2 2 0 0 1 0 4H9.5V12z"/><path d="M11 6v2m0 8v2m2-12v2m0 8v2"/></svg>,
  insurance: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>,
  cash: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><circle cx="12" cy="12" r="4"/><path d="M1 10h2m18 0h2M1 14h2m18 0h2"/></svg>,
  loan: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  other: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
};

function formatCurrency(num) {
  if (num >= 1000000) return `₪${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `₪${(num / 1000).toFixed(0)}K`;
  return `₪${num.toLocaleString()}`;
}

// ─── Component ───

export default function ChatPage() {
  const [loaded, setLoaded] = useState(false);
  const [theme, setTheme] = useState('light');
  const [user, setUser] = useState(null); // { id, name, email }
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [chats, setChats] = useState({});
  const [activeChatId, setActiveChatId] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [toolStatus, setToolStatus] = useState(null);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [assetsOpen, setAssetsOpen] = useState(true);
  const [assets, setAssets] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAsset, setNewAsset] = useState({ category: 'stocks', name: '', value: '', detail: '' });
  const saveTimer = useRef(null);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const dragCounter = useRef(0);

  // Check session on load
  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(data => {
      if (data.user) {
        setUser(data.user);
        // Load conversations from server
        fetch('/api/conversations').then(r => r.json()).then(convs => {
          if (convs && !convs.error) setChats(convs);
        });
      }
      // Load assets from server
      fetch('/api/assets').then(r => r.json()).then(a => {
        if (Array.isArray(a)) setAssets(a);
      }).catch(() => {});
      setActiveChatId(loadFromStorage('noam_active_chat', null));
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  // Theme: load from localStorage on mount, sync to document
  useEffect(() => {
    const saved = localStorage.getItem('noam_theme');
    if (saved === 'dark' || saved === 'light') setTheme(saved);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('noam_theme', theme);
  }, [theme]);

  // Save chats to server (debounced)
  useEffect(() => {
    if (!user || Object.keys(chats).length === 0) return;
    // Also keep localStorage as fallback
    saveToStorage('noam_chats', chats);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chats),
      }).catch(() => {});
    }, 2000);
  }, [chats, user]);

  useEffect(() => {
    if (!loaded || !user) return;
    // Save assets to server (debounced)
    const t = setTimeout(() => {
      fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assets),
      }).catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [assets, loaded, user]);

  useEffect(() => {
    if (activeChatId) saveToStorage('noam_active_chat', activeChatId);
  }, [activeChatId]);

  // ─── Auth handlers ───
  async function handleAuth(e) {
    e?.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
    const body = authMode === 'register'
      ? { name: authForm.name, email: authForm.email, password: authForm.password }
      : { email: authForm.email, password: authForm.password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) {
        setAuthError(data.error);
      } else {
        setUser(data.user);
        // Load conversations
        const convRes = await fetch('/api/conversations');
        const convs = await convRes.json();
        if (convs && !convs.error) setChats(convs);
      }
    } catch {
      setAuthError('שגיאה בחיבור לשרת');
    }
    setAuthLoading(false);
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setChats({});
    setActiveChatId(null);
  }

  const userName = user?.name || '';

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats, activeChatId, toolStatus]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const messages = activeChatId && chats[activeChatId] ? chats[activeChatId].messages : [];

  function updateChatMessages(chatId, msgs) {
    setChats(prev => ({
      ...prev,
      [chatId]: {
        ...prev[chatId],
        messages: msgs,
        title: getChatTitle(msgs),
        updatedAt: Date.now(),
      },
    }));
  }

  function startNewChat() {
    const id = generateId();
    setChats(prev => ({
      ...prev,
      [id]: { id, title: 'שיחה חדשה', messages: [], createdAt: Date.now(), updatedAt: Date.now() },
    }));
    setActiveChatId(id);
    setSidebarOpen(false);
    setInput('');
    setAttachedFiles([]);
  }

  function deleteChat(id) {
    setChats(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (activeChatId === id) {
      const remaining = Object.keys(chats).filter(k => k !== id);
      setActiveChatId(remaining.length > 0 ? remaining[0] : null);
    }
  }

  function switchChat(id) {
    setActiveChatId(id);
    setSidebarOpen(false);
    setAttachedFiles([]);
  }

  // ─── Assets ───

  function addAsset() {
    if (!newAsset.name.trim() || !newAsset.value) return;
    const asset = {
      id: generateId(),
      category: newAsset.category,
      name: newAsset.name.trim(),
      value: parseFloat(newAsset.value) || 0,
      detail: newAsset.detail.trim(),
      createdAt: Date.now(),
    };
    setAssets(prev => [...prev, asset]);
    setNewAsset({ category: 'stocks', name: '', value: '', detail: '' });
    setShowAddForm(false);
  }

  function deleteAsset(id) {
    setAssets(prev => prev.filter(a => a.id !== id));
  }

  const totalNetWorth = assets.reduce((sum, a) => {
    const val = a.value || 0;
    return a.category === 'loan' ? sum - val : sum + val;
  }, 0);

  const groupedAssets = ASSET_CATEGORIES.map(cat => ({
    ...cat,
    items: assets.filter(a => a.category === cat.id),
    total: assets.filter(a => a.category === cat.id).reduce((s, a) => s + (a.value || 0), 0),
  })).filter(cat => cat.items.length > 0);

  // ─── Financial health checklist ───
  const hasCategory = (id) => assets.some(a => a.category === id);
  const categoryTotal = (id) => assets.filter(a => a.category === id).reduce((s, a) => s + (a.value || 0), 0);

  const healthChecks = [
    { id: 'pension', label: 'פנסיה', ok: hasCategory('pension'), missing: 'לא מוגדרת פנסיה', okText: 'פנסיה פעילה' },
    { id: 'emergency', label: 'קרן חירום', ok: categoryTotal('savings') + categoryTotal('cash') + categoryTotal('bank') >= 20000, missing: 'אין חיסכון לחירום (מומלץ 3-6 חודשי הוצאות)', okText: 'יש חיסכון חירום' },
    { id: 'hishtalmut', label: 'קרן השתלמות', ok: hasCategory('hishtalmut'), missing: 'חסרה קרן השתלמות', okText: 'קרן השתלמות פעילה' },
    { id: 'life_insurance', label: 'ביטוח חיים', ok: hasCategory('insurance'), missing: 'אין ביטוח חיים / א.כ.ע', okText: 'ביטוח חיים קיים' },
    { id: 'investments', label: 'השקעות', ok: hasCategory('stocks') || hasCategory('crypto') || hasCategory('gemel'), missing: 'אין תיק השקעות', okText: 'יש השקעות פעילות' },
  ];

  // ─── File handling ───

  async function uploadFiles(files) {
    if (!files.length) return;
    setUploading(true);
    try {
      const formData = new FormData();
      for (const file of files) formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) { alert(data.error); }
      else if (data.files) {
        const errors = data.files.filter(f => f.error);
        const successes = data.files.filter(f => !f.error);
        if (errors.length) alert(errors.map(e => e.error).join('\n'));
        setAttachedFiles(prev => [...prev, ...successes]);
      } else {
        setAttachedFiles(prev => [...prev, data]);
      }
    } catch (err) { alert(`שגיאה: ${err.message}`); }
    setUploading(false);
    textareaRef.current?.focus();
  }

  function handleFileSelect(e) { uploadFiles(Array.from(e.target.files)); e.target.value = ''; }
  function removeFile(index) { setAttachedFiles(prev => prev.filter((_, i) => i !== index)); }

  // Drag & drop
  function handleDragEnter(e) { e.preventDefault(); e.stopPropagation(); dragCounter.current++; if (e.dataTransfer.types.includes('Files')) setDragging(true); }
  function handleDragLeave(e) { e.preventDefault(); e.stopPropagation(); dragCounter.current--; if (dragCounter.current === 0) setDragging(false); }
  function handleDragOver(e) { e.preventDefault(); e.stopPropagation(); }
  function handleDrop(e) { e.preventDefault(); e.stopPropagation(); setDragging(false); dragCounter.current = 0; uploadFiles(Array.from(e.dataTransfer.files)); }
  function handlePaste(e) {
    const files = Array.from(e.clipboardData?.items || []).filter(i => i.kind === 'file').map(i => i.getAsFile()).filter(Boolean);
    if (files.length) { e.preventDefault(); uploadFiles(files); }
  }

  // ─── Send message ───

  async function sendMessage(text) {
    const userText = text || input.trim();
    if ((!userText && !attachedFiles.length) || loading) return;

    // Ensure there's an active chat
    let chatId = activeChatId;
    if (!chatId) {
      chatId = generateId();
      setChats(prev => ({
        ...prev,
        [chatId]: { id: chatId, title: 'שיחה חדשה', messages: [], createdAt: Date.now(), updatedAt: Date.now() },
      }));
      setActiveChatId(chatId);
    }

    const contentBlocks = [];
    const displayBlocks = [];

    for (const file of attachedFiles) {
      if (file.type === 'image') {
        contentBlocks.push({ type: 'image', source: { type: 'base64', media_type: file.mediaType, data: file.base64 } });
        displayBlocks.push({ type: 'file_info', fileName: file.fileName, isImage: true });
      } else if (file.type === 'document') {
        contentBlocks.push({ type: 'text', text: `[קובץ: ${file.fileName}${file.pageCount ? ` (${file.pageCount} עמודים)` : ''}]\n\n${file.content}` });
        displayBlocks.push({ type: 'file_info', fileName: file.fileName, isImage: false });
      }
    }

    const promptText = userText || 'נא לנתח את הקבצים המצורפים. תן סיכום, מה טוב, מה חסר, ומה צריך לשפר.';
    contentBlocks.push({ type: 'text', text: promptText });
    displayBlocks.push({ type: 'text', text: userText || 'נתח את הקבצים שהעליתי' });

    const apiContent = attachedFiles.length > 0 ? contentBlocks : userText;
    const displayContent = attachedFiles.length > 0 ? displayBlocks : userText;
    const userMsg = { role: 'user', content: apiContent, _display: displayContent };

    const currentMessages = chats[chatId]?.messages || [];
    const newMessages = [...currentMessages, userMsg];
    updateChatMessages(chatId, newMessages);

    setInput('');
    setAttachedFiles([]);
    setLoading(true);
    setToolStatus(null);

    try {
      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: apiMessages }) });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'text') {
              assistantText += data.content;
              updateChatMessages(chatId, [...newMessages, { role: 'assistant', content: assistantText }]);
              setToolStatus(null);
            } else if (data.type === 'portfolio_update') {
              // AI added/updated assets
              setToolStatus('מעדכן תמונת נכסים');
              if (data.items && data.items.length > 0) {
                setAssets(prev => {
                  let updated = [...prev];
                  for (const item of data.items) {
                    // Check if asset with same name+category exists
                    const existingIdx = updated.findIndex(a => a.category === item.category && a.name === item.name);
                    if (data.action === 'remove') {
                      if (existingIdx >= 0) updated.splice(existingIdx, 1);
                    } else if (existingIdx >= 0) {
                      // Update existing
                      updated[existingIdx] = { ...updated[existingIdx], value: item.value, detail: item.detail || updated[existingIdx].detail };
                    } else {
                      // Add new
                      updated.push({ id: generateId(), category: item.category, name: item.name, value: item.value, detail: item.detail || '', createdAt: Date.now() });
                    }
                  }
                  return updated;
                });
                // Open assets panel to show updates
                setAssetsOpen(true);
              }
            } else if (data.type === 'tool_call') { setToolStatus(TOOL_LABELS[data.name] || data.name); }
            else if (data.type === 'tool_done' || data.type === 'done') { setToolStatus(null); }
            else if (data.type === 'error') { updateChatMessages(chatId, [...newMessages, { role: 'assistant', content: `שגיאה: ${data.content}` }]); }
          } catch {}
        }
      }
    } catch (err) {
      updateChatMessages(chatId, [...newMessages, { role: 'assistant', content: `שגיאה: ${err.message}` }]);
    }

    setLoading(false);
    setToolStatus(null);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  // ─── Sorted chats ───
  const sortedChats = Object.values(chats).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const userInitial = userName ? userName.charAt(0).toUpperCase() : '?';

  // ─── Name modal ───
  if (!loaded) {
    return (
      <div className="splash-screen">
        <div className="splash-logo">✦</div>
        <div className="splash-title">נועם</div>
        <div className="splash-subtitle">מתכנן פיננסי AI</div>
        <div className="splash-dots">
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="name-modal-overlay">
        <div className="name-modal">
          <h2>{authMode === 'register' ? 'הרשמה' : 'התחברות'} 👋</h2>
          <p>אני נועם, המתכנן הפיננסי שלך</p>
          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {authMode === 'register' && (
              <input
                value={authForm.name}
                onChange={e => setAuthForm(p => ({ ...p, name: e.target.value }))}
                placeholder="השם שלך"
                autoFocus
              />
            )}
            <input
              type="email"
              value={authForm.email}
              onChange={e => setAuthForm(p => ({ ...p, email: e.target.value }))}
              placeholder="אימייל"
              autoFocus={authMode === 'login'}
              dir="ltr"
              style={{ textAlign: 'center' }}
            />
            <input
              type="password"
              value={authForm.password}
              onChange={e => setAuthForm(p => ({ ...p, password: e.target.value }))}
              placeholder="סיסמה"
              dir="ltr"
              style={{ textAlign: 'center' }}
            />
            {authError && <div style={{ color: '#ea4335', fontSize: 13 }}>{authError}</div>}
            <button type="submit" disabled={authLoading}>
              {authLoading ? '...' : authMode === 'register' ? 'הרשמה' : 'התחברות'}
            </button>
          </form>
          <div style={{ marginTop: 16, fontSize: 13, color: '#5f6577' }}>
            {authMode === 'login' ? (
              <>אין לך חשבון? <button onClick={() => { setAuthMode('register'); setAuthError(''); }} style={{ background: 'none', border: 'none', color: '#4285f4', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>הרשמה</button></>
            ) : (
              <>כבר רשום? <button onClick={() => { setAuthMode('login'); setAuthError(''); }} style={{ background: 'none', border: 'none', color: '#4285f4', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>התחברות</button></>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="layout"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onPaste={handlePaste}
    >
      {dragging && (
        <div className="drop-overlay">
          <div className="drop-content">
            <div className="drop-icon">📎</div>
            <div className="drop-text">שחרר קבצים כאן</div>
            <div className="drop-hint">PDF, Word, Excel, תמונות ועוד</div>
          </div>
        </div>
      )}

      {/* Mobile toggle */}
      <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>

      {/* Sidebar collapse toggle */}
      <button
        className={`sidebar-collapse-btn ${sidebarCollapsed ? 'collapsed' : ''}`}
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        title={sidebarCollapsed ? 'הצג שיחות' : 'הסתר שיחות'}
      >💬</button>

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon">✦</div>
            <span>נועם</span>
          </div>
          <button className="new-chat-btn" onClick={startNewChat} title="שיחה חדשה">+</button>
        </div>

        <div className="chat-list">
          {sortedChats.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>
              אין שיחות עדיין
            </div>
          )}
          {sortedChats.length > 0 && <div className="chat-list-label">שיחות אחרונות</div>}
          {sortedChats.map(chat => (
            <button
              key={chat.id}
              className={`chat-item ${activeChatId === chat.id ? 'active' : ''}`}
              onClick={() => switchChat(chat.id)}
            >
              <span className="chat-item-icon">💬</span>
              <span className="chat-item-text">{chat.title}</span>
              <span
                className="chat-item-delete"
                onClick={e => { e.stopPropagation(); deleteChat(chat.id); }}
                title="מחק"
              >✕</span>
            </button>
          ))}
        </div>

        <div className="sidebar-user">
          <div className="user-avatar">{userInitial}</div>
          <div className="user-info">
            <div className="user-name">{userName}</div>
            <div className="user-label">{user?.email}</div>
          </div>
          <button
            onClick={handleLogout}
            title="התנתק"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text-faint)', flexShrink: 0 }}
          >🚪</button>
        </div>
      </aside>

      {/* Assets toggle button */}
      <button
        className={`assets-toggle-btn ${assetsOpen ? 'active' : ''}`}
        onClick={() => setAssetsOpen(!assetsOpen)}
        title="תמונת מצב נכסים"
      >💼</button>

      {/* Main chat */}
      <div className={`app ${dragging ? 'dragging' : ''}`}>
        <header className="header">
          <div className="header-icon">✦</div>
          <div className="header-info">
            <h1>נועם</h1>
            <p>מתכנן פיננסי AI</p>
          </div>
          <button
            className="theme-toggle-btn"
            onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
            title={theme === 'light' ? 'מצב כהה' : 'מצב בהיר'}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button className="print-btn" onClick={() => window.print()} title="ייצוא לPDF">🖨️</button>
        </header>

        <div className="messages">
          {messages.length === 0 && (
            <div className="welcome">
              <div className="welcome-icon">✦</div>
              <h2>היי {userName}, מה נעשה היום?</h2>
              <p>
                אני נועם, המתכנן הפיננסי שלך. אפשר לשאול על השקעות, פנסיה, ביטוח, משכנתא, מיסים — או להעלות מסמכים לניתוח.
              </p>
              <div className="welcome-chips">
                {WELCOME_CHIPS.map(chip => (
                  <button key={chip} className="chip" onClick={() => sendMessage(chip)}>{chip}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`message ${msg.role}`}>
              <div className="message-avatar">
                {msg.role === 'user' ? userInitial : '✦'}
              </div>
              {renderMessageContent({ ...msg, content: msg._display || msg.content })}
            </div>
          ))}

          {toolStatus && (
            <div className="tool-indicator">
              <div className="spinner" />
              {toolStatus}...
            </div>
          )}

          {loading && !toolStatus && messages[messages.length - 1]?.role === 'user' && (
            <div className="typing"><span /><span /><span /></div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {attachedFiles.length > 0 && (
          <div className="attached-files">
            {attachedFiles.map((file, i) => (
              <div key={i} className="attached-file">
                <span className="file-icon">{file.type === 'image' ? '🖼️' : '📄'}</span>
                <span className="file-name">{file.fileName}</span>
                <button className="file-remove" onClick={() => removeFile(i)}>✕</button>
              </div>
            ))}
          </div>
        )}

        <div className="input-area">
          <input ref={fileInputRef} type="file" accept="*/*" multiple onChange={handleFileSelect} style={{ display: 'none' }} />
          <div className="input-row">
            <button className="upload-btn" onClick={() => fileInputRef.current?.click()} disabled={loading || uploading} title="העלה קובץ">
              {uploading ? <div className="spinner small" /> : '📎'}
            </button>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="שאל אותי על השקעות, פנסיה, ביטוח, משכנתא..."
              rows={1}
              disabled={loading}
            />
            <button className="send-btn" onClick={() => sendMessage()} disabled={loading || (!input.trim() && !attachedFiles.length)}>
              ←
            </button>
          </div>
        </div>
      </div>

      {/* Assets Panel */}
      <aside className={`assets-panel ${assetsOpen ? 'open' : ''}`}>
        <div className="assets-header">
          <div className="assets-header-title">
            <span className="assets-header-icon">💼</span>
            תמונת מצב נכסים
          </div>
          <span className="api-badge manual">ידני</span>
        </div>

        <div className="net-worth-section">
          <div className="net-worth-label">שווי נכסים כולל</div>
          <div className="net-worth-value" style={totalNetWorth < 0 ? { background: 'linear-gradient(135deg, #EF5350, #E8735A)', WebkitBackgroundClip: 'text' } : undefined}>
            {totalNetWorth === 0 ? '₪0' : (totalNetWorth < 0 ? '-' : '') + formatCurrency(Math.abs(totalNetWorth))}
          </div>
        </div>

        {/* Financial health checklist */}
        {assets.length > 0 && (
          <div className="health-checklist">
            <div className="health-title">בריאות פיננסית</div>
            {healthChecks.map(check => (
              <div key={check.id} className={`health-item ${check.ok ? 'ok' : 'warn'}`}>
                <div className={`health-badge ${check.ok ? 'ok' : 'warn'}`}>
                  {check.ok ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                  )}
                </div>
                <span className="health-text">{check.ok ? check.okText : check.missing}</span>
              </div>
            ))}
          </div>
        )}

        {groupedAssets.length === 0 && !showAddForm ? (
          <div className="assets-empty">
            <div className="assets-empty-icon">📊</div>
            <div className="assets-empty-text">אין נכסים עדיין</div>
            <div className="assets-empty-hint">הוסף את הנכסים שלך כדי לראות תמונה מלאה</div>
          </div>
        ) : (
          <div className="assets-list">
            {groupedAssets.map(cat => (
              <div key={cat.id} className="asset-category">
                <div className="asset-category-header">
                  <div className="asset-category-title">
                    <span className="asset-cat-icon" style={{ color: cat.color }}>{ASSET_ICONS[cat.id]?.(cat.color)}</span>
                    {cat.label}
                  </div>
                  <div className="asset-category-total" style={{ color: cat.id === 'loan' ? '#EF5350' : undefined }}>
                    {cat.id === 'loan' ? '-' : ''}{formatCurrency(cat.total)}
                  </div>
                </div>
                {cat.items.map(asset => {
                  const catInfo = ASSET_CATEGORIES.find(c => c.id === asset.category);
                  return (
                    <div key={asset.id} className="asset-item">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="asset-item-icon" style={{ background: catInfo?.color + '18', color: catInfo?.color }}>
                          {ASSET_ICONS[asset.category]?.(catInfo?.color || '#999')}
                        </div>
                        <div className="asset-item-info">
                          <div className="asset-item-name">{asset.name}</div>
                          {asset.detail && <div className="asset-item-detail">{asset.detail}</div>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="asset-item-value" style={{ color: asset.category === 'loan' ? '#EF5350' : undefined }}>
                          {asset.category === 'loan' ? '-' : ''}{formatCurrency(asset.value)}
                        </div>
                        <button className="asset-item-delete" onClick={() => deleteAsset(asset.id)} title="מחק">✕</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        <div className="add-asset-section">
          {showAddForm ? (
            <div className="add-asset-form">
              <select
                value={newAsset.category}
                onChange={e => setNewAsset(prev => ({ ...prev, category: e.target.value }))}
              >
                {ASSET_CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
              <input
                placeholder="שם (למשל: לאומי, תיק IBI, מגדל פנסיה)"
                value={newAsset.name}
                onChange={e => setNewAsset(prev => ({ ...prev, name: e.target.value }))}
                autoFocus
              />
              <input
                type="number"
                placeholder="שווי ב-₪"
                value={newAsset.value}
                onChange={e => setNewAsset(prev => ({ ...prev, value: e.target.value }))}
              />
              <input
                placeholder="פירוט (אופציונלי)"
                value={newAsset.detail}
                onChange={e => setNewAsset(prev => ({ ...prev, detail: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && addAsset()}
              />
              <div className="add-asset-form-actions">
                <button className="add-asset-save" onClick={addAsset}>הוסף</button>
                <button className="add-asset-cancel" onClick={() => { setShowAddForm(false); setNewAsset({ category: 'stocks', name: '', value: '', detail: '' }); }}>ביטול</button>
              </div>
            </div>
          ) : (
            <button className="add-asset-btn" onClick={() => setShowAddForm(true)}>
              <span>+</span> הוסף נכס
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
