'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Building2,
  Package,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Palette,
  Sparkles,
  Check,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  MANDATORY_INHERITANCE,
  MAY_CUSTOMIZE_AREAS,
  BRAND_PERSONALITY_TRAITS,
  MAY_DEFINE_AREAS,
} from '@/lib/brand/child-brand-config';
import type { ChildBrand, ComplianceReport } from '../types';

const STATUS_OPTIONS: ChildBrand['status'][] = ['DRAFT', 'ACTIVE', 'ARCHIVED'];

function prettyTrait(trait: string) {
  return trait
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const IDENTITY_FIELDS: { key: keyof ChildBrand; label: string; description: string }[] =
  MAY_DEFINE_AREAS.filter((a) =>
    ['mission', 'vision', 'enemy', 'audience', 'promise', 'story'].includes(a.key)
  ).map((a) => ({
    key: (a.key === 'audience' ? 'target_audience' : a.key) as keyof ChildBrand,
    label: a.name,
    description: a.description,
  }));

export function ChildBrandEditor({
  brand,
  onBack,
  onEdit,
  onUpdated,
  onDeleted,
}: {
  brand: ChildBrand;
  onBack: () => void;
  onEdit: () => void;
  onUpdated: (updated: ChildBrand) => void;
  onDeleted: () => void;
}) {
  const { authFetch } = useAuth();
  const isDaughter = brand.product_type === 'DAUGHTER_COMPANY';

  const [compliance, setCompliance] = useState<ComplianceReport | null>(null);
  const [loadingCompliance, setLoadingCompliance] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchCompliance = useCallback(async () => {
    setLoadingCompliance(true);
    try {
      const res = await authFetch(`/api/child-brands/${brand.id}/compliance`);
      if (res.ok) {
        setCompliance(await res.json());
      }
    } catch (e) {
      console.error('Failed to fetch compliance', e);
    } finally {
      setLoadingCompliance(false);
    }
  }, [authFetch, brand.id]);

  useEffect(() => {
    fetchCompliance();
  }, [fetchCompliance]);

  const handleStatusChange = async (status: ChildBrand['status']) => {
    setUpdatingStatus(true);
    try {
      const res = await authFetch(`/api/child-brands/${brand.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        onUpdated(await res.json());
      }
    } catch (e) {
      console.error('Failed to update status', e);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${brand.name}"? This cannot be undone.`)) return;
    try {
      const res = await authFetch(`/api/child-brands/${brand.id}`, { method: 'DELETE' });
      if (res.ok) onDeleted();
    } catch (e) {
      console.error('Failed to delete', e);
    }
  };

  const score = compliance?.overall_score ?? brand.compliance_score ?? null;
  const customPrimary = brand.custom_colors?.primary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 max-w-[1200px] mx-auto"
    >
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-apple hover:bg-apple-gray dark:hover:bg-sf-bg-elevatedDark text-sf-text-secondaryLight dark:text-sf-text-secondaryDark"
          >
            <ArrowLeft size={18} />
          </button>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${customPrimary ?? (isDaughter ? '#B8734A' : '#2563EB')}20` }}
          >
            {isDaughter ? (
              <Building2 size={20} style={{ color: customPrimary ?? '#B8734A' }} />
            ) : (
              <Package size={20} style={{ color: customPrimary ?? '#2563EB' }} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{brand.name}</h1>
              <Badge variant={isDaughter ? 'warning' : 'default'}>
                {isDaughter ? 'Daughter Company' : 'Child Product'}
              </Badge>
            </div>
            <p className="text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
              {brand.tagline || 'No tagline defined'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onEdit}>
            <Pencil size={14} className="mr-1.5" />
            Edit
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      {/* ── Status switcher ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark uppercase tracking-wide mr-1">
          Status
        </span>
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            disabled={updatingStatus}
            onClick={() => handleStatusChange(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all capitalize disabled:opacity-50 ${
              brand.status === s
                ? 'bg-apple-blue text-white border-apple-blue'
                : 'bg-card border-border text-foreground hover:border-apple-blue/50'
            }`}
          >
            {s.toLowerCase()}
          </button>
        ))}
        {updatingStatus && <Loader2 size={14} className="animate-spin text-sf-text-secondaryLight" />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left column: Identity ─────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Identity */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-apple-blue" />
                <span className="font-semibold text-sm">Identity</span>
              </div>
              <span className="text-[11px] text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                Defined by the {isDaughter ? 'company' : 'child'}
              </span>
            </CardHeader>
            <CardContent className="space-y-5">
              {IDENTITY_FIELDS.map((field) => {
                const value = brand[field.key] as string | null;
                return (
                  <div key={field.key as string}>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mb-1">
                      {field.label}
                    </h4>
                    {value ? (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{value}</p>
                    ) : (
                      <p className="text-sm italic text-sf-text-secondaryLight/60 dark:text-sf-text-secondaryDark/60">
                        {field.description}
                      </p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Voice & Messaging */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-violet-500" />
                <span className="font-semibold text-sm">Voice &amp; Messaging</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mb-1">
                  Voice
                </h4>
                {brand.voice ? (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{brand.voice}</p>
                ) : (
                  <p className="text-sm italic text-sf-text-secondaryLight/60 dark:text-sf-text-secondaryDark/60">
                    The child may introduce its own personality, compatible with the parent philosophy.
                  </p>
                )}
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mb-1.5">
                  Vocabulary
                </h4>
                {brand.vocabulary.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {brand.vocabulary.map((term) => (
                      <span
                        key={term}
                        className="px-2.5 py-1 rounded-full text-xs bg-apple-blue/10 text-apple-blue border border-apple-blue/20"
                      >
                        {term}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm italic text-sf-text-secondaryLight/60 dark:text-sf-text-secondaryDark/60">
                    No domain vocabulary defined.
                  </p>
                )}
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mb-1">
                  Messaging
                </h4>
                {brand.messaging ? (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{brand.messaging}</p>
                ) : (
                  <p className="text-sm italic text-sf-text-secondaryLight/60 dark:text-sf-text-secondaryDark/60">
                    Messaging should reflect the product&apos;s unique purpose.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Compliance */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-green-500" />
                <span className="font-semibold text-sm">Protected Principles</span>
              </div>
              {score !== null && (
                <Badge
                  variant={score >= 80 ? 'success' : score >= 50 ? 'warning' : 'danger'}
                >
                  {Math.round(score)}% compliant
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              {isDaughter ? (
                <div className="flex items-start gap-3 py-4">
                  <Building2 size={18} className="text-apple-orange shrink-0 mt-0.5" />
                  <p className="text-sm leading-relaxed text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                    Daughter companies are independent businesses. They do not inherit the
                    ISOCODELABS protected principles and instead define their own brand
                    constitution. Compliance scoring does not apply.
                  </p>
                </div>
              ) : loadingCompliance ? (
                <div className="flex items-center gap-2 py-6 text-sm text-sf-text-secondaryLight">
                  <Loader2 size={16} className="animate-spin" />
                  Evaluating compliance…
                </div>
              ) : compliance ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                      <CheckCircle2 size={14} />
                      {compliance.satisfied_count} satisfied
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                      <AlertCircle size={14} />
                      {compliance.needs_attention_count} need attention
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {compliance.evaluations.map((ev) => (
                      <div
                        key={ev.principle.code}
                        className={`flex items-start gap-2 p-2.5 rounded-apple border ${
                          ev.satisfied
                            ? 'border-green-500/20 bg-green-500/5'
                            : 'border-amber-500/20 bg-amber-500/5'
                        }`}
                        title={ev.reason}
                      >
                        {ev.satisfied ? (
                          <CheckCircle2 size={14} className="text-green-500 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold">{ev.principle.code}</p>
                          <p className="text-[11px] leading-snug text-sf-text-secondaryLight dark:text-sf-text-secondaryDark line-clamp-2">
                            {ev.principle.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm italic text-sf-text-secondaryLight py-4">
                  Compliance report unavailable.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right column: Inheritance / Customization / Personality ─ */}
        <div className="space-y-6">
          {/* Mandatory Inheritance */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock size={15} className="text-sf-text-secondaryLight dark:text-sf-text-secondaryDark" />
                <span className="font-semibold text-sm">Mandatory Inheritance</span>
              </div>
            </CardHeader>
            <CardContent>
              {isDaughter ? (
                <p className="text-xs leading-relaxed text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mb-3">
                  A daughter company inherits only the design language. The categories below are not
                  enforced.
                </p>
              ) : (
                <p className="text-xs leading-relaxed text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mb-3">
                  Inherited from ISOCODELABS and cannot be changed.
                </p>
              )}
              <div className="space-y-2.5">
                {MANDATORY_INHERITANCE.map((cat) => {
                  const enforced = !isDaughter || cat.key === 'design_language';
                  return (
                    <div key={cat.key} className="flex items-start gap-2">
                      {enforced ? (
                        <ShieldCheck size={14} className="text-green-500 shrink-0 mt-0.5" />
                      ) : (
                        <ShieldAlert
                          size={14}
                          className="text-sf-text-secondaryLight/50 shrink-0 mt-0.5"
                        />
                      )}
                      <div>
                        <p className="text-xs font-semibold">{cat.name}</p>
                        <p className="text-[11px] leading-snug text-sf-text-secondaryLight dark:text-sf-text-secondaryDark line-clamp-2">
                          {cat.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Brand Personality */}
          {!isDaughter && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles size={15} className="text-violet-500" />
                  <span className="font-semibold text-sm">Brand Personality</span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-[11px] text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mb-3">
                  Every child product should feel:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {BRAND_PERSONALITY_TRAITS.map((trait) => (
                    <span
                      key={trait}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20"
                    >
                      <Check size={11} />
                      {prettyTrait(trait)}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Customization */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette size={15} className="text-apple-orange" />
                <span className="font-semibold text-sm">Customization</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current custom values */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Primary Color</span>
                  {customPrimary ? (
                    <span className="flex items-center gap-1.5 text-xs font-mono">
                      <span
                        className="w-4 h-4 rounded-full border border-border"
                        style={{ backgroundColor: customPrimary }}
                      />
                      {customPrimary}
                    </span>
                  ) : (
                    <span className="text-xs italic text-sf-text-secondaryLight/60">Inherited</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Logo</span>
                  {brand.custom_logo_url ? (
                    <a
                      href={brand.custom_logo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-apple-blue hover:underline truncate max-w-[140px]"
                    >
                      {brand.custom_logo_url}
                    </a>
                  ) : (
                    <span className="text-xs italic text-sf-text-secondaryLight/60">Inherited</span>
                  )}
                </div>
              </div>
              {/* Allowed areas */}
              <div className="pt-3 border-t border-border">
                <p className="text-[11px] text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mb-2">
                  May be customized without violating the inherited philosophy:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {MAY_CUSTOMIZE_AREAS.map((area) => (
                    <span
                      key={area.key}
                      className="px-2 py-0.5 rounded-full text-[10px] bg-apple-gray dark:bg-sf-bg-elevatedDark text-sf-text-secondaryLight dark:text-sf-text-secondaryDark border border-border"
                    >
                      {area.name.replace('Product ', '')}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
