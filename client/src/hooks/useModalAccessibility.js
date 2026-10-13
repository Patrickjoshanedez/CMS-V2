import { useEffect, useRef } from 'react';

const activeModals = [];
let isolatedRoot;
let previousInert = false;
let previousOverflow = '';

/** Keeps portal dialogs keyboard-contained and restores the invoking control on close. */
export function useModalAccessibility({ open, onClose, busy = false }) {
  const modalRef = useRef(null);
  const callbacks = useRef({ onClose, busy });
  useEffect(() => {
    callbacks.current = { onClose, busy };
  }, [onClose, busy]);
  useEffect(() => {
    const modal = modalRef.current;
    if (!open || !modal) return;
    const entry = { modal };
    const trigger = document.activeElement;
    const previousTabIndex = modal.getAttribute('tabindex');
    modal.setAttribute('tabindex', '-1');
    if (activeModals.length === 0) {
      isolatedRoot = document.getElementById('root');
      previousInert = isolatedRoot?.inert || false;
      previousOverflow = document.body.style.overflow;
      if (isolatedRoot && !isolatedRoot.contains(modal)) isolatedRoot.inert = true;
      document.body.style.overflow = 'hidden';
    }
    activeModals.push(entry);
    const controls = () =>
      Array.from(
        modal.querySelectorAll(
          'button:not([disabled]), a[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
        ),
      ).filter((element) => !element.closest('[inert]') && element.getClientRects().length > 0);
    (controls()[0] || modal).focus();
    const handleKeyDown = (event) => {
      if (activeModals.at(-1) !== entry || event.defaultPrevented) return;
      if (event.key === 'Escape' && !callbacks.current.busy) {
        event.preventDefault();
        callbacks.current.onClose?.();
      }
      if (event.key !== 'Tab') return;
      const items = controls();
      const first = items[0];
      const last = items.at(-1);
      if (!items.length) {
        event.preventDefault();
        modal.focus();
        return;
      }
      if (
        (event.shiftKey && document.activeElement === first) ||
        (!event.shiftKey && document.activeElement === last) ||
        !modal.contains(document.activeElement)
      ) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (previousTabIndex === null) modal.removeAttribute('tabindex');
      else modal.setAttribute('tabindex', previousTabIndex);
      activeModals.splice(activeModals.indexOf(entry), 1);
      if (activeModals.length === 0) {
        if (isolatedRoot) isolatedRoot.inert = previousInert;
        document.body.style.overflow = previousOverflow;
        isolatedRoot = undefined;
      }
      if (trigger?.isConnected && !trigger.closest('[inert]')) trigger.focus();
    };
  }, [open]);
  return modalRef;
}
