import { cloneElement, isValidElement, type ButtonHTMLAttributes, type ReactElement } from "react";
import { cn } from "@/lib/utils/cn";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  asChild?: boolean;
};

const variants = {
  primary: "bg-gradient-to-r from-emerald-700 to-emerald-600 text-white shadow-sm shadow-emerald-900/20 hover:from-emerald-800 hover:to-emerald-700 focus-visible:ring-emerald-700",
  secondary: "border border-slate-200 bg-white text-slate-800 shadow-sm shadow-slate-200/50 hover:bg-slate-50 hover:border-slate-300 focus-visible:ring-slate-400",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-950 focus-visible:ring-slate-400",
};

export function Button({ className, variant = "primary", type = "button", asChild, children, ...props }: ButtonProps) {
  const buttonClassName = cn(
    "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
    variants[variant],
    className,
  );

  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{ className?: string }>;
    return cloneElement(child, {
      className: cn(buttonClassName, child.props.className),
    });
  }

  return (
    <button type={type} className={buttonClassName} {...props}>
      {children}
    </button>
  );
}
