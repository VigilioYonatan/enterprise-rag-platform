import type { HTMLAttributes, ReactNode } from 'react';

export function Panel({
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return (
    <section
      {...props}
      className={`rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs md:p-6 dark:border-zinc-800 dark:bg-[#0a0a0a] ${className}`}
    >
      {children}
    </section>
  );
}
