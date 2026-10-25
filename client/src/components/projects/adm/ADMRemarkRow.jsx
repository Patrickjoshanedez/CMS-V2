import React, { useCallback, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { cn } from '@/lib/utils';
import { CheckCircle2, Lock, Trash2 } from 'lucide-react';

/**
 * Auto-expanding Textarea matching Secretary Minutes input style
 * In interactive screen mode: transparent background, auto-resizing, subtle underline on focus/hover.
 * In print mode: pure static typography div without borders, boxes, scrollbars, or placeholders.
 */
export function AutoResizeTextarea({
  value,
  onChange,
  placeholder,
  className,
  rows = 1,
  disabled = false,
  ...props
}) {
  const textareaRef = useRef(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, 24)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  return (
    <>
      <Textarea
        ref={textareaRef}
        value={value || ''}
        onChange={(e) => {
          onChange?.(e);
          adjustHeight();
        }}
        rows={rows}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'h-auto min-h-6 w-full resize-none overflow-hidden rounded-none border-x-0 border-t-0 border-b border-transparent bg-transparent px-0 py-0.5 text-xs leading-snug text-black shadow-none transition-[height] duration-75 hover:border-neutral-300 focus-visible:border-black focus-visible:ring-0 focus-visible:ring-offset-0 print:hidden font-serif disabled:cursor-not-allowed disabled:hover:border-transparent sm:text-sm',
          className,
        )}
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
        {...props}
      />
      <div
        className={cn(
          'hidden print:block w-full text-[8.5pt] leading-snug text-black whitespace-pre-wrap break-words py-0.5 font-serif min-h-[1.2rem]',
          className,
        )}
      >
        {value || ''}
      </div>
    </>
  );
}

/**
 * Memoized row component for Action Done Matrix table.
 * Wrapped in React.memo to prevent table-wide re-render cascades during single cell edits.
 */
export const ADMRemarkRow = React.memo(function ADMRemarkRow({
  row,
  rowId,
  pageIdx,
  totalPages,
  canEditPanel,
  canEditSuggestion,
  canEditAction,
  canVerifyRow,
  canAddRow,
  isReadOnly = false,
  handleCellChange,
  handleCellBlur,
  handleToggleFulfillment,
  handleMoveRowUp,
  handleMoveRowDown,
  handleDeleteRow,
}) {
  const isLocked = Boolean(row?.isLocked);

  return (
    <tr
      key={rowId}
      className="align-top border-b border-black last:border-b-0 group/row hover:bg-neutral-50/50 transition-colors text-black"
    >
      {/* Column 1: Name of Panel */}
      <td className="w-[26%] p-2.5 sm:p-3 border-r border-black font-bold text-black relative align-top font-serif">
        <Input
          type="text"
          value={row?.panelName || ''}
          onChange={(e) => handleCellChange?.(rowId, 'panelName', e.target.value)}
          onBlur={() => handleCellBlur?.(rowId, 'panelName')}
          placeholder="Panel Member Name"
          aria-label="Panel member name"
          disabled={!canEditPanel}
          className="h-auto min-h-6 w-full rounded-none border-x-0 border-t-0 border-b border-transparent bg-transparent px-0 py-0.5 text-xs font-bold text-black shadow-none hover:border-neutral-300 focus-visible:border-black focus-visible:ring-0 focus-visible:ring-offset-0 print:hidden font-serif disabled:cursor-not-allowed disabled:hover:border-transparent sm:text-sm"
          data-testid={`panel-name-input-${rowId}`}
        />
        <div className="hidden print:block font-bold text-[8.5pt] leading-tight text-black whitespace-pre-wrap font-serif min-h-[1.2rem]">
          {row?.panelName || ''}
        </div>
        {/* Badges on screen */}
        <div className="mt-1 flex flex-wrap items-center gap-1 text-[9px] text-neutral-600 font-sans no-print print:hidden">
          {(row?.panelName?.toLowerCase().includes('(client)') ||
            row?.remarks?.includes('Client')) && (
            <Badge variant="warning" className="px-1 py-0 text-[9px]">
              Client
            </Badge>
          )}
          {row?.milestone && (
            <Badge variant="outline" className="px-1 py-0 text-[9px]">
              {row.milestone === 'CAPSTONE_3' || row.milestone === 'CAPSTONE_4'
                ? 'Cap 3'
                : row.milestone === 'CAPSTONE_2'
                  ? 'Cap 2'
                  : 'Cap 1'}
            </Badge>
          )}
          {isLocked && (
            <span className="flex items-center gap-1 font-medium text-warning-foreground">
              <Lock className="h-2.5 w-2.5" />
              Locked
            </span>
          )}
        </div>
        {/* Row Reallocation & Controls on Hover */}
        <div className="mt-1.5 flex items-center gap-1 opacity-100 transition-opacity no-print print:hidden sm:opacity-0 sm:group-hover/row:opacity-100 sm:group-focus-within/row:opacity-100">
          {pageIdx > 0 && (
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => handleMoveRowUp?.(rowId, pageIdx)}
              disabled={isReadOnly}
              className="min-h-11 px-2 text-[10px] font-sans font-medium"
              aria-label={`Move ${row?.panelName || 'row'} to page ${pageIdx}`}
              title={`Move row to Page ${pageIdx}`}
            >
              ↑ P{pageIdx}
            </Button>
          )}
          {pageIdx < totalPages - 1 && (
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => handleMoveRowDown?.(rowId, pageIdx)}
              disabled={isReadOnly}
              className="min-h-11 px-2 text-[10px] font-sans font-medium"
              aria-label={`Move ${row?.panelName || 'row'} to page ${pageIdx + 2}`}
              title={`Move row to Page ${pageIdx + 2}`}
            >
              ↓ P{pageIdx + 2}
            </Button>
          )}
          {!isReadOnly && !isLocked && canAddRow && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handleDeleteRow?.(rowId)}
              aria-label={`Delete ${row?.panelName || 'row'}`}
              title="Delete row"
              className="ml-auto min-h-11 min-w-11 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </td>

      {/* Column 2: Suggestion of the Panel(s) */}
      <td className="w-[35%] p-2.5 sm:p-3 border-r border-black text-black align-top font-serif">
        <AutoResizeTextarea
          value={row?.suggestion || ''}
          onChange={(e) => handleCellChange?.(rowId, 'suggestion', e.target.value)}
          onBlur={() => handleCellBlur?.(rowId, 'suggestion')}
          placeholder="- Specific suggestion / recommendation..."
          aria-label="Panel suggestion or recommendation"
          disabled={!canEditSuggestion}
          data-testid={`panel-suggestion-input-${rowId}`}
        />
      </td>

      {/* Column 3: Action Taken & Fulfillment Verification */}
      <td className="w-[30%] p-2.5 sm:p-3 border-r border-black text-black align-top font-serif">
        <AutoResizeTextarea
          value={row?.actionDone || ''}
          onChange={(e) => handleCellChange?.(rowId, 'actionDone', e.target.value)}
          onBlur={() => handleCellBlur?.(rowId, 'actionDone')}
          placeholder="- Description of modifications made..."
          aria-label="Description of modifications made"
          disabled={!canEditAction}
          data-testid={`panel-action-input-${rowId}`}
        />

        {/* Panel Fulfillment Verification Checkbox (print:hidden) */}
        <div className="mt-2 pt-1.5 border-t border-dashed border-neutral-300 flex items-center justify-between gap-1 text-xs font-sans no-print print:hidden">
          <Label
            htmlFor={`verify-row-${rowId}`}
            className={cn(
              'inline-flex items-center gap-1.5 select-none text-[11px] font-medium transition-colors',
              canVerifyRow ? 'cursor-pointer' : 'cursor-default opacity-85',
              row?.status === 'verified'
                ? 'font-semibold text-success-foreground'
                : row?.status === 'addressed'
                  ? 'font-medium text-warning-foreground'
                  : 'text-muted-foreground',
            )}
          >
            <Checkbox
              id={`verify-row-${rowId}`}
              checked={row?.status === 'verified'}
              disabled={!canVerifyRow}
              onCheckedChange={(checked) => handleToggleFulfillment?.(rowId, checked === true)}
              aria-label={`Verify fulfillment for ${row?.panelName || `row ${rowId}`}`}
              aria-describedby={`verification-status-${rowId}`}
              className="size-4"
            />
            <span id={`verification-status-${rowId}`}>
              {row?.status === 'verified' ? (
                <span className="inline-flex items-center gap-1 font-semibold text-success-foreground">
                  <CheckCircle2 className="h-3 w-3 shrink-0 text-success" />
                  Verified
                </span>
              ) : row?.status === 'addressed' ? (
                <span>Addressed — Pending Verification</span>
              ) : (
                <span>Pending Student Action</span>
              )}
            </span>
          </Label>
        </div>
      </td>

      {/* Column 4: Page Number/s */}
      <td className="w-[9%] p-2 sm:p-2.5 text-center text-black align-top font-serif">
        <Input
          type="text"
          value={row?.pageNumbers || ''}
          onChange={(e) => handleCellChange?.(rowId, 'pageNumbers', e.target.value)}
          onBlur={() => handleCellBlur?.(rowId, 'pageNumbers')}
          placeholder="p. #"
          aria-label="Page number or range"
          disabled={!canEditAction}
          className="h-auto min-h-6 w-full rounded-none border-x-0 border-t-0 border-b border-transparent bg-transparent px-0 py-0.5 text-center text-xs text-black shadow-none hover:border-neutral-300 focus-visible:border-black focus-visible:ring-0 focus-visible:ring-offset-0 print:hidden font-serif disabled:cursor-not-allowed disabled:hover:border-transparent sm:text-sm"
          data-testid={`panel-pages-input-${rowId}`}
        />
        <div className="hidden print:block text-center text-[8.5pt] leading-tight text-black font-medium font-serif min-h-[1.2rem]">
          {row?.pageNumbers || ''}
        </div>
      </td>
    </tr>
  );
});

export default ADMRemarkRow;
