'use client';

import * as React from 'react';
import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { twMerge } from 'tailwind-merge';
import { cva, type VariantProps } from 'class-variance-authority';

const modalStyles = cva(
  'relative transform overflow-hidden bg-white shadow-soft-xl transition-all',
  {
    variants: {
      size: {
        sm: 'max-w-md rounded-3xl',
        md: 'max-w-lg rounded-3xl',
        lg: 'max-w-2xl rounded-3xl',
        xl: 'max-w-4xl rounded-3xl',
        full: 'max-w-none w-full h-full rounded-none sm:rounded-3xl sm:max-w-6xl sm:h-auto',
      },
      centered: {
        true: 'mx-auto',
        false: '',
      },
    },
    defaultVariants: {
      size: 'md',
      centered: true,
    },
  }
);

export interface ModalProps extends VariantProps<typeof modalStyles> {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  overlayClassName?: string;
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
  footer?: React.ReactNode;
  initialFocus?: React.RefObject<HTMLElement>;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
  overlayClassName,
  closeOnOverlayClick = true,
  showCloseButton = true,
  footer,
  size,
  centered,
  initialFocus,
}: ModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog 
        as="div" 
        className="relative z-50" 
        onClose={closeOnOverlayClick ? onClose : () => {}}
        initialFocus={initialFocus}
      >
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
          <div 
            className={twMerge(
              "fixed inset-0 bg-black/25 backdrop-blur-sm",
              overlayClassName
            )} 
          />
        </Transition.Child>

        {/* Modal container */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel 
                className={twMerge(
                  modalStyles({ size, centered }),
                  className
                )}
              >
                {/* Header */}
                {(title || showCloseButton) && (
                  <div className="flex items-start justify-between p-6 pb-4">
                    <div className="flex-1">
                      {title && (
                        <Dialog.Title 
                          as="h3" 
                          className="text-xl font-semibold text-primary-900 text-left"
                        >
                          {title}
                        </Dialog.Title>
                      )}
                      {description && (
                        <Dialog.Description className="mt-2 text-sm text-primary-600 text-left">
                          {description}
                        </Dialog.Description>
                      )}
                    </div>
                    {showCloseButton && (
                      <button
                        type="button"
                        className="ml-4 rounded-2xl p-2 text-primary-400 hover:bg-primary-100 hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-accent-500 transition-colors"
                        onClick={onClose}
                        aria-label="Close modal"
                      >
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}

                {/* Content */}
                <div className={twMerge(
                  "px-6",
                  title || showCloseButton ? "pt-0" : "pt-6",
                  footer ? "pb-4" : "pb-6"
                )}>
                  {children}
                </div>

                {/* Footer */}
                {footer && (
                  <div className="border-t border-primary-200 px-6 py-4 bg-primary-50 rounded-b-3xl">
                    {footer}
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

// Convenience components
export function ModalHeader({ children }: { children: React.ReactNode }) {
  return <div className="mb-4">{children}</div>;
}

export function ModalBody({ children }: { children: React.ReactNode }) {
  return <div className="space-y-4">{children}</div>;
}

export function ModalFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-end space-x-3 pt-4">
      {children}
    </div>
  );
}

// Usage example:
/*
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Delete Item"
  description="Are you sure you want to delete this item? This action cannot be undone."
  size="md"
  footer={
    <ModalFooter>
      <Button variant="ghost" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      <Button variant="primary" onClick={handleDelete}>
        Delete
      </Button>
    </ModalFooter>
  }
>
  <ModalBody>
    <p>This will permanently remove the item from your collection.</p>
  </ModalBody>
</Modal>
*/