import { Link } from 'react-router-dom';

export default function ProposalCompilationPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-3xl flex-col justify-center px-6 py-12">
      <section className="rounded-xl border border-border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-foreground">Proposal Compilation</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          This page has been temporarily restored with a fallback component while the original
          implementation is recovered.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/project/submissions"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            Back to submissions
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go to dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
