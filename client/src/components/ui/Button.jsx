import { cn } from "../../utils/cn";

export default function Button({ 
  children, 
  variant = "primary", 
  size = "md", 
  className, 
  ...props 
}) {
  const variants = {
    primary: "bg-primary text-white hover:bg-primary-dark shadow-sm",
    secondary: "bg-secondary text-white hover:opacity-90 shadow-sm",
    outline: "border-2 border-primary/10 text-primary hover:bg-primary/5",
    ghost: "text-primary hover:bg-primary/5",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-8 py-4 text-base",
  };

  return (
    <button
      className={cn(
        "interactive-button inline-flex items-center justify-center font-semibold rounded-2xl",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
