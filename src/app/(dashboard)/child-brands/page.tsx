'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  Plus,
  Building2,
  Package,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  PRODUCT_HIERARCHY_TYPES,
  type ProductHierarchyType,
} from '@/lib/brand/child-brand-config';
import { ChildBrandEditor } from './components/ChildBrandEditor';
import { ChildBrandModal } from './components/ChildBrandModal';
import type { ChildBrand } from './types';

type FilterTab = 'ALL' | ProductHierarchyType;

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'CHILD_PRODUCT', label: 'Child Products' },
  { key: 'DAUGHTER_COMPANY', label: 'Daughter Companies' },
];

function statusVariant(status: ChildBrand['status']): 'success' | 'warning' | 'secondary' {
  switch (status) {
    case 'ACTIVE':
      return 'success';
    case 'DRAFT':
      return 'warning';
    default:
      return 'secondary';
  }
}

function complianceColor(score: number | null): string {
  if (score === null) return '#9CA3A8';
  if (score >= 80) return '#16A34A';
  if (score >= 50) return '#D97706';
  return '#DC2626';
}

export default function ChildBrandsPage() {
  const { authFetch } = useAuth();

  const [brands, setBrands] = useState<ChildBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('ALL');
  const [selected, setSelected] = useState<ChildBrand | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<ChildBrand | null>(null);

  const fetchBrands = useCallback(async () => {
    try {
      const res = await authFetch('/api/child-brands');
      if (res.ok) {
        setBrands(await res.json());
      }
    } catch (e) {
      console.error('Failed to fetch child brands', e);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  const handleSaved = async (saved: ChildBrand) => {
    setShowModal(false);
    setEditingBrand(null);
    await fetchBrands();
    setSelected(saved);
  };

  const handleDeleted = async () => {
    setSelected(null);
    await fetchBrands();
  };

  const filtered = brands.filter((b) =>
    filter === 'ALL' ? true : b.product_type === filter
  );

  /* ── Detail / Editor view ─────────────────────────────────────────── */
  if (selected) {
    return (
      <ChildBrandEditor
        brand={selected}
        onBack={() => setSelected(null)}
        onEdit={() => {
          setEditingBrand(selected);
          setShowModal(true);
        }}
        onUpdated={(updated) => setSelected(updated)}
        onDeleted={handleDeleted}
      />
    );
  }

  /* ── Loading ──────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-apple-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6 max-w-[1400px] mx-auto"
    >
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow-lg">
            <Layers className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Child Brands</h1>
            <p className="text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark max-w-xl">
              Manage child products and daughter companies under the ISOCODELABS identity.
            </p>
          </div>
        </div>
        <Button variant="primary" onClick={() => { setEditingBrand(null); setShowModal(true); }}>
          <Plus size={15} className="mr-1.5" />
          Create Child Brand
        </Button>
      </div>

      {/* ── Inheritance note ────────────────────────────────────────── */}
      <Card className="border-dashed">
        <CardContent className="py-4 flex items-start gap-3">
          <ShieldCheck size={18} className="text-apple-blue shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
            Every <span className="font-semibold text-foreground">child product</span> inherits the
            ISOCODELABS design language, communication philosophy, and 20 protected principles. A{' '}
            <span className="font-semibold text-foreground">daughter company</span> inherits only the
            design language and defines its own brand constitution. Identity, voice, and customization
            are defined per brand; protected principles are never overridden.
          </p>
        </CardContent>
      </Card>

      {/* ── Filter Tabs ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTER_TABS.map((tab) => {
          const count =
            tab.key === 'ALL'
              ? brands.length
              : brands.filter((b) => b.product_type === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border ${
                filter === tab.key
                  ? 'bg-apple-blue text-white border-apple-blue shadow-apple-sm'
                  : 'bg-card border-border text-foreground hover:border-apple-blue/50 hover:shadow-sm'
              }`}
            >
              {tab.label}
              <span className={`ml-2 text-[11px] ${filter === tab.key ? 'text-white/80' : 'text-sf-text-secondaryLight dark:text-sf-text-secondaryDark'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Empty State ─────────────────────────────────────────────── */}
      {filtered.length === 0 && (
        <Card>
          <CardContent className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-500/20 to-slate-700/20 flex items-center justify-center mx-auto mb-4">
              <Layers className="text-slate-500" size={28} />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {brands.length === 0 ? 'No Child Brands Yet' : 'Nothing in this category'}
            </h3>
            <p className="text-sm text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mb-6 max-w-md mx-auto">
              {brands.length === 0
                ? 'Define a new product or company that inherits the ISOCODELABS identity. The child inherits a philosophy, not a template.'
                : 'No brands match the selected filter. Try another category or create a new brand.'}
            </p>
            <Button variant="primary" onClick={() => { setEditingBrand(null); setShowModal(true); }}>
              <Plus size={15} className="mr-1.5" />
              Create Child Brand
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Grid ────────────────────────────────────────────────────── */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((brand) => {
            const isDaughter = brand.product_type === 'DAUGHTER_COMPANY';
            const score = brand.compliance_score ?? null;
            return (
              <motion.div
                key={brand.id}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <Card hoverEffect className="cursor-pointer h-full" onClick={() => setSelected(brand)}>
                  <CardContent className="space-y-4">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: isDaughter ? '#B8734A20' : '#2563EB20' }}
                        >
                          {isDaughter ? (
                            <Building2 size={16} style={{ color: '#B8734A' }} />
                          ) : (
                            <Package size={16} style={{ color: '#2563EB' }} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm truncate">{brand.name}</h3>
                          <p className="text-[11px] text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                            {isDaughter ? 'Daughter Company' : 'Child Product'}
                          </p>
                        </div>
                      </div>
                      <Badge variant={statusVariant(brand.status)} className="shrink-0 capitalize">
                        {brand.status.toLowerCase()}
                      </Badge>
                    </div>

                    {/* Tagline */}
                    <p className="text-xs leading-relaxed text-sf-text-secondaryLight dark:text-sf-text-secondaryDark min-h-[2rem] line-clamp-2">
                      {brand.tagline || brand.mission || (
                        <span className="italic opacity-60">No tagline defined yet.</span>
                      )}
                    </p>

                    {/* Compliance bar (child products only) */}
                    {!isDaughter ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-sf-text-secondaryLight dark:text-sf-text-secondaryDark flex items-center gap-1">
                            <ShieldCheck size={12} />
                            Principle compliance
                          </span>
                          <span className="font-semibold" style={{ color: complianceColor(score) }}>
                            {score === null ? '—' : `${Math.round(score)}%`}
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-apple-gray dark:bg-sf-bg-elevatedDark overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${score ?? 0}%`,
                              backgroundColor: complianceColor(score),
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[11px] text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                        <Sparkles size={12} />
                        Independent brand constitution
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Create / Edit Modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <ChildBrandModal
            brand={editingBrand}
            productTypes={PRODUCT_HIERARCHY_TYPES}
            onClose={() => { setShowModal(false); setEditingBrand(null); }}
            onSaved={handleSaved}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
