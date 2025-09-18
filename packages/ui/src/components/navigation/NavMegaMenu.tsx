'use client';
import * as React from 'react';
import { Fragment, useState } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { twMerge } from 'tailwind-merge';
import { ChevronDownIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

export interface NavItem {
  label: string;
  href?: string;
  onClick?: () => void;
  description?: string;
  icon?: React.ReactNode;
  badge?: string;
  featured?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
  featured?: NavItem[];
  callToAction?: NavItem;
}

export interface NavMegaMenuProps {
  sections: NavSection[];
  className?: string;
  containerClassName?: string;
  trigger?: React.ReactNode;
  position?: 'left' | 'center' | 'right';
}

export function NavMegaMenu({
  sections,
  className,
  containerClassName,
  trigger,
  position = 'left',
}: NavMegaMenuProps) {
  const positionClasses = {
    left: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    right: 'right-0',
  };

  return (
    <Popover className="relative">
      {({ open }) => (
        <>
          <Popover.Button
            className={twMerge(
              'group inline-flex items-center gap-1 rounded-2xl px-4 py-2 text-sm font-medium text-primary-700 hover:bg-primary-100 hover:text-primary-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 transition-all',
              open && 'bg-primary-100 text-primary-900',
              className
            )}
          >
            {trigger || (
              <>
                <span>Categories</span>
                <ChevronDownIcon
                  className={twMerge(
                    'ml-1 h-4 w-4 transition-transform duration-200',
                    open && 'rotate-180'
                  )}
                />
              </>
            )}
          </Popover.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Popover.Panel
              className={twMerge(
                'absolute z-50 mt-3 w-screen max-w-6xl transform',
                positionClasses[position],
                containerClassName
              )}
            >
              <div className="overflow-hidden rounded-3xl bg-white shadow-soft-xl ring-1 ring-black ring-opacity-5">
                <div className="grid gap-8 p-8 lg:grid-cols-4">
                  {sections.map((section, sectionIdx) => (
                    <div key={sectionIdx} className="space-y-6">
                      {/* Section Title */}
                      <h3 className="text-sm font-semibold text-primary-900 uppercase tracking-wide">
                        {section.title}
                      </h3>

                      {/* Featured Items */}
                      {section.featured && (
                        <div className="space-y-4">
                          {section.featured.map((item, itemIdx) => (
                            <NavMegaItem
                              key={itemIdx}
                              item={item}
                              featured
                            />
                          ))}
                        </div>
                      )}

                      {/* Regular Items */}
                      <div className="space-y-3">
                        {section.items.map((item, itemIdx) => (
                          <NavMegaItem
                            key={itemIdx}
                            item={item}
                          />
                        ))}
                      </div>

                      {/* Call to Action */}
                      {section.callToAction && (
                        <div className="mt-6 pt-6 border-t border-primary-200">
                          <NavMegaItem
                            item={section.callToAction}
                            callToAction
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
}

interface NavMegaItemProps {
  item: NavItem;
  featured?: boolean;
  callToAction?: boolean;
}

function NavMegaItem({ item, featured = false, callToAction = false }: NavMegaItemProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (item.onClick) {
      e.preventDefault();
      item.onClick();
    }
  };

  const itemContent = (
    <>
      <div className="flex items-center gap-3">
        {item.icon && (
          <div className={twMerge(
            'flex-shrink-0',
            featured ? 'h-8 w-8 text-accent-600' : 'h-5 w-5 text-primary-400'
          )}>
            {item.icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={twMerge(
              'font-medium truncate',
              featured ? 'text-base text-primary-900' : 'text-sm text-primary-700',
              callToAction && 'text-accent-600'
            )}>
              {item.label}
            </p>
            {item.badge && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium bg-accent-100 text-accent-800">
                {item.badge}
              </span>
            )}
          </div>
          {item.description && (
            <p className="mt-1 text-sm text-primary-500 truncate">
              {item.description}
            </p>
          )}
        </div>
      </div>
    </>
  );

  const commonClasses = twMerge(
    'block rounded-2xl p-3 transition-all duration-200',
    featured 
      ? 'hover:bg-accent-50 focus:bg-accent-50' 
      : 'hover:bg-primary-50 focus:bg-primary-50',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-1'
  );

  if (item.href) {
    return (
      <a
        href={item.href}
        className={commonClasses}
        onClick={handleClick}
      >
        {itemContent}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={twMerge(commonClasses, 'w-full text-left')}
      onClick={handleClick}
    >
      {itemContent}
    </button>
  );
}

// Mobile navigation component
export interface MobileNavProps {
  sections: NavSection[];
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export function MobileNav({ sections, isOpen, onClose, className }: MobileNavProps) {
  return (
    <Transition show={isOpen} as={Fragment}>
      <div className="relative z-50 lg:hidden">
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm" />
        </Transition.Child>

        {/* Panel */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="-translate-x-full"
          enterTo="translate-x-0"
          leave="ease-in duration-200"
          leaveFrom="translate-x-0"
          leaveTo="-translate-x-full"
        >
          <div className={twMerge(
            'fixed inset-y-0 left-0 w-full max-w-sm bg-white shadow-soft-xl',
            className
          )}>
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-primary-200">
                <h2 className="text-lg font-semibold text-primary-900">Menu</h2>
                <button
                  type="button"
                  className="rounded-2xl p-2 text-primary-400 hover:bg-primary-100 hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-accent-500"
                  onClick={onClose}
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-8">
                  {sections.map((section, sectionIdx) => (
                    <div key={sectionIdx} className="space-y-4">
                      <h3 className="text-sm font-semibold text-primary-900 uppercase tracking-wide">
                        {section.title}
                      </h3>
                      
                      {section.featured && (
                        <div className="space-y-2">
                          {section.featured.map((item, itemIdx) => (
                            <MobileNavItem
                              key={itemIdx}
                              item={item}
                              onClose={onClose}
                              featured
                            />
                          ))}
                        </div>
                      )}
                      
                      <div className="space-y-1">
                        {section.items.map((item, itemIdx) => (
                          <MobileNavItem
                            key={itemIdx}
                            item={item}
                            onClose={onClose}
                          />
                        ))}
                      </div>
                      
                      {section.callToAction && (
                        <div className="pt-4 border-t border-primary-200">
                          <MobileNavItem
                            item={section.callToAction}
                            onClose={onClose}
                            callToAction
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Transition.Child>
      </div>
    </Transition>
  );
}

interface MobileNavItemProps {
  item: NavItem;
  onClose: () => void;
  featured?: boolean;
  callToAction?: boolean;
}

function MobileNavItem({ item, onClose, featured = false, callToAction = false }: MobileNavItemProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (item.onClick) {
      e.preventDefault();
      item.onClick();
    }
    onClose();
  };

  const itemContent = (
    <div className="flex items-center gap-3">
      {item.icon && (
        <div className={twMerge(
          'flex-shrink-0',
          featured ? 'h-6 w-6 text-accent-600' : 'h-5 w-5 text-primary-400'
        )}>
          {item.icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={twMerge(
            'font-medium',
            featured ? 'text-base text-primary-900' : 'text-sm text-primary-700',
            callToAction && 'text-accent-600'
          )}>
            {item.label}
          </p>
          {item.badge && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium bg-accent-100 text-accent-800">
              {item.badge}
            </span>
          )}
        </div>
        {item.description && (
          <p className="mt-1 text-xs text-primary-500">
            {item.description}
          </p>
        )}
      </div>
    </div>
  );

  const commonClasses = 'block w-full rounded-2xl p-3 text-left transition-all duration-200 hover:bg-primary-50 focus:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500';

  if (item.href) {
    return (
      <a
        href={item.href}
        className={commonClasses}
        onClick={handleClick}
      >
        {itemContent}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={commonClasses}
      onClick={handleClick}
    >
      {itemContent}
    </button>
  );
}

// Hook for mobile navigation
export function useMobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  const openNav = () => setIsOpen(true);
  const closeNav = () => setIsOpen(false);
  const toggleNav = () => setIsOpen(prev => !prev);

  return {
    isOpen,
    openNav,
    closeNav,
    toggleNav,
  };
}

// Mobile menu button component
export interface MobileMenuButtonProps {
  onClick: () => void;
  isOpen: boolean;
  className?: string;
}

export function MobileMenuButton({ onClick, isOpen, className }: MobileMenuButtonProps) {
  return (
    <button
      type="button"
      className={twMerge(
        'inline-flex items-center justify-center rounded-2xl p-2 text-primary-400 hover:bg-primary-100 hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-accent-500 lg:hidden',
        className
      )}
      onClick={onClick}
      aria-label="Toggle menu"
    >
      {isOpen ? (
        <XMarkIcon className="h-6 w-6" />
      ) : (
        <Bars3Icon className="h-6 w-6" />
      )}
    </button>
  );
}

// Usage example:
/*
const navigationSections = [
  {
    title: 'Categories',
    featured: [
      {
        label: 'New Arrivals',
        href: '/new',
        description: 'Latest wearable tech',
        icon: <SparklesIcon />,
        badge: 'New'
      }
    ],
    items: [
      { label: 'Smartwatches', href: '/smartwatches' },
      { label: 'Fitness Trackers', href: '/fitness' },
      { label: 'Smart Glasses', href: '/glasses' },
    ],
    callToAction: {
      label: 'View All Products',
      href: '/products'
    }
  }
];

function Navigation() {
  const { isOpen, openNav, closeNav } = useMobileNav();

  return (
    <>
      <nav className="hidden lg:flex items-center space-x-4">
        <NavMegaMenu sections={navigationSections} />
      </nav>
      
      <MobileMenuButton onClick={openNav} isOpen={isOpen} />
      <MobileNav 
        sections={navigationSections}
        isOpen={isOpen}
        onClose={closeNav}
      />
    </>
  );
}
*/
