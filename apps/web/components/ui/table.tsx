import React from 'react';

export const Table = ({ children }: { children: React.ReactNode }) => (
  <div className="relative w-full overflow-auto">
    <table className="w-full caption-bottom text-sm">{children}</table>
  </div>
);

export const TableHeader = ({ children }: { children: React.ReactNode }) => (
  <thead className="[&_tr]:border-b">{children}</thead>
);

export const TableBody = ({ children }: { children: React.ReactNode }) => (
  <tbody className="[&_tr:last-child]:border-0">{children}</tbody>
);

export const TableRow = ({ children }: { children: React.ReactNode }) => (
  <tr className="border-b transition-colors hover:bg-gray-50/50">{children}</tr>
);

export const TableHead = ({ children }: { children: React.ReactNode }) => (
  <th className="h-12 px-4 text-left align-middle font-medium text-gray-500">
    {children}
  </th>
);

export const TableCell = ({ children, colSpan, className = '' }: { children: React.ReactNode; colSpan?: number; className?: string }) => (
  <td className={`p-4 align-middle ${className}`} colSpan={colSpan}>
    {children}
  </td>
);