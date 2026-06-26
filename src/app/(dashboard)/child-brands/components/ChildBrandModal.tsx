'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';
import {
  X,
  Package,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react';
import type { ProductHierarchyType } from '@/lib/brand/child-brand-config';
import type { ChildBrand } from '../types';

interface FormState {
  name: string;
  product_type: ProductHierarchyType;
  mission: string;
  vision: string;
  enemy: string;
  target_audience: string;
  promise: string;
  story: string;
  voice: string;
  vocabulary: string[];
  tagline: string;
  messaging: string;
  custom_logo_url: string;
  custom_primary_color: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  product_type: 'CHILD_PRODUCT',
  mission: '',
  vision: '',
  enemy: '',
  target_audience: '',
  promise: '',
  story: '',
  voice: '',
  vocabulary: [],
  tagline: '',
  messaging: '',
  custom_logo_url: '',
  custom_primary_color: '#2563EB',
};

const STEPS = ['Basics', 'Identity', 'Voice & Messaging', 'Customization'];

function Textarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark tracking-wide uppercase">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full p-3 text-sm bg-apple-gray dark:bg-sf-bg-elevatedDark border border-border rounded-apple focus:outline-none focus:ring-2 focus:ring-apple-blue/30 resize-none"
      />
    </div>
  );
}

export function ChildBrandModal({
  brand,
  productTypes,
  onClose,
  onSaved,
}: {
  brand: ChildBrand | null;
  productTypes: readonly ProductHierarchyType[];
  onClose: () => void;
  onSaved: (saved: ChildBrand) => void;
}) {
  const { authFetch } = useAuth();
  const isEditing = !!brand;

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vocabInput, setVocabInput] = useState('');
  const [form, setForm] = useState<FormState>(() => {
    if (!brand) return EMPTY_FORM;
    return {
      name: brand.name,
      product_type: brand.product_type,
      mission: brand.mission ?? '',
      vision: brand.vision ?? '',
      enemy: brand.enemy ?? '',
      target_audience: brand.target_audience ?? '',
      promise: brand.promise ?? '',
      story: brand.story ?? '',
      voice: brand.voice ?? '',
      vocabulary: brand.vocabulary ?? [],
      tagline: brand.tagline ?? '',
      messaging: brand.messaging ?? '',
      custom_logo_url: brand.custom_logo_url ?? '',
      custom_primary_color: brand.custom_colors?.primary ?? '#2563EB',
    };
  });

  const isDaughter = form.product_type === 'DAUGHTER_COMPANY';

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const addVocab = () => {
    const trimmed = vocabInput.trim();
    if (trimmed && !form.vocabulary.includes(trimmed)) {
      update('vocabulary', [...form.vocabulary, trimmed]);
    }
    setVocabInput('');
  };

  const removeVocab = (term: string) => {
    update('vocabulary', form.vocabulary.filter((t) => t !== term));
  };

  const canProceed = step !== 0 || form.name.trim().length > 0;

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setStep(0);
      setError('A name is required.');
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      name: form.name.trim(),
      product_type: form.product_type,
      mission: form.mission || null,
      vision: form.vision || null,
      enemy: form.enemy || null,
      target_audience: form.target_audience || null,
      promise: form.promise || null,
      story: form.story || null,
      voice: form.voice || null,
      vocabulary: form.vocabulary,
      tagline: form.tagline || null,
      messaging: form.messaging || null,
      custom_logo_url: form.custom_logo_url || null,
      custom_colors: form.custom_primary_color
        ? { primary: form.custom_primary_color }
        : null,
    };

    try {
      const res = await authFetch(
        isEditing ? `/api/child-brands/${brand!.id}` : '/api/child-brands',
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      if (res.ok) {
        onSaved(await res.json());
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to save the child brand.');
      }
    } catch (e) {
      console.error('Failed to save child brand', e);
      setError('An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        className="bg-card border border-border rounded-apple-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-lg font-bold">
              {isEditing ? 'Edit Child Brand' : 'Create Child Brand'}
            </h2>
            <p className="text-[11px] text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
              Step {step + 1} of {STEPS.length} — {STEPS[step]}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-apple hover:bg-apple-gray dark:hover:bg-sf-bg-elevatedDark"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1.5 px-6 py-3 border-b border-border shrink-0">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-1.5 flex-1">
              <div
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= step ? 'bg-apple-blue' : 'bg-apple-gray dark:bg-sf-bg-elevatedDark'
                }`}
              />
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              {/* ── Step 1: Basics ───────────────────────────────── */}
              {step === 0 && (
                <>
                  <Input
                    label="Brand / Product Name"
                    value={form.name}
                    onChange={(e) => update('name', e.target.value)}
                    placeholder="e.g., Atlas Analytics"
                  />
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark tracking-wide uppercase">
                      Product Type
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <TypeCard
                        active={form.product_type === 'CHILD_PRODUCT'}
                        onClick={() => update('product_type', 'CHILD_PRODUCT')}
                        icon={<Package size={18} style={{ color: '#2563EB' }} />}
                        title="Child Product"
                        description="Inherits design.md, brand.md, and all 20 protected principles. Defines its own identity within the ISOCODELABS philosophy."
                        accent="#2563EB"
                      />
                      <TypeCard
                        active={form.product_type === 'DAUGHTER_COMPANY'}
                        onClick={() => update('product_type', 'DAUGHTER_COMPANY')}
                        icon={<Building2 size={18} style={{ color: '#B8734A' }} />}
                        title="Daughter Company"
                        description="An independent business. Inherits only the design language. Creates its own mission, values, and brand constitution."
                        accent="#B8734A"
                      />
                    </div>
                    {productTypes.length !== 2 && (
                      <p className="text-[10px] text-sf-text-secondaryLight">
                        {productTypes.length} product types available.
                      </p>
                    )}
                  </div>
                  {isDaughter && (
                    <div className="flex items-start gap-2 p-3 rounded-apple bg-apple-orange/10 border border-apple-orange/20">
                      <Building2 size={14} className="text-apple-orange shrink-0 mt-0.5" />
                      <p className="text-[11px] leading-relaxed text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                        A daughter company does not inherit the ISOCODELABS brand philosophy. The
                        identity fields below are optional and exist only to mark the boundary of
                        what the parent governs.
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* ── Step 2: Identity ─────────────────────────────── */}
              {step === 1 && (
                <>
                  <Textarea
                    label="Mission — Why does this product exist?"
                    value={form.mission}
                    onChange={(v) => update('mission', v)}
                    placeholder="The single reason this product exists."
                  />
                  <Textarea
                    label="Vision — If it succeeds completely, what changes?"
                    value={form.vision}
                    onChange={(v) => update('vision', v)}
                    placeholder="The world after this product wins."
                  />
                  <Textarea
                    label="Enemy — What mediocrity is it eliminating?"
                    value={form.enemy}
                    onChange={(v) => update('enemy', v)}
                    placeholder="The specific form of accepted mediocrity this product opposes."
                  />
                  <Textarea
                    label="Audience — Who is it for, and not for?"
                    value={form.target_audience}
                    onChange={(v) => update('target_audience', v)}
                    placeholder="Who it serves, and who it intentionally does not serve."
                  />
                  <Textarea
                    label="Promise — One thing every user remembers"
                    value={form.promise}
                    onChange={(v) => update('promise', v)}
                    placeholder="A single promise."
                  />
                  <Textarea
                    label="Story — Why was it created?"
                    value={form.story}
                    onChange={(v) => update('story', v)}
                    placeholder="The origin and reasoning behind the product."
                  />
                </>
              )}

              {/* ── Step 3: Voice & Messaging ────────────────────── */}
              {step === 2 && (
                <>
                  <Textarea
                    label="Voice — The product's own personality"
                    value={form.voice}
                    onChange={(v) => update('voice', v)}
                    placeholder="Compatible with the parent philosophy, but distinct."
                  />
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark tracking-wide uppercase">
                      Vocabulary — Domain-specific language
                    </label>
                    <div className="flex gap-2">
                      <input
                        value={vocabInput}
                        onChange={(e) => setVocabInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addVocab();
                          }
                        }}
                        placeholder="Add a term and press Enter"
                        className="flex-1 px-3 py-2 text-sm bg-apple-gray dark:bg-sf-bg-elevatedDark border border-border rounded-apple focus:outline-none focus:ring-2 focus:ring-apple-blue/30"
                      />
                      <Button variant="outline" size="sm" onClick={addVocab} type="button">
                        <Plus size={14} />
                      </Button>
                    </div>
                    {form.vocabulary.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {form.vocabulary.map((term) => (
                          <span
                            key={term}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-apple-blue/10 text-apple-blue border border-apple-blue/20"
                          >
                            {term}
                            <button onClick={() => removeVocab(term)} className="hover:opacity-70">
                              <X size={11} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <Input
                    label="Tagline"
                    value={form.tagline}
                    onChange={(e) => update('tagline', e.target.value)}
                    placeholder="A short, memorable line."
                  />
                  <Textarea
                    label="Messaging — How it speaks across surfaces"
                    value={form.messaging}
                    onChange={(v) => update('messaging', v)}
                    placeholder="Landing pages, docs, onboarding, and support should reflect this product's unique purpose."
                    rows={4}
                  />
                </>
              )}

              {/* ── Step 4: Customization ────────────────────────── */}
              {step === 3 && (
                <>
                  <p className="text-xs leading-relaxed text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                    Customization strengthens product identity. It must never weaken the inherited
                    philosophy or design language.
                  </p>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark tracking-wide uppercase">
                      Primary Color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={form.custom_primary_color}
                        onChange={(e) => update('custom_primary_color', e.target.value)}
                        className="h-10 w-16 rounded-apple border border-border bg-transparent cursor-pointer"
                      />
                      <input
                        value={form.custom_primary_color}
                        onChange={(e) => update('custom_primary_color', e.target.value)}
                        className="flex-1 px-3 py-2 text-sm font-mono bg-apple-gray dark:bg-sf-bg-elevatedDark border border-border rounded-apple focus:outline-none focus:ring-2 focus:ring-apple-blue/30"
                      />
                    </div>
                  </div>
                  <Input
                    label="Logo URL"
                    value={form.custom_logo_url}
                    onChange={(e) => update('custom_logo_url', e.target.value)}
                    placeholder="https://…"
                  />
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border shrink-0 space-y-2">
          {error && <p className="text-xs text-apple-red font-medium">{error}</p>}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => (step === 0 ? onClose() : setStep((s) => s - 1))}
              type="button"
            >
              {step === 0 ? (
                'Cancel'
              ) : (
                <>
                  <ChevronLeft size={15} className="mr-1" />
                  Back
                </>
              )}
            </Button>
            {step < STEPS.length - 1 ? (
              <Button
                variant="primary"
                onClick={() => setStep((s) => s + 1)}
                disabled={!canProceed}
                type="button"
              >
                Next
                <ChevronRight size={15} className="ml-1" />
              </Button>
            ) : (
              <Button variant="primary" onClick={handleSubmit} loading={saving} type="button">
                <Check size={15} className="mr-1.5" />
                {isEditing ? 'Save Changes' : 'Create Brand'}
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function TypeCard({
  active,
  onClick,
  icon,
  title,
  description,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left p-4 rounded-apple border transition-all ${
        active
          ? 'border-apple-blue shadow-apple-sm bg-apple-blue/5'
          : 'border-border hover:border-apple-blue/40'
      }`}
      style={active ? { borderColor: accent } : undefined}
    >
      <div className="flex items-center justify-between mb-2">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${accent}20` }}
        >
          {icon}
        </div>
        {active && (
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center"
            style={{ backgroundColor: accent }}
          >
            <Check size={12} className="text-white" />
          </div>
        )}
      </div>
      <h4 className="text-sm font-semibold mb-1">{title}</h4>
      <p className="text-[11px] leading-relaxed text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
        {description}
      </p>
    </button>
  );
}
