import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

const variants = {
  primary: "bg-[#176b5b] text-white hover:bg-[#125548]",
  secondary: "border border-[#cdd6cd] bg-white text-[#17211b] hover:bg-[#eef4ee]",
  ghost: "text-[#17211b] hover:bg-[#eef4ee]",
  danger: "bg-[#b42318] text-white hover:bg-[#8f1c13]",
};

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
