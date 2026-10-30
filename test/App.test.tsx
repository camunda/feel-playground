import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor
} from '@testing-library/react';
import {
  afterEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { App } from '../example/App';

vi.mock('../example/evaluate', () => ({
  evaluateOnConfiguredCluster: vi.fn().mockResolvedValue({ result: 2, warnings: [] })
}));

afterEach(cleanup);

describe('<App>', () => {

  it('should showcase unavailable details and a working demo connection action', async () => {

    // given
    const { container } = render(<App />);

    // when
    fireEvent.click(screen.getByRole('button', { name: 'Unavailable' }));

    // then
    await screen.findByRole('heading', { name: 'No connection selected' });
    expect(screen.getByText('Use a simulated connection to try expression evaluation without a running cluster.')).to.exist;

    // when
    fireEvent.click(screen.getByRole('button', { name: 'Use demo connection' }));

    // then
    expect(screen.getByRole('button', { name: 'Success' }).getAttribute('aria-pressed')).to.equal('true');
    expect(screen.queryByRole('heading', { name: 'No connection selected' })).not.to.exist;
    await waitFor(() => {
      expect(container.querySelector('.feel-playground__result-editor')?.textContent)
        .to.contain('https://google.com:8080');
    });
  });
});
