import React from 'react';
import PropTypes from 'prop-types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { MessageSquareText, UserCheck, Calendar } from 'lucide-react';

/**
 * TitleFeedbackRemarksCard — Displays defense committee title feedback and remarks.
 * Strictly scoped to the Capstone 1 tab.
 */
export default function TitleFeedbackRemarksCard({ comments }) {
  if (!Array.isArray(comments) || comments.length === 0) return null;

  // Calculate total number of individual comments across all threads
  const totalComments = comments.reduce(
    (acc, thread) => acc + (Array.isArray(thread.comments) ? thread.comments.length : 0),
    0,
  );

  if (totalComments === 0) return null;

  return (
    <Card className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <MessageSquareText className="h-4 w-4" />
            </div>
            <span>Title Defense Feedback &amp; Panel Remarks</span>
          </CardTitle>
          <Badge variant="secondary" className="text-xs font-medium px-2 py-0.5">
            {totalComments} {totalComments === 1 ? 'Remark' : 'Remarks'}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Institutional feedback and defense committee recommendations on your submitted title
          proposals.
        </p>
      </CardHeader>

      <CardContent className="p-5 space-y-4">
        {comments.map((thread, threadIdx) => {
          if (!thread.comments || thread.comments.length === 0) return null;

          return (
            <div key={thread._id || threadIdx} className="space-y-3">
              {thread.proposalTitle && (
                <div className="text-xs font-semibold text-foreground/90 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-border/40">
                  <span>Re: {thread.proposalTitle}</span>
                </div>
              )}

              <div className="space-y-2.5">
                {thread.comments.map((comment, commentIdx) => {
                  const dateStr = comment.createdAt
                    ? new Date(comment.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : null;

                  return (
                    <div
                      key={comment._id || commentIdx}
                      className="rounded-xl border border-border/60 bg-muted/15 p-4 space-y-2 transition-colors hover:border-border"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                            <UserCheck className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-xs font-semibold text-foreground">
                            {comment.name || comment.authorName || 'Committee Member'}
                          </span>
                          {comment.role && (
                            <Badge
                              variant="outline"
                              className="text-[10px] py-0 px-1.5 text-muted-foreground border-border/70"
                            >
                              {comment.role}
                            </Badge>
                          )}
                        </div>

                        {dateStr && (
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{dateStr}</span>
                          </div>
                        )}
                      </div>

                      <p className="text-xs sm:text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed pl-8">
                        {comment.text}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

TitleFeedbackRemarksCard.propTypes = {
  comments: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string,
      proposalTitle: PropTypes.string,
      comments: PropTypes.arrayOf(
        PropTypes.shape({
          _id: PropTypes.string,
          name: PropTypes.string,
          authorName: PropTypes.string,
          role: PropTypes.string,
          text: PropTypes.string,
          createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
        }),
      ),
    }),
  ),
};
