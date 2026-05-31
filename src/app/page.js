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
  // Bold
  let html = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Headers (### and ##)
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
  // Bullet lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);
  // Numbered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  // Line breaks
  html = html.replace(/\n/g, '<br/>');
  // Clean up extra br inside lists
  html = html.replace(/<br\/>\s*<li>/g, '<li>');
  html = html.replace(/<\/li>\s*<br\/>/g, '</li>');
  html = html.replace(/<br\/>\s*<\/ul>/g, '</ul>');
  html = html.replace(/<br\/>\s*<h3>/g, '<h3>');
  return html;
}

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [toolStatus, setToolStatus] = useState(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, toolStatus]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  async function sendMessage(text) {
    const userText = text || input.trim();
    if (!userText || loading) return;

    const userMsg = { role: 'user', content: userText };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setToolStatus(null);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
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

  return (
    <div className="app">
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
            <div
              className="message-bubble"
              dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
            />
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

      <div className="input-area">
        <div className="input-row">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="ספר לי על ההשקעות שלך..."
            rows={1}
            disabled={loading}
          />
          <button
            className="send-btn"
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
          >
            ←
          </button>
        </div>
      </div>
    </div>
  );
}
