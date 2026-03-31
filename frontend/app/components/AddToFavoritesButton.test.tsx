import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import AddToFavoritesButton from '@/app/components/AddToFavoritesButton';
import { loadFavorites, saveFavorites } from '@/app/lib/favorites';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('AddToFavoritesButton', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    saveFavorites([]);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    saveFavorites([]);
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

  it('adds a demo station to favorites on click', async () => {
    await renderButton();
    const button = container.querySelector('button')!;

    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const favorites = loadFavorites();
    expect(favorites).toHaveLength(1);
    expect(favorites[0].id).toBe('demo-1');
    expect(favorites[0].name).toBe('Shell - Demo Station');
  });

  it('shows confirmation message after clicking', async () => {
    await renderButton();
    const button = container.querySelector('button')!;

    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.textContent).toContain('Added to favorites!');
  });

  it('does not add duplicate favorites', async () => {
    await renderButton();
    const button = container.querySelector('button')!;

    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const favorites = loadFavorites();
    expect(favorites).toHaveLength(1);
  });
});
