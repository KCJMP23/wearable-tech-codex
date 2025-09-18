import type { PostType } from '@affiliate-factory/sdk';

export interface BlogSectionTemplate {
  heading: string;
  description: string;
  bullets?: string[];
  includeStats?: boolean;
  includeQuote?: boolean;
  recommendedImages?: number;
}

export interface BlogTemplate {
  type: PostType;
  hero: string;
  sections: BlogSectionTemplate[];
  callToAction: string;
  faqCount: number;
  requiredInternalLinks: number;
  requiredExternalLinks: number;
}

const BASE_SECTIONS: BlogSectionTemplate[] = [
  {
    heading: 'Key Takeaways',
    description: 'Summarize the most important insights readers will learn.'
  },
  {
    heading: 'Why It Matters',
    description: 'Explain the impact for the target audience with a 2024 or 2025 data point.',
    includeStats: true
  },
  {
    heading: 'Expert Insight',
    description: 'Cite one credible expert opinion to back recommendations.',
    includeQuote: true
  }
];

export const blogTemplates: Record<PostType, BlogTemplate> = {
  howto: {
    type: 'howto',
    hero: 'Step-by-step guide tailored to the audience in onboarding.',
    sections: [
      ...BASE_SECTIONS,
      {
        heading: 'Step-by-Step Instructions',
        description: 'Detail 5–7 chronological steps; pair each with gear/products when relevant.',
        recommendedImages: 3
      },
      {
        heading: 'Recommended Gear',
        description: 'Highlight 3 featured products with compatibility notes and affiliate CTAs.'
      }
    ],
    callToAction: 'Explore the recommended gear for every step — all curated for your needs.',
    faqCount: 5,
    requiredInternalLinks: 3,
    requiredExternalLinks: 2
  },
  listicle: {
    type: 'listicle',
    hero: 'Curated picks with crisp differentiators.',
    sections: [
      ...BASE_SECTIONS,
      {
        heading: 'Top Picks',
        description: 'Rank 5 products with why it matters, key spec, and best-use persona.',
        recommendedImages: 5
      },
      {
        heading: 'How to Choose',
        description: 'Give a short decision checklist anchored in quiz inputs.'
      }
    ],
    callToAction: 'Compare the full spec sheet and tap through to Amazon for hands-on reviews.',
    faqCount: 6,
    requiredInternalLinks: 4,
    requiredExternalLinks: 3
  },
  answer: {
    type: 'answer',
    hero: 'Directly address a key reader question — cite sources.',
    sections: [
      ...BASE_SECTIONS,
      {
        heading: 'The Short Answer',
        description: 'Lead with the verdict using the most recent stat available.',
        includeStats: true
      },
      {
        heading: 'How We Tested',
        description: 'Explain data sources: Reddit, reviewers, manufacturer.',
        recommendedImages: 2
      }
    ],
    callToAction: 'Need personalized picks? Take the quiz and see curated recommendations.',
    faqCount: 4,
    requiredInternalLinks: 3,
    requiredExternalLinks: 2
  },
  review: {
    type: 'review',
    hero: 'Hands-on style review with pros, cons, and alternatives.',
    sections: [
      ...BASE_SECTIONS,
      {
        heading: 'Where It Shines',
        description: 'Detail three real-world scenarios it excels in.',
        recommendedImages: 3
      },
      {
        heading: 'Where It Falls Short',
        description: 'Be candid about trade-offs; suggest alternatives for each drawback.'
      },
      {
        heading: 'Comparable Alternatives',
        description: 'List 3 alternatives with compatibility and affiliate CTAs.'
      }
    ],
    callToAction: 'Check current availability on Amazon — tag automatically applied.',
    faqCount: 5,
    requiredInternalLinks: 4,
    requiredExternalLinks: 3
  },
  roundup: {
    type: 'roundup',
    hero: 'Seasonal or persona-driven roundup anchored by data.',
    sections: [
      ...BASE_SECTIONS,
      {
        heading: 'Top Picks by Persona',
        description: 'Create sections for at least three personas from quiz segments.'
      },
      {
        heading: 'Key Specs Comparison',
        description: 'Introduce a comparison table referencing battery life, sensors, water rating.'
      }
    ],
    callToAction: 'Add picks straight to your shortlist and continue the discovery journey.',
    faqCount: 5,
    requiredInternalLinks: 5,
    requiredExternalLinks: 3
  },
  alternative: {
    type: 'alternative',
    hero: 'Offer replacements for out-of-stock or high-priced flagship products.',
    sections: [
      ...BASE_SECTIONS,
      {
        heading: 'When the Flagship Is Not Ideal',
        description: 'Explain scenarios that push readers to alternatives.',
        includeStats: true
      },
      {
        heading: 'Best Alternatives',
        description: 'Detail at least four options with standout features and compatibility notes.'
      }
    ],
    callToAction: 'Compare Amazon availability and save your top picks for later.',
    faqCount: 4,
    requiredInternalLinks: 3,
    requiredExternalLinks: 4
  },
  evergreen: {
    type: 'evergreen',
    hero: 'Long shelf-life education piece anchored in fundamentals.',
    sections: [
      ...BASE_SECTIONS,
      {
        heading: 'Foundational Concepts',
        description: 'Explain core technology — use one stat and one expert quote.'
      },
      {
        heading: 'How to Keep Learning',
        description: 'Recommend newsletter sign-ups, communities, or experiments.'
      }
    ],
    callToAction: 'Join the newsletter for the next evolution in this space and curated product drops.',
    faqCount: 6,
    requiredInternalLinks: 4,
    requiredExternalLinks: 3
  }
};

export function getTemplate(type: PostType): BlogTemplate {
  return blogTemplates[type];
}
