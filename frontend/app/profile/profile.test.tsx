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

  function findButton(label: string) {
    return Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === label
    ) as HTMLButtonElement | undefined;
  }

  async function updateInput(input: HTMLInputElement | null, value: string) {
    expect(input).not.toBeNull();
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    await act(async () => {
      setValue?.call(input, value);
      input!.dispatchEvent(new Event('input', { bubbles: true }));
      input!.dispatchEvent(new Event('change', { bubbles: true }));
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
    expect(container.textContent).toContain('Unable to load profile: Network error. Please try logging out and back in.');
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
      '/api/profile',
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

    const logoutBtn = findButton('Log Out');
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

    const logoutBtn = findButton('Log Out')!;
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

    const logoutBtn = findButton('Log Out')!;
    await act(async () => {
      logoutBtn.click();
    });

    expect(localStorage.getItem('user')).toBeNull();
    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  // --- Delete Account ---

  it('renders a Delete Account button', async () => {
    localStorage.setItem('user', 'janedoe');
    mockProfileResponse(fullProfile);

    await renderProfile();

    const buttons = container.querySelectorAll('button');
    const deleteBtn = Array.from(buttons).find((btn) =>
      btn.textContent.includes('Delete Account')
    );
    expect(deleteBtn).not.toBeNull();
  });

  it('shows delete modal when Delete Account button is clicked', async () => {
    localStorage.setItem('user', 'janedoe');
    mockProfileResponse(fullProfile);

    await renderProfile();

    const buttons = container.querySelectorAll('button');
    const deleteBtn = Array.from(buttons).find((btn) =>
      btn.textContent.includes('Delete Account')
    )!;

    await act(async () => {
      deleteBtn.click();
    });

    // Modal should be visible now
    const modal = container.querySelector('[class*="overlay"]');
    expect(modal).not.toBeNull();
  });

  it('modal closes when cancel button is clicked', async () => {
    localStorage.setItem('user', 'janedoe');
    mockProfileResponse(fullProfile);

    await renderProfile();

    const deleteBtn = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent.includes('Delete Account')
    )!;

    await act(async () => {
      deleteBtn.click();
    });

    // Find and click the cancel button in the modal
    const cancelBtn = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent.includes('Cancel')
    );

    await act(async () => {
      cancelBtn!.click();
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(container.querySelector('[class*="overlay"]')).toBeNull();
  });

  it('validates email format before saving', async () => {
    localStorage.setItem('user', 'janedoe');
    mockProfileResponse(fullProfile);

    await renderProfile();

    await act(async () => {
      findButton('Edit')?.click();
    });

    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    await updateInput(emailInput, 'bad-email');

    await act(async () => {
      findButton('Save')?.click();
    });

    expect(container.textContent).toContain('Please enter a valid email address.');
  });

  it('sends confirm password when updating password', async () => {
    localStorage.setItem('user', 'janedoe');
    mockFetch.mockImplementation((url: string, options?: RequestInit) => {
      if (url.endsWith('/profile')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(fullProfile) });
      }
      if (url.endsWith('/profile/password')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ message: 'Password updated successfully' }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ message: 'ok' }) });
    });

    await renderProfile();

    await act(async () => {
      const editButtons = Array.from(container.querySelectorAll('button')).filter(
        (button) => button.textContent?.trim() === 'Edit'
      );
      editButtons[1].click();
    });

    const passwordInputs = Array.from(container.querySelectorAll('input[type="password"]')) as HTMLInputElement[];
    await updateInput(passwordInputs[0], 'password123');
    await updateInput(passwordInputs[1], 'newpassword123');
    await updateInput(passwordInputs[2], 'newpassword123');

    const saveButtons = Array.from(container.querySelectorAll('button')).filter((button) => button.textContent?.trim() === 'Save');
    await act(async () => {
      saveButtons[0].click();
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/profile/password',
      expect.objectContaining({
        method: 'PATCH',
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: 'password123',
          newPassword: 'newpassword123',
          confirmNewPassword: 'newpassword123',
        }),
      })
    );
  });

  it('shows client-side password mismatch validation', async () => {
    localStorage.setItem('user', 'janedoe');
    mockProfileResponse(fullProfile);

    await renderProfile();

    const editButtons = Array.from(container.querySelectorAll('button')).filter((button) => button.textContent?.trim() === 'Edit');
    await act(async () => {
      editButtons[1].click();
    });

    const passwordInputs = Array.from(container.querySelectorAll('input[type="password"]')) as HTMLInputElement[];
    await updateInput(passwordInputs[0], 'password123');
    await updateInput(passwordInputs[1], 'newpassword123');
    await updateInput(passwordInputs[2], 'differentpassword');

    const saveButtons = Array.from(container.querySelectorAll('button')).filter((button) => button.textContent?.trim() === 'Save');
    await act(async () => {
      saveButtons[0].click();
    });

    expect(container.textContent).toContain('Passwords do not match.');
  });
});

