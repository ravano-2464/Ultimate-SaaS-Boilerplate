'use client';

import { InputHTMLAttributes, useState } from 'react';

type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export function PasswordField({ className, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        className={[
          'w-full rounded-md border border-slate-300 px-3 py-2 pr-10 text-sm outline-none transition focus:border-slate-900',
          className ?? '',
        ]
          .join(' ')
          .trim()}
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d="M3 3l18 18" />
            <path d="M10.6 10.6a2 2 0 102.8 2.8" />
            <path d="M9.9 4.2A10.8 10.8 0 0112 4c5.5 0 9.6 3.8 10.9 8-1 3-3.3 5.7-6.4 7.1" />
            <path d="M6.7 6.7C4.7 8 3.4 9.9 2.7 12c1.3 4.2 5.4 8 10.9 8 2.1 0 4-.5 5.7-1.4" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d="M2.7 12C4 7.8 8.1 4 13.6 4S23.2 7.8 24.5 12c-1.3 4.2-5.4 8-10.9 8S4 16.2 2.7 12z" />
            <circle cx="13.6" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
