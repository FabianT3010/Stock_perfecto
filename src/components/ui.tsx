// Componentes de UI presentacionales reutilizables (sin estado).
import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes } from "react";

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

// -------------------------------------------------------------------- Shell
export function PageShell({
  title,
  subtitle,
  right,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {title}
          </h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {right}
      </header>
      {children}
    </div>
  );
}

// --------------------------------------------------------------------- Card
export function Card({
  children,
  className,
  title,
  aside,
}: {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section
      className={cx(
        "rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur",
        className,
      )}
    >
      {(title || aside) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && (
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              {title}
            </h2>
          )}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

// ------------------------------------------------------------------- Button
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success" | "accent";
  size?: "md" | "lg";
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  const variants: Record<string, string> = {
    primary:
      "bg-brand-700 text-white hover:bg-brand-600 focus-visible:outline-brand-700",
    secondary:
      "bg-slate-100 text-slate-800 hover:bg-slate-200 focus-visible:outline-slate-400",
    ghost:
      "bg-transparent text-slate-600 hover:bg-slate-100 focus-visible:outline-slate-400",
    danger:
      "bg-danger-600 text-white hover:bg-danger-500 focus-visible:outline-danger-600",
    success:
      "bg-brand-600 text-white hover:bg-brand-700 focus-visible:outline-brand-600",
    accent:
      "bg-accent-600 text-white hover:bg-accent-500 focus-visible:outline-accent-600",
  };
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        size === "lg" ? "px-6 py-3 text-base" : "px-4 py-2 text-sm",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

// -------------------------------------------------------------------- Field
export function Field({
  label,
  hint,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cx(
        "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm",
        "placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200",
        className,
      )}
      {...props}
    />
  );
}

// --------------------------------------------------------------------- Stat
export type StatTone = "neutral" | "profit" | "loss" | "warn" | "info" | "brand";

const STAT_TONES: Record<StatTone, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-900",
  profit: "border-brand-200 bg-brand-50 text-brand-800",
  loss: "border-danger-200 bg-danger-50 text-danger-700",
  warn: "border-accent-200 bg-accent-50 text-accent-700",
  info: "border-sky-200 bg-sky-50 text-sky-900",
  brand: "border-gold-200 bg-gold-50 text-gold-700",
};

export function Stat({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  tone?: StatTone;
}) {
  return (
    <div className={cx("rounded-xl border p-3", STAT_TONES[tone])}>
      <div className="text-xs font-medium uppercase tracking-wide opacity-70">
        {label}
      </div>
      <div className="tabular mt-1 text-2xl font-bold leading-none">{value}</div>
      {sub && <div className="mt-1 text-xs opacity-70">{sub}</div>}
    </div>
  );
}

// -------------------------------------------------------------------- Badge
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "open" | "closed" | "revealed" | "pending";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-slate-100 text-slate-600",
    pending: "bg-slate-100 text-slate-600",
    open: "bg-brand-100 text-brand-700",
    closed: "bg-accent-100 text-accent-700",
    revealed: "bg-gold-100 text-gold-700",
  };
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

// ------------------------------------------------------------------ feedback
export function Callout({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "warn" | "error" | "success";
}) {
  const tones: Record<string, string> = {
    info: "border-sky-200 bg-sky-50 text-sky-800",
    warn: "border-accent-200 bg-accent-50 text-accent-700",
    error: "border-danger-200 bg-danger-50 text-danger-700",
    success: "border-brand-200 bg-brand-50 text-brand-800",
  };
  return (
    <div className={cx("rounded-xl border px-4 py-3 text-sm", tones[tone])}>
      {children}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cx(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent",
        className,
      )}
      aria-hidden
    />
  );
}
