import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-accent-500 text-navy-950 hover:bg-accent-400 focus-visible:outline-accent-400",
  secondary:
    "bg-navy-700 text-navy-50 hover:bg-navy-600 focus-visible:outline-navy-400",
  ghost:
    "bg-transparent text-navy-100 hover:bg-navy-800 focus-visible:outline-navy-400",
  danger:
    "bg-red-600 text-white hover:bg-red-500 focus-visible:outline-red-400",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
>(function Button({ className = "", variant = "primary", ...props }, ref) {
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
});
