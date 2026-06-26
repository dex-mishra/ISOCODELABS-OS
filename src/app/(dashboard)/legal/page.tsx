'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/contexts/AuthContext';
import {
  FileText,
  Upload,
  Calendar,
  AlertTriangle,
  Search,
  Filter,
  CheckCircle,
  Clock,
  Trash2,
  ExternalLink,
  History,
  X,
} from 'lucide-react';

interface LegalDocument {
  id: string;
  title: string;
  type: 'CONTRACT' | 'NDA' | 'AGREEMENT' | 'INVOICE' | 'COMPLIANCE';
  file_url: string;
  client_id: string | null;
  client?: { id: string; name: string } | null;
  project_id: string | null;
  project?: { id: string; name: string } | null;
  employee_id: string | null;
  employee?: { id: string; name: string } | null;
  status: 'DRAFT' | 'ACTIVE' | 'EXPIRED';
  signed_date: string | null;
  expiry_date: string | null;
  version: number;
  tags: string[];
  versions: string | null; // JSON String
  created_at: string;
}

export default function LegalPage() {
  const { authFetch } = useAuth();
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');

  // Selected document for details & inline view
  const [selectedDoc, setSelectedDoc] = useState<LegalDocument | null>(null);

  // Modals / forms
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // New Document Form
  const [formData, setFormData] = useState({
    title: '',
    type: 'CONTRACT',
    client_id: '',
    project_id: '',
    employee_id: '',
    status: 'ACTIVE',
    signed_date: '',
    expiry_date: '',
    tags: '',
  });
  const [uploadedFileUrl, setUploadedFileUrl] = useState('');

  // Load documents, clients, projects, employees
  const loadData = async () => {
    try {
      setLoading(true);
      const docRes = await authFetch('/api/legal');
      const docs = await docRes.json();
      setDocuments(docs);

      const [clientRes, projRes, empRes] = await Promise.all([
        authFetch('/api/clients'),
        authFetch('/api/projects'),
        authFetch('/api/employees')
      ]);

      setClients(await clientRes.json());
      setProjects(await projRes.json());
      setEmployees(await empRes.json());

      if (docs.length > 0) {
        const params = new URLSearchParams(window.location.search);
        const docId = params.get('docId');
        const found = docs.find((d: any) => d.id === docId);
        setSelectedDoc(found || docs[0]);
      }
    } catch (err) {
      console.error('Failed to load legal page data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter documents
  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(search.toLowerCase()) ||
      doc.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchesType = typeFilter ? doc.type === typeFilter : true;
    const matchesStatus = statusFilter ? doc.status === statusFilter : true;
    const matchesClient = clientFilter ? doc.client_id === clientFilter : true;
    const matchesEmployee = employeeFilter ? doc.employee_id === employeeFilter : true;
    return matchesSearch && matchesType && matchesStatus && matchesClient && matchesEmployee;
  });

  // Check for expiring documents (within 30 days)
  const expiringDocs = documents.filter((doc) => {
    if (!doc.expiry_date || doc.status === 'EXPIRED') return false;
    const diffTime = new Date(doc.expiry_date).getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  });

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    setIsUploading(true);
    setUploadError('');

    try {
      const res = await authFetch('/api/legal/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await res.json();
      setUploadedFileUrl(data.url);
    } catch (err: any) {
      setUploadError(err.message || 'File upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  // Submit new document form
  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedFileUrl) {
      setUploadError('Please upload a document file first.');
      return;
    }

    try {
      const res = await authFetch('/api/legal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          file_url: uploadedFileUrl,
          tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()) : [],
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to create legal document');
      }

      const newDoc = await res.json();
      setDocuments([newDoc, ...documents]);
      setSelectedDoc(newDoc);
      setIsUploadOpen(false);

      // Reset form
      setFormData({
        title: '',
        type: 'CONTRACT',
        client_id: '',
        project_id: '',
        employee_id: '',
        status: 'ACTIVE',
        signed_date: '',
        expiry_date: '',
        tags: '',
      });
      setUploadedFileUrl('');
    } catch (err: any) {
      setUploadError(err.message || 'Failed to save document details.');
    }
  };

  // Upload and replace file with a new version
  const handleUploadNewVersion = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedDoc || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    try {
      setIsUploading(true);
      const uploadRes = await authFetch('/api/legal/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!uploadRes.ok) {
        throw new Error('Upload failed');
      }

      const uploadData = await uploadRes.json();

      // Patch the document
      const res = await authFetch(`/api/legal/${selectedDoc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_url: uploadData.url,
        }),
      });

      if (!res.ok) throw new Error('Failed to update version');

      const updated = await res.json();
      setDocuments(documents.map((d) => (d.id === updated.id ? updated : d)));
      setSelectedDoc(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to update version');
    } finally {
      setIsUploading(false);
    }
  };

  // Delete document
  const handleDeleteDocument = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document? This cannot be undone.')) return;
    try {
      const res = await authFetch(`/api/legal/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      const updatedDocs = documents.filter((d) => d.id !== id);
      setDocuments(updatedDocs);
      if (selectedDoc?.id === id) {
        setSelectedDoc(updatedDocs.length > 0 ? updatedDocs[0] : null);
      }
    } catch (err: any) {
      alert(err.message || 'Delete failed');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-3 gap-8">
          <Skeleton className="col-span-2 h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  // Parse versions history
  let versionsHistory: { version: number; file_url: string; created_at: string }[] = [];
  if (selectedDoc && selectedDoc.versions) {
    try {
      versionsHistory = JSON.parse(selectedDoc.versions);
    } catch (e) {
      versionsHistory = [];
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Legal Documents</h1>
          <p className="text-sm text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mt-1">
            Store, view, and version control company contracts, NDAs, and SLA agreements.
          </p>
        </div>
        <Button onClick={() => setIsUploadOpen(true)} className="flex items-center gap-2">
          <Upload size={16} />
          <span>Upload Document</span>
        </Button>
      </div>

      {/* Expiry alerts banner */}
      {expiringDocs.length > 0 && (
        <div className="bg-apple-red/10 border border-apple-red/20 text-apple-red p-4 rounded-apple flex items-start gap-3">
          <AlertTriangle size={20} className="shrink-0 mt-0.5 animate-pulse" />
          <div>
            <h4 className="font-semibold text-sm">Contract Expiry Warning(s)</h4>
            <p className="text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mt-1">
              The following documents are expiring within the next 30 days:
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {expiringDocs.map((doc) => {
                const diff = new Date(doc.expiry_date!).getTime() - new Date().getTime();
                const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                return (
                  <Badge key={doc.id} variant="danger" className="text-[10px]">
                    {doc.title} ({days} days left)
                  </Badge>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Search & filters */}
      <div className="flex flex-wrap items-center gap-4 bg-card p-4 rounded-apple border border-border">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-sf-text-secondaryLight dark:text-sf-text-secondaryDark" />
          <input
            type="text"
            placeholder="Search documents or tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-sf-bg-light dark:bg-sf-bg-elevatedDark border border-border rounded-apple focus:outline-none focus:ring-1 focus:ring-apple-blue"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-sf-bg-light dark:bg-sf-bg-elevatedDark border border-border rounded-apple focus:outline-none"
        >
          <option value="">All Document Types</option>
          <option value="CONTRACT">Contract</option>
          <option value="NDA">NDA</option>
          <option value="AGREEMENT">Agreement</option>
          <option value="INVOICE">Invoice</option>
          <option value="COMPLIANCE">Compliance</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-sf-bg-light dark:bg-sf-bg-elevatedDark border border-border rounded-apple focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="ACTIVE">Active</option>
          <option value="EXPIRED">Expired</option>
        </select>

        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-sf-bg-light dark:bg-sf-bg-elevatedDark border border-border rounded-apple focus:outline-none"
        >
          <option value="">All Clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={employeeFilter}
          onChange={(e) => setEmployeeFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-sf-bg-light dark:bg-sf-bg-elevatedDark border border-border rounded-apple focus:outline-none"
        >
          <option value="">All Employees</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name}
            </option>
          ))}
        </select>
      </div>

      {/* Main split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Document list */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="border-b border-border pb-3">
              <span className="text-base font-semibold">Document Ledger</span>
              <Badge variant="secondary">{filteredDocs.length} items</Badge>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-sf-text-secondaryLight dark:text-sf-text-secondaryDark bg-sf-bg-light dark:bg-sf-bg-elevatedDark">
                    <th className="p-4 font-semibold">Document</th>
                    <th className="p-4 font-semibold">Type</th>
                    <th className="p-4 font-semibold">Relates To</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold">Expiry</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredDocs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center p-8 text-sf-text-secondaryLight">
                        No legal documents match your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredDocs.map((doc) => (
                      <tr
                        key={doc.id}
                        onClick={() => setSelectedDoc(doc)}
                        className={`hover:bg-apple-gray dark:hover:bg-sf-bg-elevatedDark cursor-pointer transition-colors ${
                          selectedDoc?.id === doc.id ? 'bg-apple-blue/5 dark:bg-apple-blue/10 border-l-2 border-l-apple-blue' : ''
                        }`}
                      >
                        <td className="p-4">
                          <div className="font-semibold text-sm text-foreground truncate max-w-[200px]" title={doc.title}>
                            {doc.title}
                          </div>
                          <div className="text-[10px] text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mt-0.5">
                            Version {doc.version}
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant={doc.type === 'CONTRACT' ? 'default' : doc.type === 'NDA' ? 'secondary' : 'success'}>
                            {doc.type}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-foreground truncate max-w-[150px]" title={doc.client?.name || doc.employee?.name || ''}>
                            {doc.client?.name || doc.employee?.name || '—'}
                          </div>
                          <div className="text-[10px] text-sf-text-secondaryLight dark:text-sf-text-secondaryDark truncate max-w-[150px]" title={doc.project?.name || ''}>
                            {doc.project?.name || ''}
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge
                            variant={
                              doc.status === 'ACTIVE'
                                ? 'success'
                                : doc.status === 'EXPIRED'
                                ? 'danger'
                                : 'warning'
                            }
                          >
                            {doc.status}
                          </Badge>
                        </td>
                        <td className="p-4 text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                          {doc.expiry_date ? new Date(doc.expiry_date).toLocaleDateString() : 'No expiry'}
                        </td>
                        <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="p-1 text-sf-text-secondaryLight hover:text-apple-red transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right Preview panel */}
        <div className="space-y-4">
          {selectedDoc ? (
            <Card className="h-full flex flex-col">
              <CardHeader className="border-b border-border pb-3 flex flex-row items-center justify-between">
                <span className="text-base font-semibold truncate max-w-[220px]" title={selectedDoc.title}>
                  {selectedDoc.title}
                </span>
                <a
                  href={selectedDoc.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 bg-apple-blue/10 hover:bg-apple-blue/20 text-apple-blue rounded-apple transition-colors"
                  title="Open in new window"
                >
                  <ExternalLink size={16} />
                </a>
              </CardHeader>
              <CardContent className="p-6 flex-1 flex flex-col space-y-6">
                {/* Meta details */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-sf-text-secondaryLight dark:text-sf-text-secondaryDark block font-medium">Signed Date</span>
                    <span className="font-semibold text-foreground mt-0.5 block">
                      {selectedDoc.signed_date ? new Date(selectedDoc.signed_date).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-sf-text-secondaryLight dark:text-sf-text-secondaryDark block font-medium">Expiry Date</span>
                    <span className="font-semibold text-foreground mt-0.5 block">
                      {selectedDoc.expiry_date ? new Date(selectedDoc.expiry_date).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* PDF Inline Viewer */}
                <div className="relative border border-border rounded-apple overflow-hidden flex-1 min-h-[350px] bg-sf-bg-light dark:bg-sf-bg-elevatedDark shadow-inner">
                  {selectedDoc.file_url ? (
                    <iframe
                      src={`${selectedDoc.file_url}#toolbar=0`}
                      className="w-full h-full border-none"
                      title="PDF Viewer"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-sf-text-secondaryLight p-4">
                      <FileText size={48} className="stroke-1 mb-2 text-border" />
                      <span>PDF Viewer Offline</span>
                    </div>
                  )}
                </div>

                {/* Tags */}
                <div>
                  <h5 className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mb-2">Tags</h5>
                  <div className="flex flex-wrap gap-1">
                    {selectedDoc.tags.map((t) => (
                      <Badge key={t} variant="secondary" className="text-[10px]">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Version history */}
                <div className="border-t border-border pt-4">
                  <h5 className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mb-3 flex items-center gap-1.5">
                    <History size={14} />
                    <span>Version Ledger</span>
                  </h5>
                  <div className="space-y-2 max-h-36 overflow-y-auto">
                    {versionsHistory.map((ver) => (
                      <div key={ver.version} className="flex items-center justify-between bg-sf-bg-light dark:bg-sf-bg-elevatedDark p-2 rounded-apple border border-border text-xs">
                        <span className="font-medium text-foreground">Version {ver.version}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-sf-text-secondaryLight">{new Date(ver.created_at).toLocaleDateString()}</span>
                          <a
                            href={ver.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-apple-blue hover:underline text-[10px] font-semibold"
                          >
                            View
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add New Version */}
                  <div className="mt-4">
                    <label className="relative inline-flex items-center justify-center gap-2 bg-sf-bg-light dark:bg-sf-bg-elevatedDark hover:bg-apple-gray dark:hover:bg-sf-bg-elevatedDark border border-border border-dashed rounded-apple py-2 px-4 text-xs font-medium cursor-pointer transition-colors w-full">
                      <Upload size={14} />
                      <span>{isUploading ? 'Uploading...' : 'Upload New Version'}</span>
                      <input
                        type="file"
                        accept=".pdf,.docx"
                        onChange={handleUploadNewVersion}
                        className="hidden"
                        disabled={isUploading}
                      />
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center p-8 text-center text-sf-text-secondaryLight">
              <div className="space-y-2">
                <FileText size={48} className="mx-auto stroke-1" />
                <h4 className="font-semibold text-foreground">No Document Selected</h4>
                <p className="text-xs max-w-xs mx-auto">Select a legal document from the ledger to view details and inline contents.</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Upload/Create Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
          <Card className="w-full max-w-lg mx-4 overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300">
            <button
              onClick={() => setIsUploadOpen(false)}
              className="absolute top-4 right-4 p-1 text-sf-text-secondaryLight hover:text-foreground hover:bg-apple-gray dark:hover:bg-sf-bg-elevatedDark rounded-full transition-all"
            >
              <X size={18} />
            </button>
            <CardHeader className="border-b border-border pb-3">
              <span className="text-base font-semibold">Upload Legal Document</span>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleCreateDocument} className="space-y-4">
                {uploadError && (
                  <div className="bg-apple-red/10 border border-apple-red/20 text-apple-red p-3 rounded-apple text-xs font-medium">
                    {uploadError}
                  </div>
                )}

                {/* File Upload Zone */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">File Attachment (PDF / DOCX)</label>
                  <div className="relative border-2 border-dashed border-border rounded-apple p-6 text-center bg-sf-bg-light dark:bg-sf-bg-elevatedDark hover:bg-apple-gray/50 cursor-pointer transition-colors">
                    <input
                      type="file"
                      accept=".pdf,.docx"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="space-y-2">
                      <div className="mx-auto w-10 h-10 bg-apple-blue/10 rounded-full flex items-center justify-center text-apple-blue">
                        <Upload size={18} />
                      </div>
                      <div className="text-xs">
                        <span className="font-semibold text-apple-blue">Click to upload</span> or drag and drop
                      </div>
                      <p className="text-[10px] text-sf-text-secondaryLight">PDF or DOCX (max 20MB)</p>
                    </div>
                  </div>
                  {uploadedFileUrl && (
                    <div className="flex items-center gap-2 mt-2 p-2 bg-apple-green/10 border border-apple-green/20 rounded-apple text-[11px] text-apple-green font-medium">
                      <CheckCircle size={14} />
                      <span>Document uploaded: {uploadedFileUrl.split('/').pop()}</span>
                    </div>
                  )}
                </div>

                {/* Form fields */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">Document Title</label>
                  <Input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Acme Mutual NDA"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-sf-bg-light dark:bg-sf-bg-elevatedDark border border-border rounded-apple focus:outline-none focus:ring-1 focus:ring-apple-blue h-[36px]"
                    >
                      <option value="CONTRACT">Contract</option>
                      <option value="NDA">NDA</option>
                      <option value="AGREEMENT">Agreement</option>
                      <option value="INVOICE">Invoice</option>
                      <option value="COMPLIANCE">Compliance</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-sf-bg-light dark:bg-sf-bg-elevatedDark border border-border rounded-apple focus:outline-none focus:ring-1 focus:ring-apple-blue h-[36px]"
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="ACTIVE">Active</option>
                      <option value="EXPIRED">Expired</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">Client</label>
                    <select
                      value={formData.client_id}
                      onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-sf-bg-light dark:bg-sf-bg-elevatedDark border border-border rounded-apple focus:outline-none focus:ring-1 focus:ring-apple-blue h-[36px]"
                    >
                      <option value="">None</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">Project</label>
                    <select
                      value={formData.project_id}
                      onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-sf-bg-light dark:bg-sf-bg-elevatedDark border border-border rounded-apple focus:outline-none focus:ring-1 focus:ring-apple-blue h-[36px]"
                    >
                      <option value="">None</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">Employee</label>
                    <select
                      value={formData.employee_id}
                      onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-sf-bg-light dark:bg-sf-bg-elevatedDark border border-border rounded-apple focus:outline-none focus:ring-1 focus:ring-apple-blue h-[36px]"
                    >
                      <option value="">None</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">Signed Date (Optional)</label>
                    <Input
                      type="date"
                      value={formData.signed_date}
                      onChange={(e) => setFormData({ ...formData, signed_date: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">Expiry Date (Optional)</label>
                    <Input
                      type="date"
                      value={formData.expiry_date}
                      onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">Tags (comma-separated)</label>
                  <Input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="e.g. NDA, Confidential, SaaS"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <Button type="button" variant="outline" onClick={() => setIsUploadOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isUploading || !uploadedFileUrl}>
                    Save Document
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
