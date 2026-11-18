import PropTypes from 'prop-types';
import { cn } from '@/lib/utils';

/**
 * SectionHeader — consistent sub-section header for panels and workspace blocks.
 */
export function SectionHeader({
  title,
  description,
  icon: Icon,
  badge,
  actions,
  as: Heading = 'h2',
  className,
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0 space-y-0.5">
        <div className="flex flex-wrap items-center gap-2">
          {Icon && <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
          <Heading className="text-base font-semibold tracking-tight text-foreground">
            {title}
          </Heading>
          {badge}
        </div>
        {description && <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

SectionHeader.propTypes = {
  title: PropTypes.node.isRequired,
  description: PropTypes.node,
  icon: PropTypes.elementType,
  badge: PropTypes.node,
  actions: PropTypes.node,
  as: PropTypes.oneOf(['h2', 'h3', 'h4']),
  className: PropTypes.string,
};

export default SectionHeader;
