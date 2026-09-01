type StatusIconType = 'success' | 'error' | 'warning' | 'loading';

interface StatusIconProps {
  status: StatusIconType;
}

const paths: Record<Exclude<StatusIconType, 'loading'>, string> = {
  success: 'M8,1C4.1,1,1,4.1,1,8c0,3.9,3.1,7,7,7s7-3.1,7-7C15,4.1,11.9,1,8,1z M7,11L4.3,8.3l0.9-0.8L7,9.3l4-3.9l0.9,0.8L7,11z',
  error: 'M8,1C4.1,1,1,4.1,1,8s3.1,7,7,7s7-3.1,7-7S11.9,1,8,1z M10.7,11.5L4.5,5.3l0.8-0.8l6.2,6.2L10.7,11.5z',
  warning: 'M8,1C4.2,1,1,4.2,1,8s3.2,7,7,7s7-3.1,7-7S11.9,1,8,1z M7.5,4h1v5h-1C7.5,9,7.5,4,7.5,4z M8,12.2c-0.4,0-0.8-0.4-0.8-0.8s0.3-0.8,0.8-0.8c0.4,0,0.8,0.4,0.8,0.8S8.4,12.2,8,12.2z'
};

export function StatusIcon({ status }: StatusIconProps) {
  const label = `${status[0].toUpperCase()}${status.slice(1)}`;

  if (status === 'loading') {
    return (
      <svg
        className="feel-playground__status-icon status-icon loading"
        viewBox="0 0 100 100"
        role="img"
        aria-label={ label }
      >
        <circle className="feel-playground__loading-background" cx="50" cy="50" r="42" />
        <circle className="feel-playground__loading-stroke" cx="50" cy="50" r="42" />
      </svg>
    );
  }

  return (
    <svg
      className={ `feel-playground__status-icon status-icon ${status}` }
      viewBox="0 0 16 16"
      fill="currentColor"
      role="img"
      aria-label={ label }
    >
      <path d={ paths[status] } />
    </svg>
  );
}