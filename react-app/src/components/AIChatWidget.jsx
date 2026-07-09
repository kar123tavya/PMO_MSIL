import React, { useState, useRef, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function AIChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am your AI PMO Assistant powered by Grok. You can ask me questions about your projects, deadlines, and dashboard statistics.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!user) return null; // Don't show if not logged in

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await api.post('/ai/chat', { message: userMsg.content });
      setMessages(prev => [...prev, { role: 'assistant', content: response.data.reply }]);
    } catch (error) {
      console.error(error);
      const errMsg = error.response?.data?.error || 'Oops, I encountered an error. Please try again.';
      setMessages(prev => [...prev, { role: 'assistant', content: `**Error**: ${errMsg}`, isError: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '60px',
          height: '60px',
          borderRadius: '30px',
          backgroundColor: 'var(--primary)',
          color: 'white',
          border: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          cursor: 'pointer',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.2s',
          transform: isOpen ? 'scale(0)' : 'scale(1)',
          opacity: isOpen ? 0 : 1
        }}
      >
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>

      {/* Chat Window */}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '380px',
        height: '600px',
        maxHeight: '80vh',
        backgroundColor: 'var(--surface)',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 10000,
        transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s',
        transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.9)',
        opacity: isOpen ? 1 : 0,
        pointerEvents: isOpen ? 'auto' : 'none'
      }}>
        
        {/* Header */}
        <div style={{
          backgroundColor: 'var(--primary)',
          color: 'white',
          padding: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <strong style={{ fontSize: '1rem', fontWeight: '600' }}>Grok AI Assistant</strong>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            style={{
              background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '4px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Message Area */}
        <div style={{
          flex: 1,
          padding: '16px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          backgroundColor: 'var(--bg-color)'
        }}>
          {messages.map((msg, i) => (
            <div key={i} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start'
            }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px', marginLeft: '4px', marginRight: '4px' }}>
                {msg.role === 'user' ? 'You' : 'Grok AI'}
              </span>
              <div style={{
                maxWidth: '85%',
                padding: '10px 14px',
                borderRadius: '12px',
                backgroundColor: msg.role === 'user' ? 'var(--primary)' : (msg.isError ? '#fee2e2' : 'var(--surface)'),
                color: msg.role === 'user' ? 'white' : (msg.isError ? '#991b1b' : 'var(--text-color)'),
                border: msg.role === 'assistant' && !msg.isError ? '1px solid var(--border-color)' : 'none',
                lineHeight: '1.4',
                fontSize: '0.9rem',
                whiteSpace: 'pre-wrap'
              }}>
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div style={{ display: 'flex', alignItems: 'flex-start', flexDirection: 'column' }}>
               <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px', marginLeft: '4px' }}>Grok AI</span>
               <div style={{
                 padding: '10px 16px', borderRadius: '12px', backgroundColor: 'var(--surface)', border: '1px solid var(--border-color)',
                 display: 'flex', gap: '4px'
               }}>
                 <span className="dot-pulse">●</span>
                 <span className="dot-pulse" style={{ animationDelay: '0.2s' }}>●</span>
                 <span className="dot-pulse" style={{ animationDelay: '0.4s' }}>●</span>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSend} style={{
          padding: '12px',
          borderTop: '1px solid var(--border-color)',
          backgroundColor: 'var(--surface)',
          display: 'flex',
          gap: '8px'
        }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your projects..."
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '10px 14px',
              border: '1px solid var(--border-color)',
              borderRadius: '20px',
              outline: 'none',
              backgroundColor: 'var(--bg-color)',
              color: 'var(--text-color)'
            }}
          />
          <button 
            type="submit"
            disabled={!input.trim() || isLoading}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '20px',
              backgroundColor: input.trim() && !isLoading ? 'var(--primary)' : 'var(--border-color)',
              color: 'white',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
              transition: 'background-color 0.2s'
            }}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </form>
        <style dangerouslySetInnerHTML={{__html:`
          @keyframes pulse {
            0%, 100% { opacity: 0.4; transform: scale(0.8); }
            50% { opacity: 1; transform: scale(1.2); }
          }
          .dot-pulse {
            animation: pulse 1.4s infinite ease-in-out both;
            color: var(--primary);
            font-size: 10px;
          }
        `}} />
      </div>
    </>
  );
}
