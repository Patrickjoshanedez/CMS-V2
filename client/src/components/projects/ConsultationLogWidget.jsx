import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';
import {
  MessageSquareCheck,
  Calendar,
  UserCheck,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCheck,
} from 'lucide-react';

const INITIAL_LOGS = [
  {
    id: 'log-1',
    date: '2026-08-15',
    topic: 'Chapter 1 Scope Refinement & Research Questions',
    agreedActionItems:
      'Narrow down dataset criteria to BukSU local health units. Revise Section 1.3.',
    adviserNote: 'Good progress. Follow up on survey questionnaire structure.',
    status: 'signed',
    signedAt: '2026-08-15T14:30:00Z',
  },
  {
    id: 'log-2',
    date: '2026-08-22',
    topic: 'Methodology & Winnowing Plagiarism Architecture Review',
    agreedActionItems: 'Include rolling hash formulation and noise window thresholds in Chapter 3.',
    adviserNote: 'Approved architecture formulation. Proceed to prototype integration.',
    status: 'signed',
    signedAt: '2026-08-22T16:00:00Z',
  },
];

export default function ConsultationLogWidget({ project, isAdviser = false, isStudent = false }) {
  const [logs, setLogs] = useState(INITIAL_LOGS);
  const [showAddForm, setShowAddForm] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [topic, setTopic] = useState('');
  const [actionItems, setActionItems] = useState('');

  const handleAddLog = (e) => {
    e.preventDefault();
    if (!topic.trim() || !actionItems.trim()) {
      toast.error('Please specify both discussion topic and agreed action items.');
      return;
    }

    const newLog = {
      id: `log-${Date.now()}`,
      date,
      topic: topic.trim(),
      agreedActionItems: actionItems.trim(),
      adviserNote: isAdviser
        ? 'Signed during consultation.'
        : 'Awaiting adviser verification sign-off.',
      status: isAdviser ? 'signed' : 'pending_signature',
      signedAt: isAdviser ? new Date().toISOString() : null,
    };

    setLogs([newLog, ...logs]);
    setTopic('');
    setActionItems('');
    setShowAddForm(false);
    toast.success('Consultation meeting record logged.');
  };

  const handleSignLog = (id) => {
    setLogs(
      logs.map((l) =>
        l.id === id
          ? {
              ...l,
              status: 'signed',
              signedAt: new Date().toISOString(),
              adviserNote: 'Verified & signed by Adviser.',
            }
          : l,
      ),
    );
    toast.success('Consultation session officially signed and verified.');
  };

  return (
    <Card className="rounded-2xl border-border bg-card shadow-lg">
      <CardHeader className="border-b border-border pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquareCheck className="h-5 w-5 text-indigo-500" />
            <CardTitle className="text-base font-bold text-card-foreground">
              Adviser Consultation Log (Research Mentorship)
            </CardTitle>
          </div>
          <Button
            size="xs"
            variant="outline"
            onClick={() => setShowAddForm(!showAddForm)}
            className="gap-1 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            {showAddForm ? 'Cancel' : 'Log Consultation'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {showAddForm && (
          <form
            onSubmit={handleAddLog}
            className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3"
          >
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
              Record New Consultation Session
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Meeting Date</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-8 text-xs"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Discussion Topic / Milestone</Label>
                <Input
                  placeholder="e.g. Chapter 2 Literature Gap Discussion"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="h-8 text-xs"
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Agreed Action Items &amp; Next Deliverables</Label>
              <Textarea
                placeholder="List agreed revisions, target deadlines, and deliverables..."
                value={actionItems}
                onChange={(e) => setActionItems(e.target.value)}
                className="text-xs resize-none"
                rows={2}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="xs" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="xs"
                className="bg-primary text-primary-foreground font-semibold"
              >
                Save Record
              </Button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log.id}
              className="rounded-xl border border-border bg-muted/20 p-3 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold text-foreground">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  {log.date} — {log.topic}
                </span>
                {log.status === 'signed' ? (
                  <Badge
                    variant="default"
                    className="h-5 gap-1 bg-emerald-600 text-[10px] text-white"
                  >
                    <CheckCircle2 className="h-3 w-3" /> Signed by Adviser
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="h-5 gap-1 border-amber-500/40 text-amber-600 text-[10px]"
                  >
                    <Clock className="h-3 w-3" /> Pending Sign-off
                  </Badge>
                )}
              </div>

              <div className="space-y-1 pl-5 text-muted-foreground border-l-2 border-primary/20">
                <p>
                  <strong className="text-foreground">Agreed Action Items:</strong>{' '}
                  {log.agreedActionItems}
                </p>
                {log.adviserNote && (
                  <p className="italic">
                    <strong className="not-italic text-foreground">Adviser Notes:</strong>{' '}
                    {log.adviserNote}
                  </p>
                )}
              </div>

              {isAdviser && log.status !== 'signed' && (
                <div className="flex justify-end pt-1">
                  <Button
                    size="xs"
                    onClick={() => handleSignLog(log.id)}
                    className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px]"
                  >
                    <FileCheck className="h-3.5 w-3.5" /> Sign &amp; Verify Session
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
