import { cloneElement, forwardRef, isValidElement, useCallback } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { preloadRoute } from '@/utils/routePreload';
import { Spinner } from '@/components/ui/Spinner';

/**
 * Button — shadcn/ui-compatible button component.
 * Supports variants: default, destructive, outline, destructiveOutline, warningOutline, secondary, ghost, link.
 * Supports sizes: default, sm, lg, icon.
 * Supports loading states (loading / isLoading, loadingText), preloading, and accessible busy indicators.
 */

const buttonVariants = cva(
  'inline-flex min-h-11 min-w-11 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 sm:min-h-0 sm:min-w-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        outline:
          'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        destructiveOutline:
          'border border-destructive/40 bg-background text-destructive-text hover:bg-destructive/10',
        warningOutline:
          'border border-warning/40 bg-background text-warning-foreground hover:bg-warning/10',
        secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'size-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

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

    const buttonClassName = cn(buttonVariants({ variant, size }), className);

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
        {isBusy && <Spinner className="h-4 w-4 shrink-0 text-current" />}
        {isBusy && loadingText ? <span>{loadingText}</span> : children}
      </button>
    );
  },
);

Button.displayName = 'Button';

export { Button, buttonVariants };
