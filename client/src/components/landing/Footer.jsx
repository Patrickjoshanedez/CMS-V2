import { GraduationCap } from 'lucide-react';

/* =====================================================================
   FOOTER
   ===================================================================== */
export function Footer() {
  return (
    <footer className="border-t border-border py-10 px-6 md:px-12 lg:px-20">
      <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">CMS — Capstone Management System</span>
        </div>
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Patrick Josh S. Añedez. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
