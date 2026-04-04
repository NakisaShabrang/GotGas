import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let mockPathname = '/';
jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

import Navbar from '@/app/components/Navbar';

describe('Navbar', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    localStorage.clear();
    mockPathname = '/';
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  async function renderNavbar() {
    await act(async () => {
      root.render(<Navbar />);
    });
  }

  function getLinks() {
    return Array.from(container.querySelectorAll('a'));
  }

  function getLinkByText(text: string) {
    return getLinks().find((a) => a.textContent === text);
  }

  // --- Always-visible links ---

  it('renders the GotGas brand name', async () => {
    await renderNavbar();
    expect(container.textContent).toContain('GotGas');
  });

  it('renders Predictions, Home, Map, and Favorites links', async () => {
    await renderNavbar();
    expect(getLinkByText('Predictions')).toBeDefined();
    expect(getLinkByText('Home')).toBeDefined();
    expect(getLinkByText('Map')).toBeDefined();
    expect(getLinkByText('Favorites')).toBeDefined();
  });

  // --- AC2: Profile hidden from guests ---

  it('shows Login link when user is not logged in', async () => {
    await renderNavbar();
    const loginLink = getLinkByText('Login');
    expect(loginLink).toBeDefined();
    expect(loginLink!.getAttribute('href')).toBe('/login');
  });

  it('does not show Profile link when user is not logged in', async () => {
    await renderNavbar();
    expect(getLinkByText('Profile')).toBeUndefined();
  });

  // --- AC1 & AC63: Profile visible when logged in ---

  it('shows Profile link when user is logged in', async () => {
    localStorage.setItem('user', 'janedoe');
    await renderNavbar();
    const profileLink = getLinkByText('Profile');
    expect(profileLink).toBeDefined();
    expect(profileLink!.getAttribute('href')).toBe('/profile');
  });

  it('does not show Login link when user is logged in', async () => {
    localStorage.setItem('user', 'janedoe');
    await renderNavbar();
    expect(getLinkByText('Login')).toBeUndefined();
  });

  // --- Link hrefs ---

  it('has correct href for Predictions', async () => {
    await renderNavbar();
    expect(getLinkByText('Predictions')!.getAttribute('href')).toBe('/predictions');
  });

  it('has correct href for Home', async () => {
    await renderNavbar();
    expect(getLinkByText('Home')!.getAttribute('href')).toBe('/');
  });

  it('has correct href for Map', async () => {
    await renderNavbar();
    expect(getLinkByText('Map')!.getAttribute('href')).toBe('/map');
  });

  it('has correct href for Favorites', async () => {
    await renderNavbar();
    expect(getLinkByText('Favorites')!.getAttribute('href')).toBe('/favorites');
  });
});
