'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/contexts/AuthContext';
import {
  Users,
  Plus,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  Layers,
  Clock,
  CheckCircle,
  FileText,
  User,
  X,
  CreditCard,
  PlusCircle,
  IndianRupee,
} from 'lucide-react';

interface EmployeePayment {
  id: string;
  employee_id: string;
  hours_worked: number;
  payment_amount: number;
  amount: number;
  status: 'PENDING' | 'PAID';
  payment_date: string | null;
  period: string;
  notes: string | null;
  created_at: string;
}

interface Employee {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string | null;
  skills: string[];
  hourly_rate: number;
  availability: string | null;
  workload: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  contract_start: string | null;
  contract_end: string | null;
  tasks?: { id: string; title: string; status: string; priority: string; due_date: string | null }[];
  projects?: { id: string; name: string; status: string }[];
  payments?: EmployeePayment[];
  legal_documents?: { id: string; title: string; type: string; status: string; expiry_date: string | null; file_url: string }[];
  _count?: { payments: number };
}

export default function EmployeesPage() {
  const { authFetch } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected employee for detail panel
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [detailedEmp, setDetailedEmp] = useState<Employee | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Add Employee Form State
  const [addForm, setAddForm] = useState({
    name: '',
    role: '',
    email: '',
    phone: '',
    skills: '',
    hourly_rate: '',
    availability: 'Full-time',
    status: 'ACTIVE',
    contract_start: '',
    contract_end: '',
  });

  // Log Payment Form State
  const [payForm, setPayForm] = useState({
    hours_worked: '',
    period: new Date().toISOString().substring(0, 7), // e.g. "2026-06"
    status: 'PENDING' as 'PENDING' | 'PAID',
    notes: '',
  });

  // Load all employees
  const loadEmployees = async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/employees');
      const data = await res.json();
      setEmployees(data);
    } catch (err) {
      console.error('Failed to load employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  // Fetch full details of selected employee (including tasks, projects, payments)
  const fetchEmployeeDetails = async (empId: string) => {
    try {
      setDetailLoading(true);
      const res = await authFetch(`/api/employees/${empId}`);
      const data = await res.json();
      setDetailedEmp(data);
    } catch (err) {
      console.error('Failed to load employee details:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEmp) {
      fetchEmployeeDetails(selectedEmp.id);
    } else {
      setDetailedEmp(null);
    }
  }, [selectedEmp]);

  // Submit new employee
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await authFetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...addForm,
          skills: addForm.skills ? addForm.skills.split(',').map((s) => s.trim()) : [],
          hourly_rate: parseFloat(addForm.hourly_rate),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save employee profile');
      }

      const saved = await res.json();
      setEmployees([...employees, saved]);
      setIsAddOpen(false);
      // Reset form
      setAddForm({
        name: '',
        role: '',
        email: '',
        phone: '',
        skills: '',
        hourly_rate: '',
        availability: 'Full-time',
        status: 'ACTIVE',
        contract_start: '',
        contract_end: '',
      });
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Log payment
  const handleLogPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailedEmp) return;
    setErrorMsg('');

    const calculatedAmount = parseFloat(payForm.hours_worked) * detailedEmp.hourly_rate;

    try {
      const res = await authFetch(`/api/employees/${detailedEmp.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hours_worked: parseFloat(payForm.hours_worked),
          amount: calculatedAmount,
          status: payForm.status,
          period: payForm.period,
          notes: payForm.notes,
          payment_date: payForm.status === 'PAID' ? new Date().toISOString() : null,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to log payment');
      }

      const loggedPayment = await res.json();
      
      // Update local state
      if (detailedEmp) {
        setDetailedEmp({
          ...detailedEmp,
          payments: [loggedPayment, ...(detailedEmp.payments || [])],
        });
      }
      setIsPaymentOpen(false);
      setPayForm({
        hours_worked: '',
        period: new Date().toISOString().substring(0, 7),
        status: 'PENDING',
        notes: '',
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Error logging payment');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  // Calculate stats for Team details
  const activeCount = employees.filter((e) => e.status === 'ACTIVE').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employee Registry</h1>
          <p className="text-sm text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mt-1">
            Manage contractors, designers, and developers, assign tasks, and track payment periods.
          </p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="flex items-center gap-2">
          <Plus size={16} />
          <span>New Employee</span>
        </Button>
      </div>

      {/* Team Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card hoverEffect>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark font-medium uppercase tracking-wider">Total Team Members</p>
              <p className="text-3xl font-bold mt-2 text-foreground">{employees.length}</p>
            </div>
            <div className="p-3 bg-apple-blue/10 rounded-apple text-apple-blue">
              <Users size={20} />
            </div>
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark font-medium uppercase tracking-wider">Active Employees</p>
              <p className="text-3xl font-bold mt-2 text-apple-green">{activeCount}</p>
            </div>
            <div className="p-3 bg-apple-green/10 rounded-apple text-apple-green">
              <CheckCircle size={20} />
            </div>
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark font-medium uppercase tracking-wider">Inactive Employees</p>
              <p className="text-3xl font-bold mt-2 text-apple-red">{employees.length - activeCount}</p>
            </div>
            <div className="p-3 bg-apple-red/10 rounded-apple text-apple-red">
              <Clock size={20} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {employees.map((emp) => {
          const taskCount = emp.tasks?.length || 0;
          const projCount = emp.projects?.length || 0;

          return (
            <Card
              key={emp.id}
              hoverEffect
              onClick={() => setSelectedEmp(emp)}
              className={`cursor-pointer transition-all border ${
                selectedEmp?.id === emp.id ? 'border-apple-blue ring-1 ring-apple-blue' : 'border-border'
              }`}
            >
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-apple-blue/10 flex items-center justify-center text-apple-blue font-bold">
                      {emp.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-foreground">{emp.name}</h4>
                      <p className="text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">{emp.role}</p>
                    </div>
                  </div>
                  <Badge variant={emp.status === 'ACTIVE' ? 'success' : 'secondary'}>
                    {emp.status}
                  </Badge>
                </div>

                {/* Info List */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                    <Mail size={14} className="shrink-0" />
                    <span className="truncate">{emp.email}</span>
                  </div>
                  {emp.phone && (
                    <div className="flex items-center gap-2 text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                      <Phone size={14} className="shrink-0" />
                      <span>{emp.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sf-text-secondaryLight dark:text-sf-text-secondaryDark border-t border-border pt-2.5 mt-2">
                    <div className="flex items-center gap-1.5">
                      <IndianRupee size={14} className="text-apple-blue shrink-0" />
                      <span className="font-semibold text-foreground">₹{emp.hourly_rate}/hr</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Layers size={13} className="shrink-0" />
                        <span>{projCount} Proj</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Briefcase size={13} className="shrink-0" />
                        <span>{taskCount} Tasks</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Skills tags */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {emp.skills.slice(0, 3).map((s) => (
                    <Badge key={s} variant="secondary" className="text-[10px] px-2 py-0">
                      {s}
                    </Badge>
                  ))}
                  {emp.skills.length > 3 && (
                    <Badge variant="secondary" className="text-[10px] px-2 py-0">
                      +{emp.skills.length - 3} more
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Selected Employee Detail Drawer/Panel */}
      {selectedEmp && (
        <div className="fixed inset-0 z-40 flex justify-end animate-in fade-in duration-300">
          {/* Backdrop */}
          <div onClick={() => setSelectedEmp(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Slider content */}
          <div className="relative w-full max-w-2xl bg-card border-l border-border h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="h-16 border-b border-border px-6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-apple-blue/10 flex items-center justify-center text-apple-blue font-semibold">
                  {selectedEmp.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">{selectedEmp.name}</h3>
                  <p className="text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">{selectedEmp.role}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmp(null)}
                className="p-1.5 rounded-full hover:bg-apple-gray dark:hover:bg-sf-bg-elevatedDark text-sf-text-secondaryLight hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable details area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
              {detailLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-48 w-full" />
                  <Skeleton className="h-48 w-full" />
                </div>
              ) : detailedEmp ? (
                <>
                  {/* General details grid */}
                  <div className="grid grid-cols-2 gap-4 bg-sf-bg-light dark:bg-sf-bg-elevatedDark p-4 rounded-apple border border-border text-xs">
                    <div>
                      <span className="text-sf-text-secondaryLight block font-medium">Availability</span>
                      <span className="font-semibold text-foreground mt-0.5 block">{detailedEmp.availability || 'Full-time'}</span>
                    </div>
                    <div>
                      <span className="text-sf-text-secondaryLight block font-medium">Hourly Rate</span>
                      <span className="font-semibold text-foreground mt-0.5 block">₹{detailedEmp.hourly_rate}/hr</span>
                    </div>
                    <div>
                      <span className="text-sf-text-secondaryLight block font-medium">Contract Start</span>
                      <span className="font-semibold text-foreground mt-0.5 block">
                        {detailedEmp.contract_start ? new Date(detailedEmp.contract_start).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-sf-text-secondaryLight block font-medium">Contract End</span>
                      <span className="font-semibold text-foreground mt-0.5 block">
                        {detailedEmp.contract_end ? new Date(detailedEmp.contract_end).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Skills Section */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mb-2">Skills & Technologies</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {detailedEmp.skills.map((s) => (
                        <Badge key={s} variant="secondary">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Workload Indicator (Assigned Projects & Tasks) */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mb-3">Workload details</h4>
                    <div className="space-y-4">
                      {/* Projects */}
                      <Card>
                        <CardHeader className="py-2 border-b border-border">
                          <span className="text-xs font-semibold">Linked Projects</span>
                          <Badge variant="secondary">{detailedEmp.projects?.length || 0}</Badge>
                        </CardHeader>
                        <CardContent className="p-4 space-y-2 text-xs">
                          {(!detailedEmp.projects || detailedEmp.projects.length === 0) ? (
                            <div className="text-sf-text-secondaryLight">No active project assignments.</div>
                          ) : (
                            detailedEmp.projects.map((p) => (
                              <div key={p.id} className="flex items-center justify-between border-b border-border pb-1.5 last:border-0 last:pb-0">
                                <span className="font-medium text-foreground">{p.name}</span>
                                <Badge variant={p.status === 'COMPLETED' ? 'success' : p.status === 'ACTIVE' ? 'default' : 'secondary'}>
                                  {p.status}
                                </Badge>
                              </div>
                            ))
                          )}
                        </CardContent>
                      </Card>

                      {/* Tasks */}
                      <Card>
                        <CardHeader className="py-2 border-b border-border">
                          <span className="text-xs font-semibold">Assigned Tasks Checklist</span>
                          <Badge variant="secondary">{detailedEmp.tasks?.length || 0}</Badge>
                        </CardHeader>
                        <CardContent className="p-4 space-y-2 text-xs">
                          {(!detailedEmp.tasks || detailedEmp.tasks.length === 0) ? (
                            <div className="text-sf-text-secondaryLight">No active task assignments.</div>
                          ) : (
                            detailedEmp.tasks.map((t) => (
                              <div key={t.id} className="flex items-center justify-between border-b border-border pb-1.5 last:border-0 last:pb-0">
                                <div>
                                  <span className="font-medium text-foreground truncate block max-w-[200px]">{t.title}</span>
                                  <span className="text-[10px] text-sf-text-secondaryLight">
                                    Due {t.due_date ? new Date(t.due_date).toLocaleDateString() : 'N/A'}
                                  </span>
                                </div>
                                <Badge variant={t.status === 'DONE' ? 'success' : t.status === 'IN_PROGRESS' ? 'default' : 'secondary'}>
                                  {t.status}
                                </Badge>
                              </div>
                            ))
                          )}
                        </CardContent>
                      </Card>

                      {/* Legal Documents */}
                      <Card>
                        <CardHeader className="py-2 border-b border-border flex items-center justify-between">
                          <span className="text-xs font-semibold">Legal Documents</span>
                          <Badge variant="secondary">{detailedEmp.legal_documents?.length || 0}</Badge>
                        </CardHeader>
                        <CardContent className="p-4 space-y-2 text-xs">
                          {(!detailedEmp.legal_documents || detailedEmp.legal_documents.length === 0) ? (
                            <div className="text-sf-text-secondaryLight">No linked legal documents.</div>
                          ) : (
                            detailedEmp.legal_documents.map((doc) => (
                              <div key={doc.id} className="flex items-center justify-between border-b border-border pb-1.5 last:border-0 last:pb-0">
                                <div>
                                  <a
                                    href={doc.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium text-apple-blue hover:underline block max-w-[200px] truncate"
                                  >
                                    {doc.title}
                                  </a>
                                  <span className="text-[10px] text-sf-text-secondaryLight block mt-0.5">
                                    Type: {doc.type} • {doc.expiry_date ? `Expires ${new Date(doc.expiry_date).toLocaleDateString()}` : 'No expiry'}
                                  </span>
                                </div>
                                <Badge variant={doc.status === 'ACTIVE' ? 'success' : doc.status === 'EXPIRED' ? 'danger' : 'secondary'}>
                                  {doc.status}
                                </Badge>
                              </div>
                            ))
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* Payment History & Log payment button */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">Payment ledger</h4>
                      <Button onClick={() => setIsPaymentOpen(true)} className="flex items-center gap-1 py-1 h-7 text-[10px]">
                        <PlusCircle size={12} />
                        <span>Log Payment</span>
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      {(!detailedEmp.payments || detailedEmp.payments.length === 0) ? (
                        <Card className="p-6 text-center text-xs text-sf-text-secondaryLight">
                          No logged payments exist for this employee.
                        </Card>
                      ) : (
                        detailedEmp.payments.map((pay) => (
                          <div
                            key={pay.id}
                            className="bg-sf-bg-light dark:bg-sf-bg-elevatedDark border border-border p-3.5 rounded-apple flex items-center justify-between text-xs transition-colors"
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-foreground text-sm">₹{pay.amount.toLocaleString()}</span>
                                <Badge variant={pay.status === 'PAID' ? 'success' : 'warning'} className="text-[9px] px-2 py-0">
                                  {pay.status}
                                </Badge>
                              </div>
                              <div className="text-[10px] text-sf-text-secondaryLight flex items-center gap-3">
                                <span>Period: {pay.period}</span>
                                <span>•</span>
                                <span>Hours: {pay.hours_worked} hrs</span>
                              </div>
                              {pay.notes && (
                                <p className="text-[10px] text-sf-text-secondaryLight dark:text-sf-text-secondaryDark bg-card p-1 px-2 rounded-apple border border-border inline-block">
                                  {pay.notes}
                                </p>
                              )}
                            </div>
                            <span className="text-[10px] text-sf-text-secondaryLight">
                              {pay.payment_date ? new Date(pay.payment_date).toLocaleDateString() : 'Pending'}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center text-xs text-sf-text-secondaryLight">Failed to parse employee details.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
          <Card className="w-full max-w-lg mx-4 overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300">
            <button
              onClick={() => setIsAddOpen(false)}
              className="absolute top-4 right-4 p-1 text-sf-text-secondaryLight hover:text-foreground hover:bg-apple-gray dark:hover:bg-sf-bg-elevatedDark rounded-full transition-all"
            >
              <X size={18} />
            </button>
            <CardHeader className="border-b border-border pb-3">
              <span className="text-base font-semibold">Add New Employee Profile</span>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleAddEmployee} className="space-y-4">
                {errorMsg && (
                  <div className="bg-apple-red/10 border border-apple-red/20 text-apple-red p-3 rounded-apple text-xs font-medium">
                    {errorMsg}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">Full Name</label>
                    <Input
                      type="text"
                      value={addForm.name}
                      onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                      placeholder="e.g. Alice Dev"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">Role / Title</label>
                    <Input
                      type="text"
                      value={addForm.role}
                      onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                      placeholder="e.g. Senior Frontend Dev"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">Email Address</label>
                    <Input
                      type="email"
                      value={addForm.email}
                      onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                      placeholder="alice@domain.com"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">Phone Number</label>
                    <Input
                      type="text"
                      value={addForm.phone}
                      onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                      placeholder="+1 (555) 012-3456"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">Hourly Rate (₹)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={addForm.hourly_rate}
                      onChange={(e) => setAddForm({ ...addForm, hourly_rate: e.target.value })}
                      placeholder="65.00"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">Availability</label>
                    <Input
                      type="text"
                      value={addForm.availability}
                      onChange={(e) => setAddForm({ ...addForm, availability: e.target.value })}
                      placeholder="Full-time, Part-time, 20h/wk"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">Contract Start</label>
                    <Input
                      type="date"
                      value={addForm.contract_start}
                      onChange={(e) => setAddForm({ ...addForm, contract_start: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">Contract End (Optional)</label>
                    <Input
                      type="date"
                      value={addForm.contract_end}
                      onChange={(e) => setAddForm({ ...addForm, contract_end: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">Skills (comma-separated)</label>
                  <Input
                    type="text"
                    value={addForm.skills}
                    onChange={(e) => setAddForm({ ...addForm, skills: e.target.value })}
                    placeholder="React, Next.js, Node.js, UI/UX"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Save Employee</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Log Payment Modal */}
      {isPaymentOpen && detailedEmp && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
          <Card className="w-full max-w-md mx-4 overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300">
            <button
              onClick={() => setIsPaymentOpen(false)}
              className="absolute top-4 right-4 p-1 text-sf-text-secondaryLight hover:text-foreground hover:bg-apple-gray dark:hover:bg-sf-bg-elevatedDark rounded-full transition-all"
            >
              <X size={18} />
            </button>
            <CardHeader className="border-b border-border pb-3">
              <span className="text-base font-semibold">Record Payment - {detailedEmp.name}</span>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleLogPayment} className="space-y-4">
                {errorMsg && (
                  <div className="bg-apple-red/10 border border-apple-red/20 text-apple-red p-3 rounded-apple text-xs font-medium">
                    {errorMsg}
                  </div>
                )}

                <div className="bg-sf-bg-light dark:bg-sf-bg-elevatedDark p-3.5 rounded-apple border border-border text-xs flex justify-between items-center">
                  <div>
                    <span className="text-sf-text-secondaryLight block font-medium">Hourly Base Rate</span>
                    <span className="font-bold text-foreground text-sm">₹{detailedEmp.hourly_rate}/hr</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sf-text-secondaryLight block font-medium">Calculated Amount</span>
                    <span className="font-bold text-apple-green text-sm">
                      ₹{payForm.hours_worked ? (parseFloat(payForm.hours_worked) * detailedEmp.hourly_rate).toLocaleString() : '0'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">Hours Worked</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={payForm.hours_worked}
                      onChange={(e) => setPayForm({ ...payForm, hours_worked: e.target.value })}
                      placeholder="e.g. 40"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">Period / Cycle</label>
                    <Input
                      type="month"
                      value={payForm.period}
                      onChange={(e) => setPayForm({ ...payForm, period: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">Payment Status</label>
                  <select
                    value={payForm.status}
                    onChange={(e) => setPayForm({ ...payForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs bg-sf-bg-light dark:bg-sf-bg-elevatedDark border border-border rounded-apple focus:outline-none focus:ring-1 focus:ring-apple-blue h-[36px]"
                  >
                    <option value="PENDING">Pending Approval</option>
                    <option value="PAID">Disbursed (Paid)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">Transaction / Memo notes</label>
                  <Input
                    type="text"
                    value={payForm.notes}
                    onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                    placeholder="e.g. June retainer, overtime bonus"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <Button type="button" variant="outline" onClick={() => setIsPaymentOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Record Payment</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
