import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameAudio } from '../../src/game/audio';

interface Tone { type: OscillatorType; frequency: number }

const tones: Tone[] = [];

class FakeAudioContext {
  currentTime = 4;
  state: AudioContextState = 'running';
  destination = {} as AudioDestinationNode;

  createOscillator(): OscillatorNode {
    const tone: Tone = { type: 'sine', frequency: 0 };
    tones.push(tone);
    return {
      get type() { return tone.type; },
      set type(value: OscillatorType) { tone.type = value; },
      frequency: {
        setValueAtTime(value: number) { tone.frequency = value; },
        exponentialRampToValueAtTime() {},
      } as unknown as AudioParam,
      connect() { return { connect() { return {} as AudioNode; } } as unknown as AudioNode; },
      start() {},
      stop() {},
    } as unknown as OscillatorNode;
  }

  createGain(): GainNode {
    return {
      gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} } as unknown as AudioParam,
      connect() { return {} as AudioNode; },
    } as unknown as GainNode;
  }

  resume(): Promise<void> { return Promise.resolve(); }
}

describe('game sound', () => {
  afterEach(() => {
    tones.length = 0;
    vi.unstubAllGlobals();
  });

  it('plays capture and collision tones when Sound is on @claim:sound-feedback', () => {
    vi.stubGlobal('AudioContext', FakeAudioContext);
    const audio = new GameAudio(true);

    audio.play('capture');
    audio.play('crash');

    expect(tones).toEqual([
      { type: 'sine', frequency: 520 },
      { type: 'square', frequency: 130 },
    ]);
  });
});
