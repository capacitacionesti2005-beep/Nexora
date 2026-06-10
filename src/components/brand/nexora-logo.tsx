import { cn } from "@/lib/utils/cn";

export function NexoraMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      role="img"
      aria-label="Nexora"
      className={cn("h-9 w-9", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="48" height="48" rx="14" fill="#14B8A6" />
      <path
        d="M14 32V16L34 32V16"
        stroke="#F8FAFC"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="14" cy="16" r="4" fill="#0F172A" />
      <circle cx="34" cy="32" r="4" fill="#0F172A" />
      <circle cx="24" cy="24" r="3" fill="#CCFBF1" />
    </svg>
  );
}

export function NexoraLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <NexoraMark className="h-8 w-8 shrink-0" />
      {compact ? null : <span className="text-xl font-black tracking-normal text-white">Nexora</span>}
    </div>
  );
}
