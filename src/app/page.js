'use client';

import { useState, useRef, useEffect } from 'react';
import './globals.css';

const TOOL_LABELS = {
  get_fundamentals: 'בודק נתוני חברה',
  get_market_overview: 'סוקר מצב שוק',
  get_sector_stocks: 'סורק מניות בסקטור',
  get_etf_data: 'בודק קרנות סל',
  calculate_financial_plan: 'מחשב תכנית פיננסית',
};

const WELCOME_CHIPS = [
  'רוצה לבנות תיק השקעות',
  'צריך לבדוק את הפנסיה שלי',
  'חושב לקחת משכנתא',
  'רוצה לדעת כמה מס אני משלם',
  'צריך ביטוח חיים?',
  'איך מתכננים פרישה?',
];

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
  // If content is a string, render as HTML
  if (typeof msg.content === 'string') {
    return <div className="message-bubble" dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />;
  }
  // If content is an array (has file attachments), render text + file indicators
  if (Array.isArray(msg.content)) {
    return (
      <div className="message-bubble">
        {msg.content.map((block, i) => {
          if (block.type === 'text') {
            return <div key={i} dangerouslySetInnerHTML={{ __html: formatMessage(block.text) }} />;
          }
          if (block.type === 'file_info') {
            return (
              <div key={i} className="file-badge">
                <span className="file-icon">{block.isImage ? '🖼️' : '📄'}</span>
                <span>{block.fileName}</span>
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  }
  return null;
}

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [toolStatus, setToolStatus] = useState(null);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const dragCounter = useRef(0);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, toolStatus]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  // Drag and drop handlers
  function handleDragEnter(e) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.types.includes('Files')) {
      setDragging(true);
    }
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragging(false);
    }
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  async function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    dragCounter.current = 0;

    const files = Array.from(e.dataTransfer.files);
    if (files.length) {
      await uploadFiles(files);
    }
  }

  async function uploadFiles(files) {
    if (!files.length) return;

    setUploading(true);
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.error) {
          alert(data.error);
          continue;
        }
        setAttachedFiles(prev => [...prev, data]);
      } catch (err) {
        alert(`שגיאה בהעלאת ${file.name}: ${err.message}`);
      }
    }
    setUploading(false);
    // Focus the textarea so user can type what they need
    textareaRef.current?.focus();
  }

  async function handleFileSelect(e) {
    await uploadFiles(Array.from(e.target.files));
    e.target.value = '';
  }

  function removeFile(index) {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  }

  async function sendMessage(text) {
    const userText = text || input.trim();
    if ((!userText && !attachedFiles.length) || loading) return;

    // Build message content for Claude API
    const contentBlocks = [];
    // Display blocks for UI
    const displayBlocks = [];

    // Add file content
    for (const file of attachedFiles) {
      if (file.type === 'image') {
        // Send image to Claude as image block
        contentBlocks.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: file.mediaType,
            data: file.base64,
          },
        });
        displayBlocks.push({ type: 'file_info', fileName: file.fileName, isImage: true });
      } else if (file.type === 'document') {
        // Send document text as text block with context
        const header = `[קובץ מצורף: ${file.fileName}${file.pageCount ? ` (${file.pageCount} עמודים)` : ''}]\n\n`;
        contentBlocks.push({ type: 'text', text: header + file.content });
        displayBlocks.push({ type: 'file_info', fileName: file.fileName, isImage: false });
      }
    }

    // Add user text
    const promptText = userText || 'נא לנתח את הקובץ/ים המצורפים. תן סיכום, ציין מה טוב, מה חסר, ומה צריך לשפר.';
    contentBlocks.push({ type: 'text', text: promptText });
    if (userText) {
      displayBlocks.push({ type: 'text', text: userText });
    } else {
      displayBlocks.push({ type: 'text', text: 'נתח את הקבצים שהעליתי' });
    }

    // If no files, simple string content. If files, array content.
    const apiContent = attachedFiles.length > 0 ? contentBlocks : userText;
    const displayContent = attachedFiles.length > 0 ? displayBlocks : userText;

    const userMsg = { role: 'user', content: apiContent, _display: displayContent };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setAttachedFiles([]);
    setLoading(true);
    setToolStatus(null);

    try {
      // Send to API — strip _display field
      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      });

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
              setMessages([...newMessages, { role: 'assistant', content: assistantText }]);
              setToolStatus(null);
            } else if (data.type === 'tool_call') {
              setToolStatus(TOOL_LABELS[data.name] || data.name);
            } else if (data.type === 'tool_done') {
              setToolStatus(null);
            } else if (data.type === 'done') {
              setToolStatus(null);
            } else if (data.type === 'error') {
              setMessages([...newMessages, { role: 'assistant', content: `שגיאה: ${data.content}` }]);
            }
          } catch (e) {
            // ignore parse errors
          }
        }
      }
    } catch (err) {
      setMessages([...newMessages, { role: 'assistant', content: `שגיאה בחיבור: ${err.message}` }]);
    }

    setLoading(false);
    setToolStatus(null);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const hasMessages = messages.length > 0;

  // Handle paste with files
  function handlePaste(e) {
    const items = Array.from(e.clipboardData?.items || []);
    const files = items
      .filter(item => item.kind === 'file')
      .map(item => item.getAsFile())
      .filter(Boolean);
    if (files.length) {
      e.preventDefault();
      uploadFiles(files);
    }
  }

  return (
    <div
      className={`app ${dragging ? 'dragging' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onPaste={handlePaste}
    >
      {/* Drop overlay */}
      {dragging && (
        <div className="drop-overlay">
          <div className="drop-content">
            <div className="drop-icon">📎</div>
            <div className="drop-text">שחרר קבצים כאן</div>
            <div className="drop-hint">PDF, תמונות, CSV, TXT</div>
          </div>
        </div>
      )}

      <header className="header">
        <div className="header-icon">💼</div>
        <div className="header-info">
          <h1>נועם — מתכנן פיננסי AI</h1>
          <p>השקעות • פנסיה • ביטוח • משכנתא • מיסים</p>
        </div>
      </header>

      <div className="messages">
        {!hasMessages && (
          <div className="welcome">
            <div className="welcome-icon">💼</div>
            <h2>בוא נסדר לך את הפיננסים</h2>
            <p>
              אני נועם, המתכנן הפיננסי שלך. אכיר אותך, אבין את המצב המלא,
              ואבנה לך תכנית מקיפה — השקעות, פנסיה, ביטוח, משכנתא ומיסים.
            </p>
            <p className="upload-hint">
              📎 אפשר להעלות קבצים — דוח פנסיה, פוליסת ביטוח, תלוש שכר, דוח משכנתא — ואנתח אותם בשבילך
            </p>
            <div className="welcome-chips">
              {WELCOME_CHIPS.map((chip) => (
                <button
                  key={chip}
                  className="chip"
                  onClick={() => sendMessage(chip)}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <div className="message-avatar">
              {msg.role === 'user' ? '👤' : '💼'}
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
          <div className="typing">
            <span /><span /><span />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Attached files preview */}
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
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.csv,.txt,.json"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <div className="input-row">
          <button
            className="upload-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || uploading}
            title="העלה קובץ"
          >
            {uploading ? <div className="spinner small" /> : '📎'}
          </button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="ספר לי על המצב הפיננסי שלך, או העלה קובץ לניתוח..."
            rows={1}
            disabled={loading}
          />
          <button
            className="send-btn"
            onClick={() => sendMessage()}
            disabled={loading || (!input.trim() && !attachedFiles.length)}
          >
            ←
          </button>
        </div>
      </div>
    </div>
  );
}
