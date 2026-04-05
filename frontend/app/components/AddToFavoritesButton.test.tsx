import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockFetch = jest.fn();
global.fetch = mockFetch;

import AddToFavoritesButton from '@/app/components/AddToFavoritesButton';

describe('AddToFavoritesButton', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockFetch.mockReset();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  async function renderButton() {
    await act(async () => {
      root.render(<AddToFavoritesButton />);
    });
  }

  it('renders the add button', async () => {
    await renderButton();
    const button = container.querySelector('button');
    expect(button).not.toBeNull();
    expect(button?.textContent).toBe('Add Demo Station to Favorites');
  });

  it('calls the favorites API on click', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, status: 201, json: () => Promise.resolve({ message: 'Favorite added' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve([{ id: 'demo-1', name: 'Shell - Demo Station', createdAt: 1 }]) });

    await renderButton();
    const button = container.querySelector('button')!;

    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:5000/favorites',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('shows confirmation message after clicking', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, status: 201, json: () => Promise.resolve({ message: 'Favorite added' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve([]) });

    await renderButton();
    const button = container.querySelector('button')!;

    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(container.textContent).toContain('Added to favorites!');
  });
});
