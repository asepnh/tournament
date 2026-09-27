import { InputHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className = "", ...props }, ref) {
  return (
    <input
      ref={ref}
      className={`w-full rounded-lg border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-navy-50 placeholder:text-navy-400 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-400 ${className}`}
      {...props}
    />
  );
});

export const Label = ({
  children,
  htmlFor,
}: {
  children: React.ReactNode;
  htmlFor?: string;
}) => (
  <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-navy-200">
    {children}
  </label>
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className = "", ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={`w-full rounded-lg border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-navy-50 placeholder:text-navy-400 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-400 ${className}`}
      {...props}
    />
  );
});
