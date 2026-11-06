import type { Order } from '@bigger/shared';
import { act, renderHook, screen, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { buildOrder } from '../../../test/builders';
import { SoundToggle } from '../components/SoundToggle';
import type { ChimePlayer } from './chime-player';
import { useKitchenSound } from './useKitchenSound';
import { useNewOrderAlerts } from './useNewOrderAlerts';

function fakePlayer() {
  const play = vi.fn(() => Promise.resolve());
  return { player: { play } satisfies ChimePlayer, play };
}

afterEach(() => {
  window.localStorage.clear();
});

describe('useNewOrderAlerts', () => {
  function setup(initial: readonly Order[] | undefined, soundOn: boolean) {
    const { player, play } = fakePlayer();
    const onNewOrders = vi.fn();
    const view = renderHook(
      ({ orders, sound }: { orders: readonly Order[] | undefined; sound: boolean }) => {
        useNewOrderAlerts({ orders, soundOn: sound, player, onNewOrders });
      },
      { initialProps: { orders: initial, sound: soundOn } },
    );
    return { ...view, play, onNewOrders };
  }

  it('stays quiet for what is already on screen when it loads', () => {
    const { play, onNewOrders, rerender } = setup(undefined, true);
    rerender({ orders: [buildOrder(), buildOrder()], sound: true });
    expect(play).not.toHaveBeenCalled();
    expect(onNewOrders).not.toHaveBeenCalled();
  });

  it('chimes once for a batch of new orders and announces them', () => {
    const existing = buildOrder();
    const { play, onNewOrders, rerender } = setup([existing], true);
    const first = buildOrder({ tableLabel: 'Mesa 3' });
    const second = buildOrder({ tableLabel: 'Mesa 4' });

    rerender({ orders: [existing, first, second], sound: true });
    expect(play).toHaveBeenCalledOnce();
    expect(onNewOrders).toHaveBeenCalledWith([first, second]);

    rerender({ orders: [existing, first, second], sound: true });
    expect(play).toHaveBeenCalledOnce();
  });

  it('still announces but does not play while the sound is off', () => {
    const { play, onNewOrders, rerender } = setup([], false);
    rerender({ orders: [buildOrder()], sound: false });
    expect(onNewOrders).toHaveBeenCalledOnce();
    expect(play).not.toHaveBeenCalled();
  });

  it('does not chime when an order only changes stage', () => {
    const order = buildOrder();
    const { play, rerender } = setup([order], true);
    rerender({ orders: [{ ...order, status: 'preparing' }], sound: true });
    expect(play).not.toHaveBeenCalled();
  });
});

describe('useKitchenSound', () => {
  it('starts off, plays a sample when turned on and remembers the choice on this device', () => {
    const { player, play } = fakePlayer();
    const { result, unmount } = renderHook(() => useKitchenSound(() => player));
    expect(result.current.soundOn).toBe(false);

    act(() => {
      result.current.toggle();
    });
    expect(play).toHaveBeenCalledOnce();
    expect(result.current.soundOn).toBe(true);
    unmount();

    const again = renderHook(() => useKitchenSound(() => player));
    expect(again.result.current.soundOn).toBe(true);

    act(() => {
      again.result.current.toggle();
    });
    expect(play).toHaveBeenCalledOnce();
    expect(again.result.current.soundOn).toBe(false);
  });

  it('keeps working when the browser refuses to store the choice', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { player } = fakePlayer();
    const { result } = renderHook(() => useKitchenSound(() => player));
    act(() => {
      result.current.toggle();
    });
    expect(result.current.soundOn).toBe(true);
    vi.restoreAllMocks();
  });
});

describe('SoundToggle', () => {
  it('says its state in words and in aria-pressed', async () => {
    const onToggle = vi.fn();
    const { rerender } = render(<SoundToggle soundOn={false} onToggle={onToggle} />);
    const button = screen.getByRole('button', { name: 'Sonido apagado' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(button);
    expect(onToggle).toHaveBeenCalledOnce();

    rerender(<SoundToggle soundOn onToggle={onToggle} />);
    expect(screen.getByRole('button', { name: 'Sonido activado' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
