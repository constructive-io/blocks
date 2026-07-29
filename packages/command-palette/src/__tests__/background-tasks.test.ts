import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBackgroundTasks } from '../background/use-background-tasks';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

describe('useBackgroundTasks', () => {
  describe('dispatch', () => {
    it('creates a running task', () => {
      const { result } = renderHook(() => useBackgroundTasks());

      act(() => {
        result.current.dispatch(
          { id: 'cmd-1', label: 'Test' },
          () => new Promise(() => {}) // never resolves
        );
      });

      expect(result.current.tasks).toHaveLength(1);
      expect(result.current.tasks[0].status).toBe('running');
      expect(result.current.tasks[0].commandId).toBe('cmd-1');
      expect(result.current.tasks[0].label).toBe('Test');
    });

    it('transitions to success on resolve', async () => {
      const { result } = renderHook(() => useBackgroundTasks());

      await act(async () => {
        result.current.dispatch(
          { id: 'cmd-1', label: 'Test' },
          async () => {}
        );
      });

      expect(result.current.tasks[0].status).toBe('success');
      expect(result.current.tasks[0].completedAt).not.toBeNull();
    });

    it('transitions to error on reject', async () => {
      const { result } = renderHook(() => useBackgroundTasks());

      await act(async () => {
        result.current.dispatch(
          { id: 'cmd-1', label: 'Test' },
          async () => {
            throw new Error('fail');
          }
        );
      });

      expect(result.current.tasks[0].status).toBe('error');
      expect(result.current.tasks[0].error?.message).toBe('fail');
    });

    it('wraps non-Error rejections', async () => {
      const { result } = renderHook(() => useBackgroundTasks());

      await act(async () => {
        result.current.dispatch(
          { id: 'cmd-1', label: 'Test' },
          async () => {
            throw 'string error';
          }
        );
      });

      expect(result.current.tasks[0].error?.message).toBe('string error');
    });

    it('passes AbortSignal to the function', async () => {
      const { result } = renderHook(() => useBackgroundTasks());
      let receivedSignal: AbortSignal | undefined;

      act(() => {
        result.current.dispatch(
          { id: 'cmd-1', label: 'Test' },
          async (signal) => {
            receivedSignal = signal;
            await new Promise(() => {}); // never resolves
          }
        );
      });

      expect(receivedSignal).toBeInstanceOf(AbortSignal);
      expect(receivedSignal!.aborted).toBe(false);
    });

    it('supports concurrent tasks with unique IDs', () => {
      const { result } = renderHook(() => useBackgroundTasks());

      act(() => {
        result.current.dispatch(
          { id: 'same-cmd', label: 'Task A' },
          () => new Promise(() => {})
        );
        result.current.dispatch(
          { id: 'same-cmd', label: 'Task B' },
          () => new Promise(() => {})
        );
      });

      expect(result.current.tasks).toHaveLength(2);
      expect(result.current.tasks[0].id).not.toBe(result.current.tasks[1].id);
    });
  });

  describe('cancel', () => {
    it('sets status to cancelled and aborts signal', () => {
      const { result } = renderHook(() => useBackgroundTasks());
      let receivedSignal: AbortSignal | undefined;

      let taskId: string;
      act(() => {
        taskId = result.current.dispatch(
          { id: 'cmd-1', label: 'Test' },
          async (signal) => {
            receivedSignal = signal;
            await new Promise(() => {});
          }
        );
      });

      act(() => {
        result.current.cancel(taskId!);
      });

      expect(result.current.tasks[0].status).toBe('cancelled');
      expect(receivedSignal!.aborted).toBe(true);
    });

    it('ignores cancel on non-running task', async () => {
      const { result } = renderHook(() => useBackgroundTasks());

      let taskId: string;
      await act(async () => {
        taskId = result.current.dispatch(
          { id: 'cmd-1', label: 'Test' },
          async () => {}
        );
      });

      const statusBefore = result.current.tasks[0].status;
      act(() => {
        result.current.cancel(taskId!);
      });
      expect(result.current.tasks[0].status).toBe(statusBefore);
    });
  });

  describe('dismiss', () => {
    it('removes a completed task', async () => {
      const { result } = renderHook(() => useBackgroundTasks({ successDismissMs: 0 }));

      await act(async () => {
        result.current.dispatch(
          { id: 'cmd-1', label: 'Test' },
          async () => {}
        );
      });

      const taskId = result.current.tasks[0].id;
      act(() => {
        result.current.dismiss(taskId);
      });

      expect(result.current.tasks).toHaveLength(0);
    });

    it('does not dismiss a running task', () => {
      const { result } = renderHook(() => useBackgroundTasks());

      let taskId: string;
      act(() => {
        taskId = result.current.dispatch(
          { id: 'cmd-1', label: 'Test' },
          () => new Promise(() => {})
        );
      });

      act(() => {
        result.current.dismiss(taskId!);
      });

      expect(result.current.tasks).toHaveLength(1);
    });
  });

  describe('dismissCompleted', () => {
    it('removes all non-running tasks', async () => {
      const { result } = renderHook(() => useBackgroundTasks({ successDismissMs: 0 }));

      // One completed, one running
      await act(async () => {
        result.current.dispatch(
          { id: 'done', label: 'Done' },
          async () => {}
        );
      });
      act(() => {
        result.current.dispatch(
          { id: 'running', label: 'Running' },
          () => new Promise(() => {})
        );
      });

      expect(result.current.tasks).toHaveLength(2);

      act(() => {
        result.current.dismissCompleted();
      });

      expect(result.current.tasks).toHaveLength(1);
      expect(result.current.tasks[0].status).toBe('running');
    });
  });

  describe('auto-dismiss', () => {
    it('auto-dismisses success tasks after delay', async () => {
      const { result } = renderHook(() =>
        useBackgroundTasks({ successDismissMs: 5000 })
      );

      await act(async () => {
        result.current.dispatch(
          { id: 'cmd-1', label: 'Test' },
          async () => {}
        );
      });

      expect(result.current.tasks).toHaveLength(1);

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.tasks).toHaveLength(0);
    });

    it('auto-dismisses cancelled tasks after delay', () => {
      const { result } = renderHook(() =>
        useBackgroundTasks({ cancelledDismissMs: 3000 })
      );

      let taskId: string;
      act(() => {
        taskId = result.current.dispatch(
          { id: 'cmd-1', label: 'Test' },
          () => new Promise(() => {})
        );
      });

      act(() => {
        result.current.cancel(taskId!);
      });

      expect(result.current.tasks).toHaveLength(1);

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(result.current.tasks).toHaveLength(0);
    });

    it('does not auto-dismiss error tasks', async () => {
      const { result } = renderHook(() => useBackgroundTasks());

      await act(async () => {
        result.current.dispatch(
          { id: 'cmd-1', label: 'Test' },
          async () => {
            throw new Error('fail');
          }
        );
      });

      act(() => {
        vi.advanceTimersByTime(60000);
      });

      expect(result.current.tasks).toHaveLength(1);
      expect(result.current.tasks[0].status).toBe('error');
    });
  });

  describe('onTaskChange callback', () => {
    it('fires on dispatch and completion', async () => {
      const onChange = vi.fn();
      const { result } = renderHook(() =>
        useBackgroundTasks({ onTaskChange: onChange })
      );

      await act(async () => {
        result.current.dispatch(
          { id: 'cmd-1', label: 'Test' },
          async () => {}
        );
      });

      // Called once for running, once for success
      expect(onChange).toHaveBeenCalledTimes(2);
      expect(onChange.mock.calls[0][0].status).toBe('running');
      expect(onChange.mock.calls[1][0].status).toBe('success');
    });

    it('fires on cancel', () => {
      const onChange = vi.fn();
      const { result } = renderHook(() =>
        useBackgroundTasks({ onTaskChange: onChange })
      );

      let taskId: string;
      act(() => {
        taskId = result.current.dispatch(
          { id: 'cmd-1', label: 'Test' },
          () => new Promise(() => {})
        );
      });

      act(() => {
        result.current.cancel(taskId!);
      });

      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(lastCall.status).toBe('cancelled');
    });
  });

  describe('sorting', () => {
    it('shows running tasks first', async () => {
      const { result } = renderHook(() => useBackgroundTasks({ successDismissMs: 0 }));

      // One completed
      await act(async () => {
        result.current.dispatch(
          { id: 'done', label: 'Done' },
          async () => {}
        );
      });

      // One running
      act(() => {
        result.current.dispatch(
          { id: 'active', label: 'Active' },
          () => new Promise(() => {})
        );
      });

      expect(result.current.tasks[0].status).toBe('running');
      expect(result.current.tasks[1].status).toBe('success');
    });
  });
});
