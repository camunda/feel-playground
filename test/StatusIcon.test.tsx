import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { StatusIcon } from '../src/render/StatusIcon';

afterEach(cleanup);

describe('<StatusIcon>', () => {

  const statuses = [
    { status: 'success', label: 'Success', color: 'text-success-foreground-subtle' },
    { status: 'warning', label: 'Warning', color: 'text-warning-foreground-subtle' },
    { status: 'error', label: 'Error', color: 'text-danger-foreground-subtle' }
  ] as const;

  statuses.forEach(({ status, label, color }) => {
    it(`should use the design-system ${ status } indicator`, () => {

      // when
      render(<StatusIcon status={ status } />);

      // then
      const icon = screen.getByRole('img', { name: label });
      expect(icon.classList.contains(color)).to.be.true;
      expect(icon.classList.contains('feel-playground__status-icon')).to.be.true;
    });
  });


  it('should use an accessible spinner for loading', () => {

    // when
    const { container } = render(<StatusIcon status="loading" />);

    // then
    expect(screen.getByRole('status', { name: 'Loading' })).to.exist;
    expect(screen.queryByRole('img')).not.to.exist;
    expect(container.querySelector('[data-slot="spinner-icon"][aria-hidden="true"]')).to.exist;
  });
});
