import { useEffect, useState, useCallback } from 'react';
import {
  FolderOpen, FileText, Image, File, Search, Upload,
  Download, Trash2, FileSpreadsheet,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDate, cn } from '@/lib/utils';
import { Badge, Spinner, EmptyState, Modal } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import type { FileEntry, Customer, Order, Profile } from '@/types';

const FILE_ICONS: Record<string, typeof FileText> = {
  'application/pdf': FileText,
  'image/jpeg': Image,
  'image/png': Image,
  'image/webp': Image,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': FileSpreadsheet,
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function Files() {
  const { profile } = useAuth();
  const [files, setFiles] = useState<(FileEntry & { customer?: Customer; uploader?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [folderFilter, setFolderFilter] = useState('all');
  const [showUpload, setShowUpload] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('files')
      .select('*, customer:customers(*), uploader:profiles(*)')
      .order('created_at', { ascending: false });

    if (typeFilter !== 'all') query = query.eq('type', typeFilter);
    if (folderFilter === 'customers') query = query.not('customer_id', 'is', null);
    if (folderFilter === 'orders') query = query.not('order_id', 'is', null);
    if (folderFilter === 'general') query = query.is('customer_id', null).is('order_id', null);

    const { data, error } = await query;
    if (error) console.error('Error loading files:', error);
    else setFiles(data as (FileEntry & { customer?: Customer; uploader?: Profile })[]);
    setLoading(false);
  }, [typeFilter, folderFilter]);

  useEffect(() => {
    loadFiles();
    supabase.from('customers').select('*').is('deleted_at', null).then(({ data }) => setCustomers(data as Customer[] ?? []));
    supabase.from('orders').select('*').is('deleted_at', null).then(({ data }) => setOrders(data as Order[] ?? []));
  }, [loadFiles]);

  const filtered = files.filter(f => {
    if (!search) return true;
    const q = search.toLowerCase();
    return f.name.toLowerCase().includes(q) ||
      f.customer?.first_name?.toLowerCase().includes(q) ||
      f.customer?.last_name?.toLowerCase().includes(q) ||
      f.tags.some(t => t.toLowerCase().includes(q));
  });

  const deleteFile = async (id: string) => {
    await supabase.from('files').delete().eq('id', id);
    loadFiles();
  };

  const totalSize = files.reduce((sum, f) => sum + f.size_bytes, 0);
  const customerFiles = files.filter(f => f.customer_id).length;
  const orderFiles = files.filter(f => f.order_id).length;

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink">Files</h2>
          <p className="text-sm text-ink-secondary">{files.length} files · {formatFileSize(totalSize)} total · {customerFiles} in customer folders · {orderFiles} in order folders</p>
        </div>
        <button className="btn-primary" onClick={() => setShowUpload(true)}>
          <Upload size={16} /> Upload File
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <FolderCard icon={FolderOpen} label="All Files" value={String(files.length)} />
        <FolderCard icon={FileText} label="Documents" value={String(files.filter(f => f.type === 'document').length)} />
        <FolderCard icon={Image} label="Images" value={String(files.filter(f => f.type === 'image').length)} />
        <FolderCard icon={FolderOpen} label="Customer Folders" value={String(new Set(files.filter(f => f.customer_id).map(f => f.customer_id)).size)} />
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input className="input pl-9" placeholder="Search files..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input sm:w-36" value={folderFilter} onChange={(e) => setFolderFilter(e.target.value)}>
          <option value="all">All Folders</option>
          <option value="customers">Customer Files</option>
          <option value="orders">Order Files</option>
          <option value="general">General Files</option>
        </select>
        <select className="input sm:w-36" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">All Types</option>
          <option value="document">Documents</option>
          <option value="image">Images</option>
        </select>
      </div>

      {/* Files grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Spinner size={32} /></div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState icon={<FolderOpen size={48} />} title="No files found" description="Upload files and organize them in customer or order folders." action={<button className="btn-primary" onClick={() => setShowUpload(true)}><Upload size={16} /> Upload File</button>} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(file => {
            const Icon = FILE_ICONS[file.mime_type ?? ''] ?? File;
            return (
              <div key={file.id} className="card p-4 group hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3 mb-3">
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                    file.type === 'image' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                  )}>
                    <Icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{file.name}</p>
                    <p className="text-xs text-ink-muted">{formatFileSize(file.size_bytes)} · {formatDate(file.created_at)}</p>
                  </div>
                </div>
                {file.customer && (
                  <p className="text-xs text-ink-secondary mb-2 truncate">
                    <span className="font-medium">Customer:</span> {file.customer.first_name} {file.customer.last_name}
                  </p>
                )}
                {file.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {file.tags.map(tag => (
                      <span key={tag} className="text-[10px] bg-surface-light text-ink-muted px-1.5 py-0.5 rounded-full">{tag}</span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ink-muted">{file.uploader?.full_name ?? 'Unknown'}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 rounded-lg hover:bg-surface-light text-ink-muted hover:text-ink" title="Download">
                      <Download size={14} />
                    </button>
                    <button onClick={() => deleteFile(file.id)} className="p-1.5 rounded-lg hover:bg-error-light text-ink-muted hover:text-error" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onSaved={() => { setShowUpload(false); loadFiles(); }} customers={customers} orders={orders} />}
    </div>
  );
}

function FolderCard({ icon: Icon, label, value }: { icon: typeof FolderOpen; label: string; value: string }) {
  return (
    <div className="card p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-ink-muted font-medium">{label}</span>
        <Icon size={16} className="text-swiss-red" />
      </div>
      <span className="text-xl font-bold text-ink">{value}</span>
    </div>
  );
}

function UploadModal({ onClose, onSaved, customers, orders }: {
  onClose: () => void; onSaved: () => void; customers: Customer[]; orders: Order[];
}) {
  const { profile } = useAuth();
  const [form, setForm] = useState({
    name: '', customer_id: '', order_id: '', tags: '', is_public: false,
  });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const orgId = profile?.organisation_id;
    if (!orgId) { setError('No organisation found'); setSaving(false); return; }

    const fileName = form.name || file?.name || 'Untitled';
    const mimeType = file?.type || 'application/octet-stream';
    const sizeBytes = file?.size ?? 0;
    const isImage = mimeType.startsWith('image/');
    const type = isImage ? 'image' : 'document';

    const { error } = await supabase.from('files').insert({
      organisation_id: orgId,
      name: fileName,
      type,
      mime_type: mimeType,
      size_bytes: sizeBytes,
      customer_id: form.customer_id || null,
      order_id: form.order_id || null,
      uploaded_by: profile.id,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      is_public: form.is_public,
    });

    if (error) setError(error.message);
    else onSaved();
    setSaving(false);
  };

  return (
    <Modal open onClose={onClose} title="Upload File" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-error-light text-error text-sm rounded-xl p-3">{error}</div>}
        <div>
          <label className="label">Select File</label>
          <div
            onClick={() => document.getElementById('file-input')?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]); }}
            className="border-2 border-dashed border-surface-border rounded-xl p-6 cursor-pointer hover:border-swiss-red hover:bg-swiss-red-50/30 transition-colors text-center"
          >
            {file ? (
              <div className="text-sm text-ink">
                <FileText size={24} className="mx-auto mb-2 text-swiss-red" />
                {file.name} ({formatFileSize(file.size)})
              </div>
            ) : (
              <>
                <Upload size={24} className="mx-auto mb-2 text-ink-muted" />
                <p className="text-sm text-ink-secondary">Click or drag a file here</p>
              </>
            )}
          </div>
          <input id="file-input" type="file" className="hidden" onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])} />
        </div>
        <div>
          <label className="label">Display Name</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Leave blank to use filename" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Customer Folder</label>
            <select className="input" value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
              <option value="">No customer</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Order Folder</label>
            <select className="input" value={form.order_id} onChange={(e) => setForm({ ...form, order_id: e.target.value })}>
              <option value="">No order</option>
              {orders.map(o => <option key={o.id} value={o.id}>{o.order_number}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Tags (comma-separated)</label>
          <input className="input" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="e.g. ID, KYC, Design" />
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-secondary">
          <input type="checkbox" checked={form.is_public} onChange={(e) => setForm({ ...form, is_public: e.target.checked })} className="w-4 h-4 accent-swiss-red" />
          Visible to customer
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving || !file}>
            {saving ? <Spinner size={16} /> : <Upload size={16} />} Upload
          </button>
        </div>
      </form>
    </Modal>
  );
}
