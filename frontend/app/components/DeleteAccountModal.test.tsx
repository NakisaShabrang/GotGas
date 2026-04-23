import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockFetch = jest.fn();
global.fetch = mockFetch;

import DeleteAccountModal from '@/app/components/DeleteAccountModal';

describe('DeleteAccountModal', () => {
  let container: HTMLDivElement;
  let root: Root;
  const mockOnClose = jest.fn();
  const mockOnConfirm = jest.fn();
  const mockOnUnauthorized = jest.fn();

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockFetch.mockReset();
    mockOnClose.mockReset();
    mockOnConfirm.mockReset();
    mockOnUnauthorized.mockReset();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  async function renderModal() {
    await act(async () => {
      root.render(
        <DeleteAccountModal onClose={mockOnClose} onConfirm={mockOnConfirm} />
      );
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
  }

  async function setPassword(value: string) {
    const input = container.querySelector('input[type="password"]') as HTMLInputElement;
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    await act(async () => {
      setValue?.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  function findButton(label: string) {
    return Array.from(container.querySelectorAll('button')).find(
      (btn) => btn.textContent?.trim() === label
    ) as HTMLButtonElement | undefined;
  }

  async function moveToConfirmation() {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ message: 'Password verified' }),
    });

    await renderModal();
    await setPassword('password123');

    await act(async () => {
      findButton('Next')?.click();
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
  }

  describe('Password Verification Step', () => {
    it('renders password input initially', async () => {
      await renderModal();
      expect(container.textContent).toContain('Delete Account');
      expect(container.textContent).toContain('password');
      const input = container.querySelector('input[type="password"]');
      expect(input).not.toBeNull();
    });

    it('displays submit button and cancel button on password step', async () => {
      await renderModal();
      const buttons = container.querySelectorAll('button');
      const textContents = Array.from(buttons).map((btn) => btn.textContent);
      expect(textContents).toContain('Cancel');
      expect(textContents).toContain('Next');
    });

    it('disables Next button when password is empty', async () => {
      await renderModal();
      const nextBtn = Array.from(container.querySelectorAll('button')).find((btn) =>
        btn.textContent.includes('Next')
      ) as HTMLButtonElement;
      expect(nextBtn.disabled).toBe(true);
    });

    it('enables Next button when password is entered', async () => {
      await renderModal();
      const nextBtn = findButton('Next')!;

      await setPassword('password123');

      expect(nextBtn.disabled).toBe(false);
    });

    it('calls verify-password endpoint when Next is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'Password verified' }),
      });

      await renderModal();
      await setPassword('password123');

      const nextBtn = findButton('Next')!;

      await act(async () => {
        nextBtn.click();
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/verify-password',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          body: expect.stringContaining('password123'),
        })
      );
    });

    it('shows error message on incorrect password', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid password' }),
      });

      await renderModal();
      await setPassword('wrongpassword');

      const nextBtn = findButton('Next')!;

      await act(async () => {
        nextBtn.click();
      });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      expect(container.textContent).toContain('Invalid password');
    });

    it('calls onClose when Cancel is clicked on password step', async () => {
      await renderModal();
      const cancelBtn = Array.from(container.querySelectorAll('button')).find((btn) =>
        btn.textContent.includes('Cancel')
      )!;

      await act(async () => {
        cancelBtn.click();
      });

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('closes modal when clicking outside on password step', async () => {
      await renderModal();
      const overlay = container.querySelector('[class*="overlay"]') as HTMLElement;

      await act(async () => {
        overlay.click();
      });

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Confirmation Step', () => {
    it('shows confirmation message after password verification', async () => {
      await moveToConfirmation();

      expect(container.textContent).toContain('Confirm Account Deletion');
      expect(container.textContent).toContain('Are you sure you want to delete your account?');
    });

    it('shows secondary confirmation buttons', async () => {
      await moveToConfirmation();

      const buttons = container.querySelectorAll('button');
      const textContents = Array.from(buttons).map((btn) => btn.textContent);
      expect(textContents).toContain('Back');
      expect(textContents).toContain('Cancel');
      expect(textContents).toContain('Yes, Delete Account');
    });

    it('calls verify-password, then delete-account when confirmed', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ message: 'Password verified' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ message: 'Account deleted' }),
        });

      await moveToConfirmation();

      const deleteBtn = findButton('Yes, Delete Account')!;

      await act(async () => {
        deleteBtn.click();
      });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenLastCalledWith(
        '/api/delete-account',
        expect.objectContaining({
          method: 'DELETE',
          credentials: 'include',
        })
      );

      expect(mockOnConfirm).toHaveBeenCalled();
    });

    it('allows going back to password step from confirmation', async () => {
      await moveToConfirmation();

      const noBtn = findButton('Back')!;

      await act(async () => {
        noBtn.click();
      });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      expect(container.textContent).toContain('please enter your password for confirmation');
    });

    it('shows error if delete fails', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ message: 'Password verified' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Failed to delete account' }),
        });

      await moveToConfirmation();

      const deleteBtn = findButton('Yes, Delete Account')!;

      await act(async () => {
        deleteBtn.click();
      });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      expect(container.textContent).toContain('Failed to delete account');
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('calls onUnauthorized when password verification returns 401', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Please log in first' }),
      });

      await act(async () => {
        root.render(
          <DeleteAccountModal
            onClose={mockOnClose}
            onConfirm={mockOnConfirm}
            onUnauthorized={mockOnUnauthorized}
          />
        );
      });

      await setPassword('password123');
      await act(async () => {
        findButton('Next')?.click();
      });

      expect(mockOnUnauthorized).toHaveBeenCalled();
    });
  });
});
