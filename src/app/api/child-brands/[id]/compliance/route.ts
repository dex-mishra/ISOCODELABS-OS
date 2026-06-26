import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { PROTECTED_PRINCIPLES, ProtectedPrinciple } from '@/lib/brand/child-brand-config';

export const dynamic = 'force-dynamic';

interface PrincipleEvaluation {
  principle: ProtectedPrinciple;
  satisfied: boolean;
  reason: string;
}

interface ComplianceReport {
  child_brand_id: string;
  child_brand_name: string;
  product_type: string;
  overall_score: number;
  total_principles: number;
  satisfied_count: number;
  needs_attention_count: number;
  evaluations: PrincipleEvaluation[];
}

/**
 * Evaluates a child brand against the 20 protected principles.
 * This is a heuristic evaluation based on available data fields.
 */
function evaluateCompliance(childBrand: {
  name: string;
  product_type: string;
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
  custom_colors: unknown;
  custom_logo_url: string | null;
}): PrincipleEvaluation[] {
  const evaluations: PrincipleEvaluation[] = [];

  for (const principle of PROTECTED_PRINCIPLES) {
    let satisfied = false;
    let reason = '';

    switch (principle.code) {
      case 'PP-001':
        // Respect users - satisfied if mission/promise focuses on users
        satisfied = !!(childBrand.mission || childBrand.promise);
        reason = satisfied
          ? 'Mission or promise is defined, indicating user focus.'
          : 'No mission or promise defined to demonstrate user respect.';
        break;

      case 'PP-002':
        // Experience before features - satisfied if vision exists (implies experience focus)
        satisfied = !!childBrand.vision;
        reason = satisfied
          ? 'Vision is defined, suggesting experience-first thinking.'
          : 'No vision defined to demonstrate experience priority.';
        break;

      case 'PP-003':
        // Craftsmanship is mandatory - always assumed true for child products
        satisfied = childBrand.product_type === 'CHILD_PRODUCT';
        reason = satisfied
          ? 'As a child product, craftsmanship inheritance is assumed.'
          : 'Daughter companies define their own quality standards.';
        break;

      case 'PP-004':
        // Engineering excellence visible through UX
        satisfied = childBrand.product_type === 'CHILD_PRODUCT';
        reason = satisfied
          ? 'Child product inherits engineering philosophy.'
          : 'Daughter companies define their own engineering standards.';
        break;

      case 'PP-005':
        // Quality over speed
        satisfied = childBrand.product_type === 'CHILD_PRODUCT';
        reason = satisfied
          ? 'Child product inherits quality-first approach.'
          : 'Daughter companies set their own quality/speed balance.';
        break;

      case 'PP-006':
        // Question mediocrity - satisfied if enemy is defined
        satisfied = !!childBrand.enemy;
        reason = satisfied
          ? `Product enemy defined: identifies mediocrity to eliminate.`
          : 'No product enemy defined to demonstrate mediocrity questioning.';
        break;

      case 'PP-007':
        // Clarity over hype - satisfied if voice is defined
        satisfied = !!childBrand.voice;
        reason = satisfied
          ? 'Voice is defined, enabling clear communication.'
          : 'No voice defined to ensure clarity over hype.';
        break;

      case 'PP-008':
        // Evidence over claims
        satisfied = childBrand.product_type === 'CHILD_PRODUCT';
        reason = satisfied
          ? 'Child product inherits evidence-based communication.'
          : 'Daughter companies define their own communication approach.';
        break;

      case 'PP-009':
        // Long-term trust over short-term growth
        satisfied = !!(childBrand.story || childBrand.promise);
        reason = satisfied
          ? 'Story or promise suggests long-term relationship thinking.'
          : 'No story or promise to demonstrate trust-building focus.';
        break;

      case 'PP-010':
        // People before systems
        satisfied = !!childBrand.target_audience;
        reason = satisfied
          ? 'Target audience is defined, showing people-first thinking.'
          : 'No target audience defined to demonstrate people-first approach.';
        break;

      case 'PP-011':
        // Design language inherits from design.md
        satisfied = childBrand.product_type === 'CHILD_PRODUCT' || !!childBrand.custom_colors;
        reason = satisfied
          ? 'Design language inheritance acknowledged (child product or custom colors defined within brand system).'
          : 'No evidence of design language inheritance.';
        break;

      case 'PP-012':
        // Communication inherits from brand.md
        satisfied = childBrand.product_type === 'CHILD_PRODUCT';
        reason = satisfied
          ? 'Child product inherits communication philosophy from brand.md.'
          : 'Daughter companies create their own communication.';
        break;

      case 'PP-013':
        // Never manipulate users - assumed true unless evidence otherwise
        satisfied = true;
        reason = 'No evidence of user manipulation patterns.';
        break;

      case 'PP-014':
        // Never waste users time - assumed true unless evidence otherwise
        satisfied = true;
        reason = 'No evidence of time-wasting patterns.';
        break;

      case 'PP-015':
        // Never ship substandard work
        satisfied = childBrand.product_type === 'CHILD_PRODUCT';
        reason = satisfied
          ? 'Child product inherits parent quality standards.'
          : 'Daughter companies define their own shipping standards.';
        break;

      case 'PP-016':
        // Intentional craftsmanship in interactions
        satisfied = !!(childBrand.voice && childBrand.mission);
        reason = satisfied
          ? 'Voice and mission defined, enabling intentional interaction design.'
          : 'Voice or mission missing; intentional craftsmanship harder to verify.';
        break;

      case 'PP-017':
        // Age gracefully, no trend optimization - checked via product type
        satisfied = childBrand.product_type === 'CHILD_PRODUCT';
        reason = satisfied
          ? 'Child product inherits timeless design philosophy.'
          : 'Daughter companies choose their own longevity approach.';
        break;

      case 'PP-018':
        // Innovation improves experience, not novelty
        satisfied = !!childBrand.vision;
        reason = satisfied
          ? 'Vision defined, suggesting purpose-driven innovation.'
          : 'No vision to anchor innovation to experience improvement.';
        break;

      case 'PP-019':
        // Strengthen ISOCODELABS reputation
        satisfied = childBrand.product_type === 'CHILD_PRODUCT' && !!childBrand.name;
        reason = satisfied
          ? 'Named child product contributes to parent brand reputation.'
          : 'Daughter companies build their own reputation independently.';
        break;

      case 'PP-020':
        // Pass parent decision framework
        satisfied = childBrand.product_type === 'CHILD_PRODUCT';
        reason = satisfied
          ? 'Child product subject to parent decision framework.'
          : 'Daughter companies use their own decision framework.';
        break;

      default:
        satisfied = false;
        reason = 'Unknown principle.';
    }

    evaluations.push({ principle, satisfied, reason });
  }

  return evaluations;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const childBrand = await prisma.childBrand.findUnique({
      where: { id: params.id },
    });

    if (!childBrand) {
      return NextResponse.json({ error: 'Child brand not found.' }, { status: 404 });
    }

    const evaluations = evaluateCompliance(childBrand);
    const satisfiedCount = evaluations.filter((e) => e.satisfied).length;
    const overallScore = (satisfiedCount / PROTECTED_PRINCIPLES.length) * 100;

    // Update the compliance score on the child brand record
    await prisma.childBrand.update({
      where: { id: params.id },
      data: { compliance_score: overallScore },
    });

    const report: ComplianceReport = {
      child_brand_id: childBrand.id,
      child_brand_name: childBrand.name,
      product_type: childBrand.product_type,
      overall_score: overallScore,
      total_principles: PROTECTED_PRINCIPLES.length,
      satisfied_count: satisfiedCount,
      needs_attention_count: PROTECTED_PRINCIPLES.length - satisfiedCount,
      evaluations,
    };

    return NextResponse.json(report);
  } catch (error) {
    console.error('GET child-brand compliance error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
