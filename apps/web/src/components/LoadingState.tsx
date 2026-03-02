type LoadingStateProps = {
  label?: string;
  className?: string;
};

export default function LoadingState({ label = "Cargando datos...", className = "" }: LoadingStateProps) {
  return (
    <div className={`border border-sky-200 bg-sky-50 rounded-sm p-6 ${className}`.trim()}>
      <div className="flex items-center gap-3">
        <span className="h-5 w-5 rounded-full border-2 border-sky-200 border-t-sky-700 animate-spin" aria-hidden />
        <p className="text-sm text-sky-800">{label}</p>
      </div>
    </div>
  );
}
