import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost" | "secondary" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
};

const variants = {
  default: "bg-gold text-navy hover:bg-gold-dark hover:text-white",
  outline: "border border-white/15 bg-transparent text-current hover:bg-white/10",
  ghost: "bg-transparent text-current hover:bg-black/5",
  secondary: "bg-white/10 text-current hover:bg-white/15",
  destructive: "bg-red-600 text-white hover:bg-red-700",
};

const sizes = {
  default: "h-10 px-4 py-2",
  sm: "h-9 px-3 text-sm",
  lg: "h-11 px-6",
  icon: "h-10 w-10",
};

export function Button({ className = "", variant = "default", size = "default", ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}
