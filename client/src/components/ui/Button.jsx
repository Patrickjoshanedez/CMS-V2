/* eslint-disable react-hooks/refs */
import { cloneElement, forwardRef, isValidElement, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { preloadRoute } from '@/utils/routePreload';

/**
 * Button — shadcn/ui-compatible button component.
 * Supports variants: default, destructive, outline, secondary, ghost, link.
 * Supports sizes: default, sm, lg, icon.
 * Supports loading states (loading / isLoading, loadingText), preloading, and accessible busy indicators.
 */

const buttonVariants = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
  link: 'text-primary underline-offset-4 hover:underline',
};

const buttonSizes = {
  default: 'h-10 px-4 py-2',
  sm: 'h-9 rounded-md px-3',
  lg: 'h-11 rounded-md px-8',
  icon: 'h-10 w-10',
};

const Button = forwardRef(
  (
    {
      className,
      variant = 'default',
      size = 'default',
      disabled = false,
      loading = false,
      isLoading = false,
      loadingText,
      children,
      asChild = false,
      type = 'button',
      to,
      href,
      onMouseEnter,
      onMouseOver,
      onPointerEnter,
      onFocus,
      onClick,
      ...props
    },
    ref,
  ) => {
    const isBusy = Boolean(loading || isLoading);
    const isDisabled = Boolean(disabled || isBusy);

    const triggerPreload = useCallback(() => {
      const targetPath = to || href;
      if (targetPath && typeof targetPath === 'string') {
        preloadRoute(targetPath);
      }
    }, [to, href]);

    const handleMouseEnter = useCallback(
      (event) => {
        triggerPreload();
        onMouseEnter?.(event);
      },
      [triggerPreload, onMouseEnter],
    );

    const handleMouseOver = useCallback(
      (event) => {
        triggerPreload();
        onMouseOver?.(event);
      },
      [triggerPreload, onMouseOver],
    );

    const handlePointerEnter = useCallback(
      (event) => {
        triggerPreload();
        onPointerEnter?.(event);
      },
      [triggerPreload, onPointerEnter],
    );

    const handleFocus = useCallback(
      (event) => {
        triggerPreload();
        onFocus?.(event);
      },
      [triggerPreload, onFocus],
    );

    const handleClick = useCallback(
      (event) => {
        if (isDisabled) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        triggerPreload();
        onClick?.(event);
      },
      [isDisabled, triggerPreload, onClick],
    );

    const buttonClassName = cn(
      'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
      buttonVariants[variant],
      buttonSizes[size],
      className,
    );

    if (asChild && isValidElement(children)) {
      return cloneElement(children, {
        ...props,
        ref,
        className: cn(buttonClassName, children.props.className),
        'aria-disabled': isDisabled || undefined,
        'aria-busy': isBusy ? 'true' : undefined,
        tabIndex: isDisabled ? -1 : children.props.tabIndex,
        onMouseEnter: (event) => {
          handleMouseEnter(event);
          children.props.onMouseEnter?.(event);
        },
        onMouseOver: (event) => {
          handleMouseOver(event);
          children.props.onMouseOver?.(event);
        },
        onPointerEnter: (event) => {
          handlePointerEnter(event);
          children.props.onPointerEnter?.(event);
        },
        onFocus: (event) => {
          handleFocus(event);
          children.props.onFocus?.(event);
        },
        onClick: (event) => {
          if (isDisabled) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }
          triggerPreload();
          children.props.onClick?.(event);
          onClick?.(event);
        },
      });
    }

    return (
      <button
        className={buttonClassName}
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={isBusy ? 'true' : undefined}
        onMouseEnter={handleMouseEnter}
        onMouseOver={handleMouseOver}
        onPointerEnter={handlePointerEnter}
        onFocus={handleFocus}
        onClick={handleClick}
        {...props}
      >
        {isBusy && (
          <Loader2 className="h-4 w-4 animate-spin shrink-0 text-current" aria-hidden="true" />
        )}
        {isBusy && loadingText ? <span>{loadingText}</span> : children}
      </button>
    );
  },
);

Button.displayName = 'Button';

export { Button, buttonVariants };
