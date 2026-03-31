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

import RegisterPage from '@/app/register/page';

describe('RegisterPage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockFetch.mockReset();
    mockPush.mockReset();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  async function renderRegister() {
    await act(async () => {
      root.render(<RegisterPage />);
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

  it('renders the register heading', async () => {
    await renderRegister();
    const heading = container.querySelector('h1');
    expect(heading?.textContent).toBe('Register');
  });

  it('renders username, password, and confirm password inputs', async () => {
    await renderRegister();
    expect(getInput('Username')).not.toBeNull();
    expect(getInput('Password (min 6 characters)')).not.toBeNull();
    expect(getInput('Confirm Password')).not.toBeNull();
  });

  it('renders the register button', async () => {
    await renderRegister();
    const button = getSubmitButton();
    expect(button).not.toBeNull();
    expect(button.textContent).toBe('Register');
  });

  it('has required attribute on all fields', async () => {
    await renderRegister();
    expect(getInput('Username').required).toBe(true);
    expect(getInput('Password (min 6 characters)').required).toBe(true);
    expect(getInput('Confirm Password').required).toBe(true);
  });

  it('enforces minimum password length of 6', async () => {
    await renderRegister();
    expect(getInput('Password (min 6 characters)').minLength).toBe(6);
  });

  it('shows error when passwords do not match', async () => {
    await renderRegister();
    await fillInput(getInput('Username'), 'newuser');
    await fillInput(getInput('Password (min 6 characters)'), 'password123');
    await fillInput(getInput('Confirm Password'), 'differentpassword');

    await act(async () => {
      container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true }));
    });

    expect(container.textContent).toContain('Passwords do not match');
    // fetch should NOT be called when passwords don't match
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('shows error when server is unavailable', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    await renderRegister();
    await fillInput(getInput('Username'), 'newuser');
    await fillInput(getInput('Password (min 6 characters)'), 'password123');
    await fillInput(getInput('Confirm Password'), 'password123');

    await act(async () => {
      container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true }));
    });

    expect(container.textContent).toContain('Error connecting to server');
  });

  it('shows error for duplicate username', async () => {
    mockFetch.mockResolvedValueOnce(
      {
        ok: false,
        status: 409,
        json: () => Promise.resolve({ error: 'Username already exists' }),
      }
    );

    await renderRegister();
    await fillInput(getInput('Username'), 'existinguser');
    await fillInput(getInput('Password (min 6 characters)'), 'password123');
    await fillInput(getInput('Confirm Password'), 'password123');

    await act(async () => {
      container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true }));
    });

    expect(container.textContent).toContain('Username already exists');
  });

  it('shows success message on valid registration', async () => {
    mockFetch.mockResolvedValueOnce(
      {
        ok: true,
        status: 200,
        json: () => Promise.resolve({ message: 'Registration successful' }),
      }
    );

    await renderRegister();
    await fillInput(getInput('Username'), 'newuser');
    await fillInput(getInput('Password (min 6 characters)'), 'password123');
    await fillInput(getInput('Confirm Password'), 'password123');

    await act(async () => {
      container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true }));
    });

    expect(container.textContent).toContain('Registration successful');
  });

  it('renders a link to the login page', async () => {
    await renderRegister();
    const link = container.querySelector('a[href="/login"]');
    expect(link).not.toBeNull();
    expect(link?.textContent).toContain('Login here');
  });
});
