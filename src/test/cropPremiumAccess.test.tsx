import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
const state = vi.hoisted(() => ({ isPremium: false, loading: false, navigate: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ session: { user: { id: 'crop-user' } } }) }));
vi.mock('@/hooks/useSubscription', () => ({ useSubscription: () => state }));
vi.mock('react-router-dom', () => ({ useNavigate: () => state.navigate }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('react-easy-crop', () => ({ default: () => <div data-testid="crop-editor" /> }));
import CropPhotoDialog from '@/components/capture/CropPhotoDialog';

describe('Premium photo cropping', () => {
  beforeEach(() => { state.isPremium = false; state.loading = false; state.navigate.mockReset(); });
  it('blocks free users from cropping and sends them to Premium', () => {
    const onDone = vi.fn();
    const onCancel = vi.fn();
    render(<CropPhotoDialog photo="photo.jpg" onDone={onDone} onCancel={onCancel} />);
    expect(screen.queryByTestId('crop-editor')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'capture.explorerPhotos.premiumCta' }));
    expect(state.navigate).toHaveBeenCalledWith('/premium');
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onDone).not.toHaveBeenCalled();
  });
  it('allows verified Premium users to open the crop editor', () => {
    state.isPremium = true;
    render(<CropPhotoDialog photo="photo.jpg" onDone={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByTestId('crop-editor')).toBeInTheDocument();
  });
  it('never opens the crop editor while access is being verified', () => {
    state.loading = true;
    render(<CropPhotoDialog photo="photo.jpg" onDone={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.queryByTestId('crop-editor')).toBeNull();
    expect(screen.queryByRole('button', { name: 'capture.explorerPhotos.premiumCta' })).toBeNull();
  });
});