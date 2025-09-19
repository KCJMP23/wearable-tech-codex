'use client';

interface HolidayBannerProps {
  title: string;
  description: string;
  ctaLabel: string;
  onCtaClick: () => void;
  colorTokens: {
    background: string;
    text: string;
    accent: string;
  };
}

export function HolidayBanner({ title, description, ctaLabel, onCtaClick, colorTokens }: HolidayBannerProps) {
  return (
    <section
      className="relative overflow-hidden rounded-3xl p-6"
      style={{ background: colorTokens.background, color: colorTokens.text }}
    >
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: colorTokens.accent }}>
          Seasonal spotlight
        </p>
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="max-w-xl text-sm opacity-90">{description}</p>
        <button
          type="button"
          onClick={onCtaClick}
          className="mt-2 inline-flex items-center rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-neutral-900 shadow-sm transition hover:bg-white"
        >
          {ctaLabel}
        </button>
      </div>
      <div className="pointer-events-none absolute -right-24 top-0 h-48 w-48 rounded-full"
        style={{ background: colorTokens.accent, opacity: 0.25 }}
      />
    </section>
  );
}
