import type { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export function Button({
  className = '',
  variant = 'primary',
  size = 'md',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  const variantClasses =
    variant === 'primary'
      ? 'border border-zinc-900 bg-zinc-950 text-white shadow-2xs hover:bg-zinc-800 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white'
      : variant === 'secondary'
        ? 'border border-zinc-200 bg-zinc-100 text-zinc-900 hover:bg-zinc-200/80 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-700 dark:hover:bg-zinc-800'
        : variant === 'danger'
          ? 'border border-red-500/30 bg-red-600 text-white hover:bg-red-500 dark:border-red-500/40 dark:bg-red-600 dark:hover:bg-red-500'
          : 'border border-transparent text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-50';

  const sizeClasses =
    size === 'sm'
      ? 'min-h-8 px-3 py-1.5 text-xs'
      : size === 'lg'
        ? 'min-h-11 px-5 py-2.5 text-base'
        : 'min-h-10 px-4 py-2 text-sm';

  return (
    <button
      type={type}
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:cursor-not-allowed disabled:opacity-50 ${sizeClasses} ${variantClasses} ${className}`}
    />
  );
}
