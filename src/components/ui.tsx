// Componentes de UI presentacionales reutilizables (sin estado). Estilo sobrio,
// corporativo: superficies blancas con bordes finos, acentos de color medidos.
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
    <div className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 sm:py-9">
      <header className="mb-7 flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>
          )}
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
        "rounded-lg border border-slate-200 bg-white p-5 shadow-sm",
        className,
      )}
    >
      {(title || aside) && (
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
          {title && (
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
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
      "bg-brand-700 text-white hover:bg-brand-800 focus-visible:outline-brand-700",
    secondary:
      "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:outline-slate-400",
    ghost:
      "bg-transparent text-slate-600 hover:bg-slate-100 focus-visible:outline-slate-400",
    danger:
      "bg-danger-600 text-white hover:bg-danger-700 focus-visible:outline-danger-600",
    success:
      "bg-brand-600 text-white hover:bg-brand-700 focus-visible:outline-brand-600",
    accent:
      "bg-accent-600 text-white hover:bg-accent-700 focus-visible:outline-accent-600",
  };
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        size === "lg" ? "px-6 py-2.5 text-sm" : "px-4 py-2 text-sm",
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
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
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
        "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm",
        "placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200",
        className,
      )}
      {...props}
    />
  );
}

// --------------------------------------------------------------------- Stat
export type StatTone = "neutral" | "profit" | "loss" | "warn" | "info" | "brand";

const STAT_TONES: Record<StatTone, { bar: string; value: string }> = {
  neutral: { bar: "border-l-slate-300", value: "text-slate-900" },
  profit: { bar: "border-l-brand-600", value: "text-brand-700" },
  loss: { bar: "border-l-danger-600", value: "text-danger-700" },
  warn: { bar: "border-l-accent-500", value: "text-accent-700" },
  info: { bar: "border-l-sky-600", value: "text-sky-800" },
  brand: { bar: "border-l-gold-600", value: "text-gold-700" },
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
  const t = STAT_TONES[tone];
  return (
    <div
      className={cx(
        "rounded-md border border-l-4 border-slate-200 bg-white px-3.5 py-2.5 shadow-sm",
        t.bar,
      )}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className={cx("tabular mt-1 text-2xl font-bold leading-none", t.value)}>
        {value}
      </div>
      {sub && <div className="mt-1 text-[11px] leading-tight text-slate-400">{sub}</div>}
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
    neutral: "border-slate-300 bg-slate-50 text-slate-600",
    pending: "border-slate-300 bg-slate-50 text-slate-600",
    open: "border-brand-200 bg-brand-50 text-brand-700",
    closed: "border-accent-200 bg-accent-50 text-accent-700",
    revealed: "border-gold-200 bg-gold-50 text-gold-700",
  };
  return (
    <span
      className={cx(
        "inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
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
    info: "border-sky-200 border-l-sky-500 bg-sky-50 text-sky-800",
    warn: "border-accent-200 border-l-accent-500 bg-accent-50 text-accent-700",
    error: "border-danger-200 border-l-danger-500 bg-danger-50 text-danger-700",
    success: "border-brand-200 border-l-brand-600 bg-brand-50 text-brand-800",
  };
  return (
    <div className={cx("rounded-md border border-l-4 px-4 py-3 text-sm", tones[tone])}>
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

// -------------------------------------------------------------------- Icons
// Íconos de línea minimalistas (monocromo, heredan el color del texto).
export function IconUser({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  );
}

export function IconControls({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 7h10M18 7h2M4 12h2M10 12h10M4 17h6M14 17h6" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="12" r="2" />
      <circle cx="12" cy="17" r="2" />
    </svg>
  );
}
