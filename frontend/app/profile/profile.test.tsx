import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

import ProfilePage from '@/app/profile/page';

describe('ProfilePage', () => {
  let container: HTMLDivElement;
  let root: Root;

  const fullProfile = {
    username: 'janedoe',
    email: 'janedoe@email.com',
    fullName: 'Jane Doe',
    phone: '555-1234',
    memberSince: 'March 2025',
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockFetch.mockReset();
    mockPush.mockReset();
    localStorage.clear();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  async function renderProfile() {
    await act(async () => {
      root.render(<ProfilePage />);
    });
    // Allow fetch promises and microtasks to resolve
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
  }

  function mockProfileResponse(data: object, status = 200) {
    mockFetch.mockImplementation((url: string) => {
      if (url.endsWith('/profile')) {
        return Promise.resolve({
          ok: status >= 200 && status < 300,
          status,
          json: () => Promise.resolve(data),
        });
      }
      // Default for logout or other calls
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ message: 'ok' }),
      });
    });
  }

  // --- AC2: Redirect guests to login ---

  it('redirects to login if no user in localStorage', async () => {
    await renderProfile();
    expect(mockPush).toHaveBeenCalledWith('/login?message=Please log in to view your profile.');
  });

  it('does not call fetch when user is not logged in', async () => {
    await renderProfile();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  // --- AC4: Session refresh / 401 handling ---

  it('redirects to login and clears localStorage on 401', async () => {
    localStorage.setItem('user', 'janedoe');
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Please log in to view your profile.' }),
      })
    );

    await renderProfile();
    expect(localStorage.getItem('user')).toBeNull();
    expect(mockPush).toHaveBeenCalledWith('/login?message=Please log in to view your profile.');
  });

  // --- Loading state ---

  it('shows loading text initially', async () => {
    localStorage.setItem('user', 'janedoe');
    mockFetch.mockImplementation(() => new Promise(() => {}));

    await act(async () => {
      root.render(<ProfilePage />);
    });

    expect(container.textContent).toContain('Loading profile...');
  });

  // --- Error state ---

  it('shows error message when fetch fails', async () => {
    localStorage.setItem('user', 'janedoe');
    mockFetch.mockImplementation(() => Promise.reject(new Error('Network error')));

    await renderProfile();
    expect(container.textContent).toContain('Unable to load profile. Please try again later.');
  });

  // --- AC1 & AC3: Display profile info correctly ---

  it('displays all profile fields when data is complete', async () => {
    localStorage.setItem('user', 'janedoe');
    mockProfileResponse(fullProfile);

    await renderProfile();

    expect(container.textContent).toContain('Profile Overview');
    expect(container.textContent).toContain('janedoe');
    expect(container.textContent).toContain('Jane Doe');
    expect(container.textContent).toContain('janedoe@email.com');
    expect(container.textContent).toContain('555-1234');
    expect(container.textContent).toContain('March 2025');
  });

  it('fetches profile with credentials included', async () => {
    localStorage.setItem('user', 'janedoe');
    mockProfileResponse(fullProfile);

    await renderProfile();

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:5000/profile',
      { credentials: 'include' }
    );
  });

  // --- AC5: Empty/missing fields show placeholder ---

  it('shows "Not provided" for null fields', async () => {
    localStorage.setItem('user', 'janedoe');
    mockProfileResponse({
      username: 'janedoe',
      email: null,
      fullName: null,
      phone: null,
      memberSince: null,
    });

    await renderProfile();

    const placeholders = container.querySelectorAll('span');
    const notProvidedSpans = Array.from(placeholders).filter(
      (el) => el.textContent === 'Not provided'
    );
    // email, fullName, phone, memberSince = 4 "Not provided"
    expect(notProvidedSpans.length).toBe(4);
  });

  it('shows username even when optional fields are null', async () => {
    localStorage.setItem('user', 'testuser');
    mockProfileResponse({
      username: 'testuser',
      email: null,
      fullName: null,
      phone: null,
      memberSince: null,
    });

    await renderProfile();
    expect(container.textContent).toContain('testuser');
  });

  // --- Logout ---

  it('renders a Log Out button', async () => {
    localStorage.setItem('user', 'janedoe');
    mockProfileResponse(fullProfile);

    await renderProfile();

    const logoutBtn = container.querySelector('button');
    expect(logoutBtn).not.toBeNull();
    expect(logoutBtn!.textContent).toBe('Log Out');
  });

  it('calls logout endpoint and redirects on Log Out click', async () => {
    localStorage.setItem('user', 'janedoe');
    mockProfileResponse(fullProfile);

    await renderProfile();

    // Mock the logout fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: 'Logged out' }),
    });

    const logoutBtn = container.querySelector('button')!;
    await act(async () => {
      logoutBtn.click();
    });

    expect(localStorage.getItem('user')).toBeNull();
    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('clears localStorage even if logout fetch fails', async () => {
    localStorage.setItem('user', 'janedoe');
    mockProfileResponse(fullProfile);

    await renderProfile();

    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const logoutBtn = container.querySelector('button')!;
    await act(async () => {
      logoutBtn.click();
    });

    expect(localStorage.getItem('user')).toBeNull();
    expect(mockPush).toHaveBeenCalledWith('/login');
  });
});
