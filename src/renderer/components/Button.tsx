import { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "danger" | "secondary";
  size?: "default" | "small";
  children: ReactNode;
  as?: "button" | "link";
  to?: string;
}

export default function Button({
  variant = "default",
  size = "default",
  className = "",
  children,
  as,
  to,
  ...props
}: ButtonProps) {
  const baseClass = variant === "secondary" ? "button-secondary" : "button";
  const variantClass =
    variant === "primary" ? "button-primary" : variant === "danger" ? "button-danger" : "";
  const sizeClass = size === "small" ? "button-small" : "";

  const classes = [baseClass, variantClass, sizeClass, className].filter(Boolean).join(" ");

  if (as === "link" && to) {
    return (
      <Link to={to} className={classes} {...(props as any)}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
