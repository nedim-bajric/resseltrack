import React from 'react';
import { motion } from 'framer-motion';
import { ChevronsUpDown } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  sortable?: boolean;
  render: (item: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
}

export function DataTable<T>({ columns, data, keyExtractor }: DataTableProps<T>) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: '#11131A', border: '1px solid #1E2130' }}
    >
      {/* Header */}
      <div
        className="flex items-center"
        style={{
          backgroundColor: '#090A10',
          height: '40px',
          borderBottom: '1px solid #1E2130',
        }}
      >
        {columns.map((col) => (
          <div
            key={col.key}
            className="flex items-center gap-1 px-4 text-xs font-medium uppercase tracking-wider"
            style={{
              width: col.width || 'auto',
              flex: col.width ? undefined : 1,
              color: '#5C6078',
            }}
          >
            {col.header}
            {col.sortable && <ChevronsUpDown size={14} className="text-[#5C6078]" />}
          </div>
        ))}
      </div>

      {/* Rows */}
      {data.map((item, index) => (
        <motion.div
          key={keyExtractor(item)}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.15,
            delay: index * 0.03,
            ease: [0.0, 0.0, 0.2, 1] as [number, number, number, number],
          }}
          className="flex items-center transition-colors duration-100 hover:bg-[#1A1D26]"
          style={{
            height: '52px',
            borderBottom: index < data.length - 1 ? '1px solid #1E2130' : undefined,
          }}
        >
          {columns.map((col) => (
            <div
              key={col.key}
              className="px-4"
              style={{
                width: col.width || 'auto',
                flex: col.width ? undefined : 1,
              }}
            >
              {col.render(item, index)}
            </div>
          ))}
        </motion.div>
      ))}

      {data.length === 0 && (
        <div
          className="flex items-center justify-center text-sm"
          style={{
            height: '120px',
            color: '#5C6078',
          }}
        >
          No data to display
        </div>
      )}
    </div>
  );
}
