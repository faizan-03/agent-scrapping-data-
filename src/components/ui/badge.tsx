import { cn } from "@/lib/utils";

type BadgeProps = {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger";
  className?: string;
};

const tones = {
  neutral: "border-[#dfe4dc] bg-white text-[#46514a]",
  success: "border-[#b8dac8] bg-[#e7f6ed] text-[#176b42]",
  warning: "border-[#f0d1b7] bg-[#fff2e8] text-[#a24b19]",
  danger: "border-[#f2b8b0] bg-[#fff0ee] text-[#b42318]",
};

export function Badge({ children, tone = "neutral", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-md border px-2.5 text-xs font-semibold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
