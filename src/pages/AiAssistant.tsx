import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Bot, Send, Plus, Trash2, MessageSquare, Sparkles,
  TrendingUp, Users, ShoppingCart, AlertCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Spinner, EmptyState } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import type { AiChatSession, AiChatMessage } from '@/types';

const SUGGESTED_PROMPTS = [
  { icon: TrendingUp, text: 'What are our top-selling product categories this year?' },
  { icon: Users, text: 'Which customers have the highest lifetime value?' },
  { icon: ShoppingCart, text: 'How many orders are currently in production?' },
  { icon: AlertCircle, text: 'Which customers have outstanding balances?' },
];

export function AiAssistant() {
  const { profile } = useAuth();
  const [sessions, setSessions] = useState<AiChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<AiChatSession | null>(null);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadSessions = useCallback(async () => {
    if (!profile) return;
    const { data, error } = await supabase
      .from('ai_chat_sessions')
      .select('*')
      .eq('user_id', profile.id)
      .order('updated_at', { ascending: false });
    if (error) console.error('Error loading sessions:', error);
    else {
      setSessions(data as AiChatSession[]);
      if (data && data.length > 0 && !selectedSession) {
        setSelectedSession(data[0]);
      }
    }
    setLoading(false);
  }, [profile, selectedSession]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const loadMessages = useCallback(async (sessionId: string) => {
    setMsgLoading(true);
    const { data, error } = await supabase
      .from('ai_chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    if (error) console.error('Error loading messages:', error);
    else setMessages(data as AiChatMessage[]);
    setMsgLoading(false);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, []);

  useEffect(() => {
    if (selectedSession) loadMessages(selectedSession.id);
  }, [selectedSession, loadMessages]);

  const createNewSession = async () => {
    if (!profile) return;
    const orgId = profile.organisation_id;
    if (!orgId) return;

    const { data, error } = await supabase
      .from('ai_chat_sessions')
      .insert({
        organisation_id: orgId,
        user_id: profile.id,
        title: 'New Chat',
        provider: 'openai',
      })
      .select('*')
      .single();

    if (error) {
      setError(error.message);
      return;
    }

    const newSession = data as AiChatSession;
    setSessions(prev => [newSession, ...prev]);
    setSelectedSession(newSession);
    setMessages([]);
  };

  const deleteSession = async (sessionId: string) => {
    await supabase.from('ai_chat_sessions').delete().eq('id', sessionId);
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (selectedSession?.id === sessionId) {
      setSelectedSession(null);
      setMessages([]);
    }
  };

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || !profile || !selectedSession || sending) return;

    setSending(true);
    setError(null);
    setInput('');

    const userMsg: AiChatMessage = {
      id: crypto.randomUUID(),
      organisation_id: profile.organisation_id ?? '',
      session_id: selectedSession.id,
      role: 'user',
      content,
      metadata: null,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;
      const headers = {
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sessionId: selectedSession.id,
          message: content,
          orgId: profile.organisation_id,
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      const aiMsg: AiChatMessage = {
        id: crypto.randomUUID(),
        organisation_id: profile.organisation_id ?? '',
        session_id: selectedSession.id,
        role: 'assistant',
        content: result.response ?? 'I could not process that request.',
        metadata: result.metadata ?? null,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, aiMsg]);

      if (result.title && selectedSession.title === 'New Chat') {
        const { data: updated } = await supabase
          .from('ai_chat_sessions')
          .update({ title: result.title })
          .eq('id', selectedSession.id)
          .select('*')
          .single();
        if (updated) {
          setSelectedSession(updated as AiChatSession);
          setSessions(prev => prev.map(s => s.id === updated.id ? updated as AiChatSession : s));
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get AI response';
      setError(errorMsg);
      const aiMsg: AiChatMessage = {
        id: crypto.randomUUID(),
        organisation_id: profile.organisation_id ?? '',
        session_id: selectedSession.id,
        role: 'assistant',
        content: `Sorry, I encountered an error: ${errorMsg}. Please check that an AI API key is configured in Settings.`,
        metadata: null,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, aiMsg]);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar - Sessions */}
      <div className="w-64 border-r border-surface-border bg-white flex flex-col flex-shrink-0">
        <div className="p-3 border-b border-surface-border">
          <button onClick={createNewSession} className="btn-primary w-full">
            <Plus size={16} /> New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.length === 0 ? (
            <p className="text-xs text-ink-muted text-center py-8">No chats yet</p>
          ) : (
            sessions.map(session => (
              <div
                key={session.id}
                onClick={() => setSelectedSession(session)}
                className={cn(
                  'flex items-center gap-2 p-2.5 rounded-xl cursor-pointer transition-colors group',
                  selectedSession?.id === session.id ? 'bg-swiss-red-50 text-swiss-red' : 'hover:bg-surface-light text-ink-secondary'
                )}
              >
                <MessageSquare size={14} className="flex-shrink-0" />
                <span className="text-sm truncate flex-1">{session.title}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                  className="opacity-0 group-hover:opacity-100 text-ink-muted hover:text-error transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {!selectedSession ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 bg-swiss-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Bot size={32} className="text-swiss-red" />
              </div>
              <h3 className="text-lg font-semibold text-ink mb-2">AI Assistant</h3>
              <p className="text-sm text-ink-secondary mb-6">
                Ask questions about your customers, orders, products, and sales. The AI searches your CRM data and provides insights in natural language.
              </p>
              <button onClick={createNewSession} className="btn-primary mx-auto">
                <Sparkles size={16} /> Start a conversation
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-surface-border bg-white">
              <div className="flex items-center gap-2">
                <Bot size={18} className="text-swiss-red" />
                <h3 className="font-semibold text-ink">{selectedSession.title}</h3>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface-light/50">
              {msgLoading ? (
                <div className="flex items-center justify-center py-12"><Spinner size={28} /></div>
              ) : messages.length === 0 ? (
                <div className="max-w-2xl mx-auto space-y-3">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-swiss-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Bot size={16} className="text-swiss-red" />
                    </div>
                    <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 border border-surface-border">
                      <p className="text-sm text-ink">Hi! I'm your AI assistant. I can help you analyse your CRM data. Try asking me one of these:</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-11">
                    {SUGGESTED_PROMPTS.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(prompt.text)}
                        className="flex items-center gap-2 p-3 rounded-xl bg-white border border-surface-border hover:border-swiss-red hover:bg-swiss-red-50 transition-all text-left"
                      >
                        <prompt.icon size={16} className="text-swiss-red flex-shrink-0" />
                        <span className="text-sm text-ink-secondary">{prompt.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className={cn('flex gap-3 max-w-3xl', msg.role === 'user' ? 'ml-auto flex-row-reverse' : '')}>
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                      msg.role === 'user' ? 'bg-swiss-red text-white' : 'bg-swiss-red-50 text-swiss-red'
                    )}>
                      {msg.role === 'user' ? <span className="text-xs font-bold">You</span> : <Bot size={16} />}
                    </div>
                    <div className={cn(
                      'rounded-2xl px-4 py-3',
                      msg.role === 'user' ? 'bg-swiss-red text-white rounded-tr-sm' : 'bg-white border border-surface-border text-ink rounded-tl-sm'
                    )}>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
              {sending && (
                <div className="flex gap-3 max-w-3xl">
                  <div className="w-8 h-8 bg-swiss-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Bot size={16} className="text-swiss-red" />
                  </div>
                  <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 border border-surface-border">
                    <Spinner size={16} />
                  </div>
                </div>
              )}
              {error && (
                <div className="flex gap-3 max-w-3xl">
                  <div className="w-8 h-8 bg-error-light rounded-lg flex items-center justify-center flex-shrink-0">
                    <AlertCircle size={16} className="text-error" />
                  </div>
                  <div className="bg-error-light rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-error">
                    {error}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-surface-border bg-white">
              <div className="flex gap-2 max-w-3xl">
                <input
                  className="input flex-1"
                  placeholder="Ask about your CRM data..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  disabled={sending}
                />
                <button className="btn-primary" onClick={() => sendMessage()} disabled={sending || !input.trim()}>
                  {sending ? <Spinner size={16} /> : <Send size={16} />}
                </button>
              </div>
              <p className="text-xs text-ink-muted mt-2 text-center">
                AI responses are generated based on your CRM data. Always verify important insights.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
