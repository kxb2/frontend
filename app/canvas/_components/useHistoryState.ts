import { useCallback, useRef, useState } from 'react';

type Updater<T> = T | ((prev: T) => T);

function resolveUpdater<T>(updater: Updater<T>, prev: T): T {
  return typeof updater === 'function' ? (updater as (prev: T) => T)(prev) : updater;
}

// 실행취소/다시실행이 가능한 상태 하나를 관리 (set()은 히스토리에 남기지 않고, commit()은 undo 스택에 이전 상태를 남기는 갱신)
export function useHistoryState<T>(initial: T) {
  const [state, setState] = useState(initial);
  const undoStack = useRef<T[]>([]);
  const redoStack = useRef<T[]>([]);

  const set = useCallback((updater: Updater<T>) => {
    setState((prev) => resolveUpdater(updater, prev));
  }, []);

  const commit = useCallback((updater: Updater<T>) => {
    setState((prev) => {
      undoStack.current.push(prev);
      redoStack.current = [];
      return resolveUpdater(updater, prev);
    });
  }, []);

  const undo = useCallback(() => {
    setState((prev) => {
      const last = undoStack.current.pop();
      if (last === undefined) return prev;
      redoStack.current.push(prev);
      return last;
    });
  }, []);

  const redo = useCallback(() => {
    setState((prev) => {
      const next = redoStack.current.pop();
      if (next === undefined) return prev;
      undoStack.current.push(prev);
      return next;
    });
  }, []);

  return { state, set, commit, undo, redo };
}
