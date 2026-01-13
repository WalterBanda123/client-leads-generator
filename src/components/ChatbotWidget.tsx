import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageCircle,
  X,
  Minus,
  Send,
  Loader2,
  RotateCcw,
  Sparkles,
  Globe,
  Share2,
  TrendingUp,
} from 'lucide-react';
import { agentAPI } from '../services/api';
import type { Lead } from '../services/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  leads?: Lead[];
  timestamp: Date;
}

const quickActions = [
  { label: 'Top prospects', query: 'Show me the top prospects', icon: <TrendingUp className="w-3.5 h-3.5" /> },
  { label: 'No website', query: 'Show leads without a website', icon: <Globe className="w-3.5 h-3.5" /> },
  { label: 'Social only', query: 'Show leads that only have social media', icon: <Share2 className="w-3.5 h-3.5" /> },
  { label: 'High priority', query: 'Show high priority leads', icon: <Sparkles className="w-3.5 h-3.5" /> },
];

export default function ChatbotWidget() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [messages, isOpen, isMinimized]);

  const handleSendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await agentAPI.chat(text, sessionId);
      if (response.data.success) {
        if (response.data.sessionId) {
          setSessionId(response.data.sessionId);
        }

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.data.response,
          leads: response.data.leads,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (err) {
      console.error('Chat error:', err);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleReset = () => {
    setMessages([]);
    setSessionId(undefined);
  };

  const handleLeadClick = (leadId: string) => {
    navigate(`/leads/${leadId}`);
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#CE0505] hover:bg-[#B80404] text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 z-50"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 px-4 py-2 bg-[#CE0505] hover:bg-[#B80404] text-white rounded-full shadow-lg transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="font-medium">Chat</span>
          {messages.length > 0 && (
            <span className="bg-white text-[#CE0505] text-xs font-bold px-1.5 py-0.5 rounded-full">
              {messages.length}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-lg shadow-2xl flex flex-col z-50 border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#CE0505] rounded-full flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-gray-900">AI Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleReset}
            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"
            title="Reset conversation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"
            title="Minimize"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-[#CE0505]" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">How can I help?</h3>
            <p className="text-sm text-gray-500 mb-4">
              Ask me about leads or get recommendations
            </p>
            <div className="grid grid-cols-2 gap-2 w-full">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => handleSendMessage(action.query)}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  {action.icon}
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 ${
                    message.role === 'user'
                      ? 'bg-[#CE0505] text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  {message.leads && message.leads.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {message.leads.slice(0, 5).map((lead) => (
                        <button
                          key={lead._id}
                          onClick={() => handleLeadClick(lead._id)}
                          className="w-full text-left px-2 py-1.5 bg-white rounded border border-gray-200 hover:bg-gray-50 transition-colors"
                        >
                          <p className="text-xs font-medium text-gray-900 truncate">
                            {lead.business_name}
                          </p>
                          {lead.category && (
                            <p className="text-xs text-gray-500 truncate">{lead.category}</p>
                          )}
                        </button>
                      ))}
                      {message.leads.length > 5 && (
                        <p className="text-xs text-gray-500 px-2">
                          +{message.leads.length - 5} more leads
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-3 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Quick Actions (shown when there are messages) */}
      {messages.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-100 flex gap-2 overflow-x-auto">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => handleSendMessage(action.query)}
              disabled={loading}
              className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50"
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about leads..."
            disabled={loading}
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CE0505]/20 focus:border-[#CE0505] disabled:opacity-50"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!input.trim() || loading}
            className="p-2 bg-[#CE0505] hover:bg-[#B80404] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
