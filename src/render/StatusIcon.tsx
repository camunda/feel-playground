import {
  Spinner,
  StatusIcon as DesignSystemStatusIcon
} from '@camunda/design-system';

type StatusIconType = 'success' | 'error' | 'warning' | 'loading';

interface StatusIconProps {
  status: StatusIconType;
}

const VARIANTS = {
  success: 'success',
  error: 'danger',
  warning: 'warning'
} as const;

export function StatusIcon({ status }: StatusIconProps) {
  const label = `${status[0].toUpperCase()}${status.slice(1)}`;

  if (status === 'loading') {
    return (
      <Spinner
        className="feel-playground__status-icon"
        accessibleLabel={ label }
        aria-label={ label }
      />
    );
  }

  return (
    <DesignSystemStatusIcon
      className="feel-playground__status-icon"
      variant={ VARIANTS[status] }
      label={ label }
    />
  );
}