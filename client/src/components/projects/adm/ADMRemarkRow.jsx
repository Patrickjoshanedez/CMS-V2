import React, { useCallback, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/Badge';
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
      <textarea
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
          'w-full bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-black focus:outline-none resize-none overflow-hidden text-xs sm:text-sm text-black leading-snug py-0.5 transition-[height] duration-75 print:hidden font-serif disabled:cursor-not-allowed disabled:hover:border-transparent',
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
        <input
          type="text"
          value={row?.panelName || ''}
          onChange={(e) => handleCellChange?.(rowId, 'panelName', e.target.value)}
          onBlur={() => handleCellBlur?.(rowId, 'panelName')}
          placeholder="Panel Member Name"
          disabled={!canEditPanel}
          className="w-full font-bold bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-black focus:outline-none text-xs sm:text-sm text-black py-0.5 print:hidden font-serif disabled:cursor-not-allowed disabled:hover:border-transparent"
          data-testid={`panel-name-input-${rowId}`}
        />
        <div className="hidden print:block font-bold text-[8.5pt] leading-tight text-black whitespace-pre-wrap font-serif min-h-[1.2rem]">
          {row?.panelName || ''}
        </div>
        {/* Badges on screen */}
        <div className="mt-1 flex flex-wrap items-center gap-1 text-[9px] text-neutral-600 font-sans no-print print:hidden">
          {(row?.panelName?.toLowerCase().includes('(client)') ||
            row?.remarks?.includes('Client')) && (
            <Badge
              variant="secondary"
              className="text-[9px] py-0 px-1 bg-amber-500/10 text-amber-700 border-amber-500/30"
            >
              Client
            </Badge>
          )}
          {row?.milestone && (
            <Badge
              variant="outline"
              className="text-[9px] py-0 px-1 border-primary/30 text-primary"
            >
              {row.milestone === 'CAPSTONE_3' || row.milestone === 'CAPSTONE_4'
                ? 'Cap 3'
                : row.milestone === 'CAPSTONE_2'
                  ? 'Cap 2'
                  : 'Cap 1'}
            </Badge>
          )}
          {isLocked && (
            <span className="flex items-center gap-1 text-amber-600 font-medium">
              <Lock className="h-2.5 w-2.5" />
              Locked
            </span>
          )}
        </div>
        {/* Row Reallocation & Controls on Hover */}
        <div className="mt-1.5 flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity no-print print:hidden">
          {pageIdx > 0 && (
            <button
              type="button"
              onClick={() => handleMoveRowUp?.(rowId, pageIdx)}
              disabled={isReadOnly}
              className="text-[10px] text-blue-600 hover:text-blue-800 font-sans font-medium"
              title={`Move row to Page ${pageIdx}`}
            >
              ↑ P{pageIdx}
            </button>
          )}
          {pageIdx < totalPages - 1 && (
            <button
              type="button"
              onClick={() => handleMoveRowDown?.(rowId, pageIdx)}
              disabled={isReadOnly}
              className="text-[10px] text-blue-600 hover:text-blue-800 font-sans font-medium"
              title={`Move row to Page ${pageIdx + 2}`}
            >
              ↓ P{pageIdx + 2}
            </button>
          )}
          {!isReadOnly && !isLocked && canAddRow && (
            <button
              type="button"
              onClick={() => handleDeleteRow?.(rowId)}
              title="Delete Row"
              className="text-neutral-400 hover:text-red-600 transition-colors pt-0.5 ml-auto"
            >
              <Trash2 className="h-3 w-3" />
            </button>
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
          disabled={!canEditAction}
          data-testid={`panel-action-input-${rowId}`}
        />

        {/* Panel Fulfillment Verification Checkbox (print:hidden) */}
        <div className="mt-2 pt-1.5 border-t border-dashed border-neutral-300 flex items-center justify-between gap-1 text-xs font-sans no-print print:hidden">
          <label
            htmlFor={`verify-row-${rowId}`}
            className={cn(
              'inline-flex items-center gap-1.5 select-none text-[11px] font-medium transition-colors',
              canVerifyRow ? 'cursor-pointer' : 'cursor-default opacity-85',
              row?.status === 'verified'
                ? 'text-emerald-700 font-semibold'
                : row?.status === 'addressed'
                  ? 'text-amber-700 font-medium'
                  : 'text-neutral-600',
            )}
          >
            <input
              id={`verify-row-${rowId}`}
              type="checkbox"
              checked={row?.status === 'verified'}
              disabled={!canVerifyRow}
              onChange={(e) => handleToggleFulfillment?.(rowId, e.target.checked)}
              className="h-3.5 w-3.5 rounded border-neutral-400 text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            />
            <span>
              {row?.status === 'verified' ? (
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                  Verified
                </span>
              ) : row?.status === 'addressed' ? (
                <span>Addressed — Pending Verification</span>
              ) : (
                <span>Pending Student Action</span>
              )}
            </span>
          </label>
        </div>
      </td>

      {/* Column 4: Page Number/s */}
      <td className="w-[9%] p-2 sm:p-2.5 text-center text-black align-top font-serif">
        <input
          type="text"
          value={row?.pageNumbers || ''}
          onChange={(e) => handleCellChange?.(rowId, 'pageNumbers', e.target.value)}
          onBlur={() => handleCellBlur?.(rowId, 'pageNumbers')}
          placeholder="p. #"
          disabled={!canEditAction}
          className="w-full text-center bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-black focus:outline-none text-xs sm:text-sm text-black py-0.5 print:hidden font-serif disabled:cursor-not-allowed disabled:hover:border-transparent"
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
