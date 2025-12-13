import { ButtonHTMLAttributes, ReactNode } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "danger" | "secondary";
  size?: "default" | "small";
  children: ReactNode;
}

export default function Button({
  variant = "default",
  size = "default",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const baseClass = variant === "secondary" ? "button-secondary" : "button";
  const variantClass =
    variant === "primary" ? "button-primary" : variant === "danger" ? "button-danger" : "";
  const sizeClass = size === "small" ? "button-small" : "";

  const classes = [baseClass, variantClass, sizeClass, className].filter(Boolean).join(" ");

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
