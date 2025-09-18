import Link from 'next/link';
import type { HTMLAttributes } from 'react';

export interface NavMegaMenuItem {
  label: string;
  href: string;
  description?: string;
}

export interface NavMegaMenuSection {
  title: string;
  items: NavMegaMenuItem[];
}

interface NavMegaMenuProps extends HTMLAttributes<HTMLElement> {
  sections: NavMegaMenuSection[];
}

export function NavMegaMenu({ sections, className, ...props }: NavMegaMenuProps) {
  return (
    <nav className={className} {...props}>
      <div className="mx-auto hidden w-full max-w-6xl grid-cols-4 gap-8 rounded-3xl bg-white/90 p-6 shadow-lg backdrop-blur lg:grid">
        {sections.map((section) => (
          <div key={section.title} className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">{section.title}</p>
            <ul className="space-y-2">
              {section.items.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="group block rounded-xl p-3 transition hover:bg-amber-50">
                    <p className="text-sm font-semibold text-neutral-900 group-hover:text-amber-700">{item.label}</p>
                    {item.description ? <p className="text-xs text-neutral-600">{item.description}</p> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
