'use client';

import { SelectHTMLAttributes, useState } from 'react';

type SelectOption = {
  value: string;
  label: string;
};

type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children' | 'size'> & {
  options: SelectOption[];
  size?: 'sm' | 'md';
};

export function SelectField({ options, className, size = 'md', ...props }: SelectFieldProps) {
  const [active, setActive] = useState(false);
  const baseClass =
    size === 'sm'
      ? 'h-8 rounded-md border border-slate-300 bg-white px-2 py-1 pr-8 text-xs text-slate-800'
      : 'h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-sm text-slate-800';

  const handleFocus: NonNullable<SelectFieldProps['onFocus']> = (event) => {
    setActive(true);
    props.onFocus?.(event);
  };

  const handleBlur: NonNullable<SelectFieldProps['onBlur']> = (event) => {
    setActive(false);
    props.onBlur?.(event);
  };

  const handleMouseDown: NonNullable<SelectFieldProps['onMouseDown']> = (event) => {
    setActive(true);
    props.onMouseDown?.(event);
  };

  const handleChange: NonNullable<SelectFieldProps['onChange']> = (event) => {
    setActive(false);
    props.onChange?.(event);
  };

  const handleKeyDown: NonNullable<SelectFieldProps['onKeyDown']> = (event) => {
    if (event.key === 'Escape' || event.key === 'Enter' || event.key === 'Tab') {
      setActive(false);
    } else {
      setActive(true);
    }
    props.onKeyDown?.(event);
  };

  return (
    <div className="relative">
      <select
        {...props}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onMouseDown={handleMouseDown}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={[
          'w-full appearance-none outline-none transition',
          'focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10',
          'disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500',
          baseClass,
          className ?? '',
        ]
          .join(' ')
          .trim()}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-slate-500">
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={[
            size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4',
            'transform-gpu transition-transform duration-200 ease-out',
            active ? 'rotate-180' : 'rotate-0',
          ].join(' ')}
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.51a.75.75 0 01-1.08 0l-4.25-4.51a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </span>
    </div>
  );
}
