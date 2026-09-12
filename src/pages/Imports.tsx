import { useState, useRef } from 'react';
import { Upload, FileText, Check, AlertCircle, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Spinner } from '@/components/ui';
import { cn } from '@/lib/utils';

type Step = 'upload' | 'preview' | 'map' | 'validate' | 'results';

interface ParsedRow {
  [key: string]: string;
}

function parseDelimited(text: string, delimiter: ',' | '\t'): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      value += '"';
      index++;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      row.push(value.trim());
      value = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index++;
      row.push(value.trim());
      if (row.some(cell => cell !== '')) rows.push(row);
      row = [];
      value = '';
    } else {
      value += char;
    }
  }
  row.push(value.trim());
  if (row.some(cell => cell !== '')) rows.push(row);
  return rows;
}

export function Imports() {
  const { profile } = useAuth();
  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [imported, setImported] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dataType, setDataType] = useState<'customers' | 'orders' | 'products'>('customers');
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const columnMapping: Record<string, string[]> = {
    customers: ['first_name', 'last_name', 'email', 'phone', 'city', 'preferred_language', 'customer_source', 'status'],
    orders: ['order_number', 'customer_id', 'order_date', 'status', 'total', 'deposit', 'outstanding_balance'],
    products: ['name', 'category', 'karat', 'gold_color', 'weight', 'price', 'stone_type'],
  };

  const handleFile = async (file: File) => {
    setLoading(true);
    setErrors([]);
    setFileName(file.name);
    if (!/\.(csv|tsv)$/i.test(file.name)) {
      setErrors(['This version supports CSV and TSV files. Export Excel files as CSV before importing.']);
      setLoading(false);
      return;
    }
    const text = await file.text();
    const delimiter = file.name.toLowerCase().endsWith('.tsv') || (text.includes('\t') && !text.includes(',')) ? '\t' : ',';
    const parsed = parseDelimited(text, delimiter);
    if (parsed.length === 0) {
      setErrors(['File is empty']);
      setLoading(false);
      return;
    }

    const parsedHeaders = parsed[0];
    const parsedRows = parsed.slice(1).map(values => Object.fromEntries(parsedHeaders.map((header, index) => [header, values[index] ?? ''])));
    const automaticMapping = Object.fromEntries(columnMapping[dataType].map(field => {
      const normalisedField = field.toLowerCase().replace(/[\s-]+/g, '_');
      const match = parsedHeaders.find(header => header.toLowerCase().replace(/[\s-]+/g, '_') === normalisedField);
      return [field, match ?? ''];
    }));
    setHeaders(parsedHeaders);
    setRows(parsedRows);
    setFieldMapping(automaticMapping);
    setStep('preview');
    setLoading(false);
  };

  const mappedRows = () => rows.map(row => Object.fromEntries(
    columnMapping[dataType].map(field => [field, fieldMapping[field] ? row[fieldMapping[field]] ?? '' : ''])
  ));

  const validateData = () => {
    const errs: string[] = [];
    const requiredFields = dataType === 'customers' ? ['first_name', 'last_name'] : dataType === 'orders' ? ['order_number', 'customer_id'] : ['name', 'category'];

    mappedRows().forEach((row, idx) => {
      const missing = requiredFields.filter(f => !row[f] || row[f].trim() === '');
      if (missing.length > 0) {
        errs.push(`Row ${idx + 2}: Missing required field(s): ${missing.join(', ')}`);
      }
      if (dataType === 'customers' && row.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(row.email)) {
          errs.push(`Row ${idx + 2}: Invalid email format "${row.email}"`);
        }
      }
    });

    // Check for duplicates
    if (dataType === 'customers') {
      const emails = mappedRows().map(r => r.email?.toLowerCase()).filter(Boolean);
      const dupes = emails.filter((e, i) => emails.indexOf(e) !== i);
      if (dupes.length > 0) {
        errs.push(`Duplicate emails found: ${dupes.join(', ')}`);
      }
    }

    setErrors(errs);
    setStep('validate');
  };

  const performImport = async () => {
    setLoading(true);
    const orgId = profile?.organisation_id;
    if (!orgId) {
      setErrors(['No organisation found']);
      setLoading(false);
      return;
    }

    let importedCount = 0;
    let skippedCount = 0;

    const dataRows = mappedRows();

    if (dataType === 'customers') {
      for (const row of dataRows) {
        if (!row.first_name || !row.last_name) { skippedCount++; continue; }
        const { error } = await supabase.from('customers').insert({
          organisation_id: orgId,
          first_name: row.first_name,
          last_name: row.last_name,
          email: row.email || null,
          phone: row.phone || null,
          city: row.city || null,
          preferred_language: row.preferred_language || 'en',
          customer_source: row.customer_source || 'walk_in',
          status: row.status || 'active',
          tags: [],
          created_by: profile?.id,
        });
        if (error) skippedCount++;
        else importedCount++;
      }
    } else if (dataType === 'orders') {
      for (const row of dataRows) {
        if (!row.order_number || !row.customer_id) { skippedCount++; continue; }
        const total = Number(row.total) || 0;
        const deposit = Number(row.deposit) || 0;
        const { error } = await supabase.from('orders').insert({
          organisation_id: orgId,
          order_number: row.order_number,
          customer_id: row.customer_id,
          order_date: row.order_date || new Date().toISOString().slice(0, 10),
          status: row.status || 'draft',
          subtotal: total,
          total,
          deposit,
          outstanding_balance: row.outstanding_balance ? Number(row.outstanding_balance) || 0 : total - deposit,
          created_by: profile.id,
        });
        if (error) skippedCount++; else importedCount++;
      }
    } else {
      for (const row of dataRows) {
        if (!row.name || !row.category) { skippedCount++; continue; }
        const { error } = await supabase.from('products').insert({
          organisation_id: orgId,
          name: row.name,
          category: row.category,
          karat: row.karat || null,
          gold_color: row.gold_color || null,
          weight: Number(row.weight) || 0,
          price: Number(row.price) || 0,
          stone_type: row.stone_type || null,
          created_by: profile.id,
        });
        if (error) skippedCount++; else importedCount++;
      }
    }

    setImported(importedCount);
    setSkipped(skippedCount);
    setStep('results');
    setLoading(false);
  };

  const reset = () => {
    setStep('upload');
    setFileName('');
    setHeaders([]);
    setRows([]);
    setErrors([]);
    setFieldMapping({});
    setImported(0);
    setSkipped(0);
  };

  const steps: { id: Step; label: string }[] = [
    { id: 'upload', label: 'Upload' },
    { id: 'preview', label: 'Preview' },
    { id: 'map', label: 'Map' },
    { id: 'validate', label: 'Validate' },
    { id: 'results', label: 'Results' },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[900px] mx-auto">
      <div>
        <h2 className="text-xl font-bold text-ink">Import Data</h2>
        <p className="text-sm text-ink-secondary">Import customers, orders, or products from CSV or TSV files</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <div className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium',
              step === s.id ? 'bg-swiss-red text-white' :
              steps.findIndex(x => x.id === step) > i ? 'bg-success-light text-success' : 'bg-surface-light text-ink-muted'
            )}>
              {steps.findIndex(x => x.id === step) > i ? <Check size={14} /> : <span className="w-4 h-4 flex items-center justify-center">{i + 1}</span>}
              {s.label}
            </div>
            {i < steps.length - 1 && <ChevronRight size={14} className="text-ink-muted" />}
          </div>
        ))}
      </div>

      {/* Upload step */}
      {step === 'upload' && (
        <div className="card p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-swiss-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Upload size={32} className="text-swiss-red" />
            </div>
            <h3 className="font-semibold text-ink mb-2">Upload your file</h3>
            <p className="text-sm text-ink-secondary mb-4">Supports CSV and TSV files</p>
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const file = event.dataTransfer.files[0];
                if (file) handleFile(file);
              }}
              className="border-2 border-dashed border-surface-border rounded-xl p-8 cursor-pointer hover:border-swiss-red hover:bg-swiss-red-50/30 transition-colors"
            >
              <FileText size={24} className="text-ink-muted mx-auto mb-2" />
              <p className="text-sm text-ink">Click to select a file or drag and drop</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.tsv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>
          {errors.length > 0 && <div className="mt-4 bg-error-light text-error text-sm rounded-xl p-3">{errors[0]}</div>}
          <div className="mt-6">
            <label className="label">Data Type</label>
            <select className="input" value={dataType} onChange={(e) => { setDataType(e.target.value as typeof dataType); setFieldMapping({}); }}>
              <option value="customers">Customers</option>
              <option value="orders">Orders</option>
              <option value="products">Products</option>
            </select>
          </div>
        </div>
      )}

      {/* Preview step */}
      {step === 'preview' && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-ink">Preview: {fileName}</h3>
              <p className="text-sm text-ink-secondary">{rows.length} rows, {headers.length} columns</p>
            </div>
            <button className="btn-primary" onClick={() => setStep('map')}>
              Continue <ChevronRight size={16} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-light">
                <tr>
                  {headers.map(h => <th key={h} className="px-3 py-2 text-left font-medium text-ink-muted">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 10).map((row, i) => (
                  <tr key={i} className="border-t border-surface-border">
                    {headers.map(h => <td key={h} className="px-3 py-2 text-ink-secondary">{row[h]}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 10 && <p className="text-xs text-ink-muted mt-2 text-center">Showing first 10 of {rows.length} rows</p>}
          </div>
        </div>
      )}

      {/* Map step */}
      {step === 'map' && (
        <div className="card p-5">
          <h3 className="font-semibold text-ink mb-4">Map Columns</h3>
          <p className="text-sm text-ink-secondary mb-4">Match your file columns to CRM fields</p>
          <div className="space-y-3">
            {columnMapping[dataType].map(field => (
              <div key={field} className="flex items-center gap-4">
                <span className="text-sm font-medium text-ink w-40">{field.replace(/_/g, ' ')}</span>
                <ChevronRight size={14} className="text-ink-muted" />
                <select className="input flex-1" value={fieldMapping[field] ?? ''} onChange={(event) => setFieldMapping({ ...fieldMapping, [field]: event.target.value })}>
                  <option value="">Skip this field</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-6">
            <button className="btn-secondary" onClick={() => setStep('preview')}>Back</button>
            <button className="btn-primary" onClick={validateData}>Validate Data</button>
          </div>
        </div>
      )}

      {/* Validate step */}
      {step === 'validate' && (
        <div className="card p-5">
          <h3 className="font-semibold text-ink mb-4">Validation Results</h3>
          {loading ? (
            <div className="flex items-center justify-center py-8"><Spinner size={24} /></div>
          ) : errors.length === 0 ? (
            <div className="bg-success-light rounded-xl p-4 flex items-center gap-3 mb-4">
              <Check size={20} className="text-success" />
              <p className="text-sm text-success">All {rows.length} rows passed validation. No errors found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-error-light rounded-xl p-4 flex items-center gap-3">
                <AlertCircle size={20} className="text-error" />
                <p className="text-sm text-error">{errors.length} validation error(s) found</p>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1">
                {errors.map((err, i) => (
                  <div key={i} className="text-sm text-ink-secondary bg-surface-light rounded-lg px-3 py-1.5">{err}</div>
                ))}
              </div>
              <p className="text-xs text-ink-muted">You can still import the valid rows. Invalid rows will be skipped.</p>
            </div>
          )}
          <div className="flex justify-between mt-6">
            <button className="btn-secondary" onClick={() => setStep('map')}>Back</button>
            <button className="btn-primary" onClick={performImport} disabled={loading}>
              {loading ? <Spinner size={16} /> : 'Confirm Import'}
            </button>
          </div>
        </div>
      )}

      {/* Results step */}
      {step === 'results' && (
        <div className="card p-8 text-center">
          <div className="w-16 h-16 bg-success-light rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-success" />
          </div>
          <h3 className="font-semibold text-ink mb-2">Import Complete</h3>
          <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto mt-4">
            <div className="bg-success-light rounded-xl p-3">
              <p className="text-2xl font-bold text-success">{imported}</p>
              <p className="text-xs text-ink-muted">Imported</p>
            </div>
            <div className="bg-error-light rounded-xl p-3">
              <p className="text-2xl font-bold text-error">{skipped}</p>
              <p className="text-xs text-ink-muted">Skipped</p>
            </div>
          </div>
          <button className="btn-primary mt-6" onClick={reset}>Import Another File</button>
        </div>
      )}
    </div>
  );
}
