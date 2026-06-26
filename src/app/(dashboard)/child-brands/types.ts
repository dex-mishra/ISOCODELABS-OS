import type { ProductHierarchyType } from '@/lib/brand/child-brand-config';

export type ChildBrandStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export interface ChildBrand {
  id: string;
  name: string;
  product_type: ProductHierarchyType;
  mission: string | null;
  vision: string | null;
  enemy: string | null;
  target_audience: string | null;
  promise: string | null;
  story: string | null;
  voice: string | null;
  vocabulary: string[];
  tagline: string | null;
  messaging: string | null;
  custom_colors: Record<string, string> | null;
  custom_logo_url: string | null;
  status: ChildBrandStatus;
  compliance_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface PrincipleEvaluation {
  principle: { id: number; code: string; description: string };
  satisfied: boolean;
  reason: string;
}

export interface ComplianceReport {
  child_brand_id: string;
  child_brand_name: string;
  product_type: string;
  overall_score: number;
  total_principles: number;
  satisfied_count: number;
  needs_attention_count: number;
  evaluations: PrincipleEvaluation[];
}
