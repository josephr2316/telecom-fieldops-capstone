import type { ReactNode } from "react";

type StatusTone = "error" | "warning" | "success" | "info";

type StatusBannerProps = {
  tone?: StatusTone;
  title?: string;
  message: string;
  detail?: string;
  action?: ReactNode;
  role?: "alert" | "status";
  className?: string;
};

const TONE_STYLES: Record<StatusTone, string> = {
  error: "bg-red-50 border-red-200 text-red-800",
  warning: "bg-amber-50 border-amber-200 text-amber-800",
  success: "bg-emerald-50 border-emerald-200 text-emerald-800",
  info: "bg-sky-50 border-sky-200 text-sky-800",
};

export default function StatusBanner({
  tone = "info",
  title,
  message,
  detail,
  action,
  role = "status",
  className = "",
}: StatusBannerProps) {
  return (
    <div role={role} className={`border rounded-sm p-4 ${TONE_STYLES[tone]} ${className}`.trim()}>
      {title ? <p className="text-sm font-semibold mb-1">{title}</p> : null}
      <p className="text-sm">{message}</p>
      {detail ? <p className="text-xs mt-1 opacity-90">{detail}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
