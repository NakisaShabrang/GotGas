import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

import LoginPage from '@/app/login/page';

describe('LoginPage', () => {
  let container: HTMLDivElement;
  let root: Root;

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

  async function renderLogin() {
    await act(async () => {
      root.render(<LoginPage />);
    });
  }

  function getInput(placeholder: string) {
    return container.querySelector(`input[placeholder="${placeholder}"]`) as HTMLInputElement;
  }

  function getSubmitButton() {
    return container.querySelector('button[type="submit"]') as HTMLButtonElement;
  }

  async function fillInput(input: HTMLInputElement, value: string) {
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  it('renders the login heading', async () => {
    await renderLogin();
    const heading = container.querySelector('h1');
    expect(heading?.textContent).toBe('Login');
  });

  it('renders username and password inputs', async () => {
    await renderLogin();
    expect(getInput('Username')).not.toBeNull();
    expect(getInput('Password')).not.toBeNull();
  });

  it('renders the login button', async () => {
    await renderLogin();
    const button = getSubmitButton();
    expect(button).not.toBeNull();
    expect(button.textContent).toBe('Login');
  });

  it('has required attribute on username and password fields', async () => {
    await renderLogin();
    expect(getInput('Username').required).toBe(true);
    expect(getInput('Password').required).toBe(true);
  });

  it('allows typing in username and password fields', async () => {
    await renderLogin();
    await fillInput(getInput('Username'), 'testuser');
    await fillInput(getInput('Password'), 'testpass');

    expect(getInput('Username').value).toBe('testuser');
    expect(getInput('Password').value).toBe('testpass');
  });

  it('shows error message when server is unavailable', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    await renderLogin();
    await fillInput(getInput('Username'), 'user');
    await fillInput(getInput('Password'), 'pass');

    await act(async () => {
      container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true }));
    });

    expect(container.textContent).toContain('Error connecting to server');
  });

  it('shows error message for invalid credentials', async () => {
    mockFetch.mockResolvedValueOnce(
      {
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Invalid credentials' }),
      }
    );

    await renderLogin();
    await fillInput(getInput('Username'), 'wrong');
    await fillInput(getInput('Password'), 'wrong');

    await act(async () => {
      container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true }));
    });

    expect(container.textContent).toContain('Invalid credentials');
  });

  it('shows success message on valid login', async () => {
    mockFetch.mockResolvedValueOnce(
      {
        ok: true,
        status: 200,
        json: () => Promise.resolve({ message: 'Login successful', username: 'testuser' }),
      }
    );

    await renderLogin();
    await fillInput(getInput('Username'), 'testuser');
    await fillInput(getInput('Password'), 'password123');

    await act(async () => {
      container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true }));
    });

    expect(container.textContent).toContain('Login successful');
  });

  it('stores username in localStorage on successful login', async () => {
    mockFetch.mockResolvedValueOnce(
      {
        ok: true,
        status: 200,
        json: () => Promise.resolve({ message: 'Login successful', username: 'testuser' }),
      }
    );

    await renderLogin();
    await fillInput(getInput('Username'), 'testuser');
    await fillInput(getInput('Password'), 'password123');

    await act(async () => {
      container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true }));
    });

    expect(localStorage.getItem('user')).toBe('testuser');
  });

  it('renders a link to the register page', async () => {
    await renderLogin();
    const link = container.querySelector('a[href="/register"]');
    expect(link).not.toBeNull();
    expect(link?.textContent).toContain('Register here');
  });
});
