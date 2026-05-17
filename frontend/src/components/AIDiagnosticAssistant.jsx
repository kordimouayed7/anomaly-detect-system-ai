import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Bot, Activity, Send, User } from 'lucide-react';
import api from '../services/api';

export default function AIDiagnosticAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', text: "I'm your designated cybersecurity assistant. Paste a raw log, anomaly description, or error code here and I'll analyze it for you." }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 100);
    }
  }, [messages, isAnalyzing, isOpen]);

  const handleSend = async () => {
    if (!inputValue.trim() || isAnalyzing) return;

    const userPrompt = inputValue.trim();
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', text: userPrompt }]);
    setIsAnalyzing(true);

    try {
      const response = await api.post('/api/diagnose', {
        raw_log: userPrompt
      });
      
      const diagnosis = response.data?.diagnosis || "No response received.";
      setMessages(prev => [...prev, { role: 'ai', text: diagnosis }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: "Analysis failed. Make sure your API key (Grok or OpenAI) is configured correctly in the backend `.env` file and the backend server is running." }]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      
      {/* Expanded Chat Card / Panel */}
      <div 
        className={`mb-4 overflow-hidden transition-all duration-300 ease-out origin-bottom-right shadow-2xl rounded-2xl flex flex-col`}
        style={{ 
          background: '#0d1238', 
          border: '1px solid #1a2555',
          width: isOpen ? '380px' : '0px',
          height: isOpen ? '580px' : '0px',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.2)'
        }}
      >
        {/* Header */}
        <div 
          className="flex flex-shrink-0 items-center justify-between px-5 py-4 w-full"
          style={{ borderBottom: '1px solid #1a2555', background: '#0a0f2e' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
              <Sparkles size={16} className="text-indigo-400" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-white tracking-tight">AI Diagnostics</h3>
              <p className="text-[11px] text-indigo-300/70 font-medium">Powered by Gemini AI</p>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1.5 text-[#4a5490] hover:text-white hover:bg-[#1a2555] rounded-md transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 w-full p-4 overflow-y-auto no-scrollbar space-y-5" style={{ width: '378px', background: '#060b28' }}>
          
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex items-start gap-3 flex-shrink-0 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className="mt-1 flex-shrink-0">
                {msg.role === 'ai' ? (
                  <div className="p-1.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    <Bot size={14} />
                  </div>
                ) : (
                  <div className="p-1.5 rounded-full bg-slate-700/50 text-slate-300 border border-slate-600/50">
                    <User size={14} />
                  </div>
                )}
              </div>
              
              <div 
                className={`px-4 py-3 rounded-xl max-w-[85%] ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 border border-indigo-500 text-white rounded-tr-sm' 
                    : 'bg-[#131b4d] border border-[#1a2555] text-[#c8d0e7] rounded-tl-sm'
                }`}
              >
                {/* Basic pseudo-markdown rendering */}
                {msg.text.split('\n').map((line, i) => (
                  <p 
                    key={i} 
                    className={`text-[13px] leading-relaxed ${i !== 0 ? 'mt-3' : ''} ${line.startsWith('**') ? 'font-bold text-white mb-1' : ''}`}
                    style={(line.startsWith('* ') || line.startsWith('- ')) ? { marginLeft: '8px', position: 'relative' } : {}}
                  >
                    {(line.startsWith('* ') || line.startsWith('- ')) && (
                      <span className="absolute -left-3 text-indigo-400 font-bold">•</span>
                    )}
                    {line.replace(/\*\*/g, '').replace(/^[\*\-]\s/, '')}
                  </p>
                ))}
              </div>
            </div>
          ))}

          {/* Loading State */}
          {isAnalyzing && (
            <div className="flex items-start gap-3">
              <div className="mt-1 flex-shrink-0">
                <div className="p-1.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Activity size={14} className="animate-pulse" />
                </div>
              </div>
              <div className="px-5 py-4 rounded-xl bg-[#131b4d] border border-[#1a2555] rounded-tl-sm w-fit">
                <div className="flex gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} className="h-0 w-full" />
        </div>

        {/* Input Area */}
        <div className="flex-shrink-0 p-3 w-full" style={{ borderTop: '1px solid #1a2555', background: '#0a0f2e' }}>
          <div className="relative flex items-center">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message the diagnostic AI..."
              className="w-full bg-[#131b4d] text-[13px] text-white placeholder-[#4a5490] rounded-xl py-3 pl-4 pr-12 outline-none resize-none border border-[#1a2555] focus:border-indigo-500/50 transition-colors"
              rows={1}
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isAnalyzing}
              className="absolute right-2 p-2 rounded-lg text-indigo-400 hover:bg-indigo-500/20 transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
            >
              <Send size={16} />
            </button>
          </div>
          <p className="text-center text-[10px] text-[#4a5490] mt-2">
            AI can make mistakes. Always verify critical OS actions.
          </p>
        </div>

      </div>

      {/* Floating Action Button (FAB) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all duration-300 transform hover:scale-105 active:scale-95"
      >
        <div className="absolute inset-0 rounded-full border border-indigo-400/50 animate-ping opacity-20 group-hover:opacity-40"></div>
        {isOpen ? <X size={24} className="relative z-10" /> : <Sparkles size={24} className="relative z-10" />}
      </button>

    </div>
  );
}
