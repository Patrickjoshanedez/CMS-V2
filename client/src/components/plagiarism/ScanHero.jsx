import { ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/common';

export default function ScanHero() {
  return (
    <PageHeader
      eyebrow="Institutional Archive"
      icon={ShieldCheck}
      title="Plagiarism & Similarity Checker"
      description="Compare a manuscript or proposal with the institutional archive. Review matching passages and their sources before submitting your work."
    />
  );
}
