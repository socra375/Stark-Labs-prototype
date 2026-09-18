import { describe, it, expect } from 'vitest';
import { EventBus } from '../../src/core/EventBus';
import { HistoryManager } from '../../src/editor/HistoryManager';
import type { Command } from '../../src/editor/commands/Command';

function counterCommand(counter: { value: number }, delta: number): Command {
  return {
    execute: () => { counter.value += delta; },
    undo: () => { counter.value -= delta; },
    describe: () => `Add ${delta}`,
  };
}

describe('HistoryManager', () => {
  it('execute() applies the command and pushes it onto the undo stack', () => {
    const history = new HistoryManager(new EventBus(), () => 'p1');
    const counter = { value: 0 };
    history.execute(counterCommand(counter, 5));
    expect(counter.value).toBe(5);
    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(false);
  });

  it('undo() reverses the most recent command and moves it to the redo stack', () => {
    const history = new HistoryManager(new EventBus(), () => 'p1');
    const counter = { value: 0 };
    history.execute(counterCommand(counter, 5));
    history.undo();
    expect(counter.value).toBe(0);
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(true);
  });

  it('redo() re-applies an undone command', () => {
    const history = new HistoryManager(new EventBus(), () => 'p1');
    const counter = { value: 0 };
    history.execute(counterCommand(counter, 5));
    history.undo();
    history.redo();
    expect(counter.value).toBe(5);
    expect(history.canRedo()).toBe(false);
  });

  it('a new execute() after an undo clears the stale redo stack', () => {
    const history = new HistoryManager(new EventBus(), () => 'p1');
    const counter = { value: 0 };
    history.execute(counterCommand(counter, 5));
    history.undo();
    history.execute(counterCommand(counter, 2));
    expect(counter.value).toBe(2);
    expect(history.canRedo()).toBe(false);
  });

  it('record() tracks an already-applied command (e.g. a live gizmo drag) without re-running execute()', () => {
    const history = new HistoryManager(new EventBus(), () => 'p1');
    const counter = { value: 10 }; // already applied live, outside the command
    history.record(counterCommand(counter, 5));
    expect(counter.value).toBe(10); // execute() was never called
    history.undo();
    expect(counter.value).toBe(5); // undo() still runs for real
  });

  it('getLog() accumulates a human-readable, timestamped entry per execute/undo/redo', () => {
    const history = new HistoryManager(new EventBus(), () => 'p1');
    const counter = { value: 0 };
    history.execute(counterCommand(counter, 1));
    history.undo();
    history.redo();
    const descriptions = history.getLog().map((e) => e.description);
    expect(descriptions).toEqual(['Add 1', 'Undo: Add 1', 'Redo: Add 1']);
  });
});
