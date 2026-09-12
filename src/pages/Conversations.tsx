import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Mail, MessageCircle, Instagram, Facebook, FileText, Search,
  Send, ArrowLeft, CheckCheck, Circle, Star, Filter,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { timeAgo, cn } from '@/lib/utils';
import { Badge, Spinner, EmptyState, Avatar } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import type { Conversation, Message as MessageType, Customer, Profile } from '@/types';

const CHANNEL_ICONS: Record<string, typeof Mail> = {
  email: Mail,
  whatsapp: MessageCircle,
  instagram: Instagram,
  facebook: Facebook,
  jotform: FileText,
};

const CHANNEL_COLORS: Record<string, string> = {
  email: 'bg-blue-50 text-blue-600',
  whatsapp: 'bg-green-50 text-green-600',
  instagram: 'bg-pink-50 text-pink-600',
  facebook: 'bg-blue-50 text-blue-700',
  jotform: 'bg-orange-50 text-orange-600',
};

export function Conversations() {
  const { profile } = useAuth();
  const [conversations, setConversations] = useState<(Conversation & { customer?: Customer; assignee?: Profile })[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('conversations')
      .select('*, customer:customers(*), assignee:profiles!conversations_assigned_to_fkey(*)')
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (channelFilter !== 'all') query = query.eq('channel', channelFilter);
    if (statusFilter !== 'all') query = query.eq('status', statusFilter);

    const { data, error } = await query;
    if (error) console.error('Error loading conversations:', error);
    else setConversations(data as (Conversation & { customer?: Customer; assignee?: Profile })[]);
    setLoading(false);
  }, [channelFilter, statusFilter]);

  useEffect(() => {
    loadConversations();
    supabase.from('profiles').select('*').then(({ data }) => setProfiles(data as Profile[] ?? []));
  }, [loadConversations]);

  const loadMessages = useCallback(async (convId: string) => {
    setMsgLoading(true);
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    if (error) console.error('Error loading messages:', error);
    else setMessages(data as MessageType[]);

    await supabase
      .from('conversations')
      .update({ unread_count: 0 })
      .eq('id', convId);

    setMsgLoading(false);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, []);

  useEffect(() => {
    if (selectedId) loadMessages(selectedId);
  }, [selectedId, loadMessages]);

  const filtered = conversations.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.subject?.toLowerCase().includes(q) ||
      c.customer?.first_name?.toLowerCase().includes(q) ||
      c.customer?.last_name?.toLowerCase().includes(q) ||
      c.last_message_preview?.toLowerCase().includes(q);
  });

  const selected = conversations.find(c => c.id === selectedId);

  const sendReply = async () => {
    if (!reply.trim() || !selectedId || !profile) return;
    setSending(true);
    const orgId = profile.organisation_id;
    if (!orgId) { setSending(false); return; }

    const { error } = await supabase.from('messages').insert({
      organisation_id: orgId,
      conversation_id: selectedId,
      customer_id: selected?.customer_id ?? null,
      sender_type: 'agent',
      sender_name: profile.full_name,
      body: reply.trim(),
      is_read: true,
    });

    if (error) {
      console.error('Error sending reply:', error);
    } else {
      setReply('');
      await supabase
        .from('conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: reply.trim().slice(0, 100),
          status: 'open',
        })
        .eq('id', selectedId);
      loadMessages(selectedId);
      loadConversations();
    }
    setSending(false);
  };

  const updateStatus = async (convId: string, status: string) => {
    await supabase.from('conversations').update({ status }).eq('id', convId);
    loadConversations();
  };

  const assignTo = async (convId: string, userId: string) => {
    await supabase.from('conversations').update({ assigned_to: userId || null }).eq('id', convId);
    loadConversations();
  };

  const openCount = conversations.filter(c => c.status === 'open').length;
  const pendingCount = conversations.filter(c => c.status === 'pending').length;
  const unresolvedCount = conversations.filter(c => c.status === 'resolved').length;

  if (selectedId && selected) {
    const ChannelIcon = CHANNEL_ICONS[selected.channel] ?? Mail;
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="flex items-center gap-3 p-4 border-b border-surface-border bg-white">
          <button onClick={() => { setSelectedId(null); loadConversations(); }} className="btn-ghost p-2">
            <ArrowLeft size={18} />
          </button>
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', CHANNEL_COLORS[selected.channel])}>
            <ChannelIcon size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-ink truncate">{selected.subject ?? 'No subject'}</h3>
            <p className="text-xs text-ink-muted">
              {selected.customer ? `${selected.customer.first_name} ${selected.customer.last_name}` : 'Unknown'} · {selected.channel}
            </p>
          </div>
          <select
            value={selected.status}
            onChange={(e) => updateStatus(selected.id, e.target.value)}
            className="input w-32 text-sm"
          >
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
          </select>
          <select
            value={selected.assigned_to ?? ''}
            onChange={(e) => assignTo(selected.id, e.target.value)}
            className="input w-40 text-sm"
          >
            <option value="">Unassigned</option>
            {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface-light/50">
          {msgLoading ? (
            <div className="flex items-center justify-center py-12"><Spinner size={28} /></div>
          ) : messages.length === 0 ? (
            <EmptyState title="No messages" description="This conversation has no messages yet." />
          ) : (
            messages.map(msg => {
              const isAgent = msg.sender_type === 'agent';
              return (
                <div key={msg.id} className={cn('flex', isAgent ? 'justify-end' : 'justify-start')}>
                  <div className={cn('max-w-[70%] rounded-2xl px-4 py-2.5', isAgent ? 'bg-swiss-red text-white' : 'bg-white border border-surface-border text-ink')}>
                    <p className="text-xs font-medium mb-1 opacity-80">{msg.sender_name ?? (isAgent ? 'Agent' : 'Customer')}</p>
                    <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                    <p className={cn('text-[10px] mt-1', isAgent ? 'text-white/70' : 'text-ink-muted')}>{timeAgo(msg.created_at)}</p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-surface-border bg-white">
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="Type your reply..."
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
            />
            <button className="btn-primary" onClick={sendReply} disabled={sending || !reply.trim()}>
              {sending ? <Spinner size={16} /> : <Send size={16} />}
              Send
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1400px] mx-auto">
      <div>
        <h2 className="text-xl font-bold text-ink">Conversations</h2>
        <p className="text-sm text-ink-secondary">{openCount} open · {pendingCount} pending · {unresolvedCount} resolved</p>
      </div>

      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input className="input pl-9" placeholder="Search conversations..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input sm:w-36" value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)}>
          <option value="all">All Channels</option>
          <option value="email">Email</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="instagram">Instagram</option>
          <option value="facebook">Facebook</option>
          <option value="jotform">Jotform</option>
        </select>
        <select className="input sm:w-36" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="pending">Pending</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Spinner size={32} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<MessageCircle size={48} />} title="No conversations found" description="Messages from email, WhatsApp, Instagram and more will appear here." />
        ) : (
          <div className="divide-y divide-surface-border">
            {filtered.map(conv => {
              const ChannelIcon = CHANNEL_ICONS[conv.channel] ?? Mail;
              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedId(conv.id)}
                  className="flex items-start gap-3 p-4 hover:bg-surface-light cursor-pointer transition-colors"
                >
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', CHANNEL_COLORS[conv.channel])}>
                    <ChannelIcon size={18} />
                  </div>
                  {conv.customer && (
                    <Avatar firstName={conv.customer.first_name} lastName={conv.customer.last_name} size={40} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-ink text-sm truncate">
                        {conv.customer ? `${conv.customer.first_name} ${conv.customer.last_name}` : 'Unknown sender'}
                      </span>
                      {conv.priority === 'high' && <Star size={12} className="text-swiss-red fill-swiss-red" />}
                      <span className="text-xs text-ink-muted ml-auto flex-shrink-0">{timeAgo(conv.last_message_at)}</span>
                    </div>
                    <p className="text-xs text-ink-secondary truncate mt-0.5">{conv.subject}</p>
                    <p className="text-xs text-ink-muted truncate mt-0.5">{conv.last_message_preview}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <Badge status={conv.status} />
                    {conv.unread_count > 0 && (
                      <span className="bg-swiss-red text-white text-xs font-medium rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
