import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

/**
 * AuthSubmitButton — accessible primary action button for auth forms with zero AI-slop.
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
    <Button
      type={type}
      aria-busy={Boolean(loading)}
      disabled={Boolean(loading) || Boolean(disabled)}
      size="lg"
      className={`w-full ${className}`}
    >
      {loading ? (
        <>
          <Spinner className="size-4" />
          <span>{loadingLabel}</span>
        </>
      ) : (
        idleLabel
      )}
    </Button>
  );
}
