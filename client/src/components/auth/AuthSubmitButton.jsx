import { Loader2 } from 'lucide-react';

/**
 * AuthSubmitButton — shared gradient button used across auth forms.
 */
export default function AuthSubmitButton({
  loading,
  idleLabel,
  loadingLabel,
  disabled,
  type = 'submit',
  className = '',
}) {
  return (
    <button
      type={type}
      disabled={Boolean(loading) || Boolean(disabled)}
      className={`auth-btn-gradient w-full flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-md disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#673ab7]/50 focus:ring-offset-2 focus:ring-offset-background ${className}`}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {loadingLabel}
        </>
      ) : (
        idleLabel
      )}
    </button>
  );
}
