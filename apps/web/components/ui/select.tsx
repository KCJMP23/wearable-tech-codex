import React from 'react';

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

export const Select = ({ children }: SelectProps) => {
  return <div className="relative">{children}</div>;
};

export const SelectTrigger = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  return (
    <button className={`flex h-10 items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ${className}`}>
      {children}
    </button>
  );
};

export const SelectValue = ({ placeholder }: { placeholder?: string }) => {
  return <span>{placeholder}</span>;
};

export const SelectContent = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg">
      {children}
    </div>
  );
};

export const SelectItem = ({ value, children }: { value: string; children: React.ReactNode }) => {
  return (
    <div className="relative cursor-default select-none py-2 px-3 hover:bg-gray-100" data-value={value}>
      {children}
    </div>
  );
};