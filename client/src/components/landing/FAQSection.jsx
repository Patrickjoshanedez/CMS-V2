import { useState } from 'react';
import { Search, ChevronDown } from 'lucide-react';

/* =====================================================================
   FAQ SECTION — Searchable accordion (ghost style)
   ===================================================================== */
const FAQ_DATA = [
  {
    q: 'How does the archiving system handle large manuscript files?',
    a: 'Files are uploaded to cloud storage (S3-compatible) with configurable size limits. The system stores both the full academic version and a condensed journal version, using background jobs for text extraction and plagiarism analysis.',
  },
  {
    q: 'Is CMS compatible with mobile browsers?',
    a: 'Yes. The entire interface is built responsively with Tailwind CSS, ensuring a smooth experience across desktop, tablet, and mobile devices.',
  },
  {
    q: 'What security measures are in place?',
    a: 'CMS uses JWT-based authentication, OTP email verification, role-based access control, rate limiting, CSRF protection, and secure file validation. All API endpoints are protected by layered middleware.',
  },
  {
    q: 'Can panelists review documents directly in the system?',
    a: 'Yes. Advisers and panelists can open documents in a split-screen viewer with inline highlighting and commenting tools, enabling chapter-by-chapter feedback without downloading files.',
  },
  {
    q: 'How does the plagiarism checker work?',
    a: 'Uploaded documents pass through an automated originality pipeline that extracts text, compares it against the archive database, and displays the percentage of original content before advisers review the submission.',
  },
  {
    q: 'What happens if a team misses a submission deadline?',
    a: 'Late submissions are accepted but the system requires the team to add a mandatory "remarks" section explaining the delay. The timestamp is recorded permanently in the audit log.',
  },
  {
    q: 'Can project titles be modified after approval?',
    a: 'Only through a formal request. The team must submit a title modification request to the Instructor, and the title status changes to "Pending" until the Instructor approves the change.',
  },
];

export function FAQSection({ sectionRef }) {
  const [search, setSearch] = useState('');
  const [openIndex, setOpenIndex] = useState(null);

  const filtered = FAQ_DATA.filter(
    (item) =>
      item.q.toLowerCase().includes(search.toLowerCase()) ||
      item.a.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <section
      id="faq"
      ref={sectionRef}
      className="landing-section relative py-24 px-6 md:px-12 lg:px-20"
    >
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest bg-gradient-to-r from-brand-orange/10 to-brand-deep-purple/10 text-brand-pink mb-4">
            FAQ
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground">
            Frequently asked questions
          </h2>
        </div>

        {/* Search bar */}
        <div className="relative mb-10">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpenIndex(null);
            }}
            placeholder="Search questions…"
            className="w-full rounded-xl border border-border bg-card py-3 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-pink/40 transition-all"
          />
        </div>

        {/* Accordion list */}
        <div className="space-y-2">
          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              No matching questions found.
            </p>
          )}
          {filtered.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={item.q} className="faq-item rounded-xl px-5">
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="flex w-full items-center justify-between py-4 text-left"
                >
                  <span className="text-sm font-medium text-foreground pr-4">{item.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <div className={`faq-answer ${isOpen ? 'faq-open' : ''}`}>
                  <div>
                    <p className="pb-4 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
