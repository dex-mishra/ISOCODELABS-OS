/**
 * ISOCODELABS Child Brand Configuration
 *
 * This file codifies the child-brand.md specification as structured TypeScript data.
 * It defines the inheritance framework, protected principles, and customization boundaries
 * for child products and daughter companies.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProtectedPrinciple {
  id: number;
  code: string;
  description: string;
}

export interface InheritanceCategory {
  key: string;
  name: string;
  description: string;
}

export interface MayDefineArea {
  key: string;
  name: string;
  description: string;
}

export interface MayCustomizeArea {
  key: string;
  name: string;
}

export type ProductHierarchyType = 'CHILD_PRODUCT' | 'DAUGHTER_COMPANY';

export type BrandPersonalityTrait =
  | 'thoughtful'
  | 'calm'
  | 'engineered'
  | 'refined'
  | 'timeless'
  | 'quietly_confident';

export interface AIBehaviorStep {
  step: number;
  title: string;
  description: string;
  actions: string[];
}

// ─── Protected Principles (PP-001 to PP-020) ─────────────────────────────────

export const PROTECTED_PRINCIPLES: readonly ProtectedPrinciple[] = [
  {
    id: 1,
    code: 'PP-001',
    description: 'Respect users before optimizing business metrics.',
  },
  {
    id: 2,
    code: 'PP-002',
    description: 'Experience comes before feature quantity.',
  },
  {
    id: 3,
    code: 'PP-003',
    description: 'Craftsmanship is mandatory.',
  },
  {
    id: 4,
    code: 'PP-004',
    description: 'Engineering excellence should become visible through the user experience.',
  },
  {
    id: 5,
    code: 'PP-005',
    description: 'Quality is preferred over speed whenever reasonable.',
  },
  {
    id: 6,
    code: 'PP-006',
    description: 'Question accepted mediocrity.',
  },
  {
    id: 7,
    code: 'PP-007',
    description: 'Communicate through clarity, not marketing hype.',
  },
  {
    id: 8,
    code: 'PP-008',
    description: 'Evidence is stronger than claims.',
  },
  {
    id: 9,
    code: 'PP-009',
    description: 'Long-term trust outweighs short-term growth.',
  },
  {
    id: 10,
    code: 'PP-010',
    description: 'People always come before systems.',
  },
  {
    id: 11,
    code: 'PP-011',
    description: 'The design language shall inherit from design.md.',
  },
  {
    id: 12,
    code: 'PP-012',
    description: 'The communication philosophy shall inherit from brand.md.',
  },
  {
    id: 13,
    code: 'PP-013',
    description: 'Never intentionally manipulate users.',
  },
  {
    id: 14,
    code: 'PP-014',
    description: 'Never intentionally waste users\' time.',
  },
  {
    id: 15,
    code: 'PP-015',
    description: 'Never knowingly ship work that fails the parent company\'s standards.',
  },
  {
    id: 16,
    code: 'PP-016',
    description: 'Every interaction should communicate intentional craftsmanship.',
  },
  {
    id: 17,
    code: 'PP-017',
    description: 'Products should age gracefully. Do not optimize for trends.',
  },
  {
    id: 18,
    code: 'PP-018',
    description: 'Innovation should improve the experience, not simply create novelty.',
  },
  {
    id: 19,
    code: 'PP-019',
    description: 'Every child product should strengthen the reputation of ISOCODELABS.',
  },
  {
    id: 20,
    code: 'PP-020',
    description: 'Every major decision should pass the parent company\'s decision framework before implementation.',
  },
] as const;

// ─── Mandatory Inheritance Categories ─────────────────────────────────────────

export const MANDATORY_INHERITANCE: readonly InheritanceCategory[] = [
  {
    key: 'purpose',
    name: 'Purpose',
    description:
      'The child product exists to make software worthy of the people who spend their lives using it. Its specific problem domain may differ. Its respect for users may not.',
  },
  {
    key: 'experience_philosophy',
    name: 'Experience Philosophy',
    description:
      'Experience comes before features. Understanding comes before functionality. Craftsmanship comes before decoration. Every interaction should communicate care.',
  },
  {
    key: 'design_language',
    name: 'Design Language',
    description:
      'Every child product shall inherit the complete ISOCODELABS design.md. Layouts, motion, typography, storytelling, spacing, materials, and interaction philosophy should remain consistent with the parent design language.',
  },
  {
    key: 'communication',
    name: 'Communication Philosophy',
    description:
      'The child communicates with calm confidence, evidence, clarity, thoughtful reasoning, and respect. It avoids hype, manipulation, unnecessary jargon, exaggerated claims, and corporate language.',
  },
  {
    key: 'engineering',
    name: 'Engineering Philosophy',
    description:
      'Engineering quality should become visible through the experience. Users should feel engineering excellence long before they read about it.',
  },
  {
    key: 'product_philosophy',
    name: 'Product Philosophy',
    description:
      'The child believes software is an experience, users deserve exceptional craftsmanship, simplicity requires engineering, and quality compounds over time.',
  },
  {
    key: 'customer_philosophy',
    name: 'Customer Philosophy',
    description:
      'Customers are partners, not transactions. The child should educate before persuading, guide before complying, and recommend what genuinely creates the best long-term outcome.',
  },
  {
    key: 'brand_personality',
    name: 'Brand Personality',
    description:
      'Every child product should feel thoughtful, calm, engineered, refined, timeless, and quietly confident. Not loud. Not trendy. Not attention-seeking.',
  },
] as const;

// ─── May Define Areas ─────────────────────────────────────────────────────────

export const MAY_DEFINE_AREAS: readonly MayDefineArea[] = [
  {
    key: 'mission',
    name: 'Product Mission',
    description: 'Why does this product exist?',
  },
  {
    key: 'vision',
    name: 'Product Vision',
    description: 'If this product succeeds completely, what changes?',
  },
  {
    key: 'enemy',
    name: 'Product Enemy',
    description: 'What specific form of mediocrity is this product eliminating?',
  },
  {
    key: 'audience',
    name: 'Product Audience',
    description: 'Who is this product built for? Who is it intentionally not built for?',
  },
  {
    key: 'promise',
    name: 'Product Promise',
    description: 'What single promise should every user remember?',
  },
  {
    key: 'story',
    name: 'Product Story',
    description: 'Why was this product created?',
  },
  {
    key: 'voice',
    name: 'Product Voice',
    description:
      'The child may introduce its own personality, provided it remains compatible with the parent philosophy.',
  },
  {
    key: 'vocabulary',
    name: 'Product Vocabulary',
    description: 'Every child should develop language specific to its domain.',
  },
  {
    key: 'tagline',
    name: 'Product Tagline',
    description: 'Every child defines its own tagline.',
  },
  {
    key: 'messaging',
    name: 'Product Messaging',
    description:
      'Landing pages, marketing, documentation, onboarding, and support should reflect the product\'s unique purpose rather than repeating the parent company\'s messaging.',
  },
] as const;

// ─── May Customize Areas ──────────────────────────────────────────────────────

export const MAY_CUSTOMIZE_AREAS: readonly MayCustomizeArea[] = [
  { key: 'logo', name: 'Product Logo' },
  { key: 'name', name: 'Product Name' },
  { key: 'colors', name: 'Product Colors' },
  { key: 'illustrations', name: 'Product Illustrations' },
  { key: 'iconography', name: 'Product Iconography' },
  { key: 'onboarding', name: 'Product Onboarding' },
  { key: 'demonstrations', name: 'Product Demonstrations' },
  { key: 'documentation', name: 'Product Documentation' },
  { key: 'examples', name: 'Product Examples' },
  { key: 'storytelling', name: 'Product Storytelling' },
  { key: 'marketing_strategy', name: 'Product Marketing Strategy' },
] as const;

// ─── Product Hierarchy Types ──────────────────────────────────────────────────

export const PRODUCT_HIERARCHY_TYPES: readonly ProductHierarchyType[] = [
  'CHILD_PRODUCT',
  'DAUGHTER_COMPANY',
] as const;

// ─── Brand Personality Traits ─────────────────────────────────────────────────

export const BRAND_PERSONALITY_TRAITS: readonly BrandPersonalityTrait[] = [
  'thoughtful',
  'calm',
  'engineered',
  'refined',
  'timeless',
  'quietly_confident',
] as const;

// ─── AI Behavior Steps ────────────────────────────────────────────────────────

export const AI_BEHAVIOR_STEPS: readonly AIBehaviorStep[] = [
  {
    step: 1,
    title: 'Read Foundation Documents',
    description:
      'Read design.md, brand.md, and child-brand.md before generating any branding, website, copy, or product strategy.',
    actions: [
      'Read design.md',
      'Read brand.md',
      'Read child-brand.md',
    ],
  },
  {
    step: 2,
    title: 'Determine Unique Identity',
    description:
      'Define the product\'s unique identity without redefining inherited philosophy.',
    actions: [
      'Define mission',
      'Define audience',
      'Define enemy',
      'Define promise',
      'Define positioning',
      'Define vocabulary',
      'Define success definition',
    ],
  },
  {
    step: 3,
    title: 'Generate Only Missing Identity',
    description:
      'Generate only the missing identity. Avoid recreating values already inherited from ISOCODELABS.',
    actions: [
      'Identify what is already inherited',
      'Generate only net-new identity elements',
    ],
  },
  {
    step: 4,
    title: 'Review Proposed Identity',
    description:
      'Ask: "Would this still feel like an ISOCODELABS product if the logo disappeared?" If no, the product has drifted too far from the parent brand.',
    actions: [
      'Evaluate brand alignment',
      'Check for excessive drift',
      'Adjust if necessary',
    ],
  },
  {
    step: 5,
    title: 'Confirm Meaningful Differentiation',
    description:
      'Products should feel like members of the same family, not identical twins. Recognition should come from shared thinking, not repeated visuals.',
    actions: [
      'Verify unique value proposition',
      'Ensure distinct product personality',
      'Confirm family resemblance through philosophy, not visuals',
    ],
  },
] as const;
