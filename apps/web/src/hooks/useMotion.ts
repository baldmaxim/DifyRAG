/**
 * Хелперы для JS-завязанных transitions.dev-паттернов.
 * CSS живёт в src/transitions.css; здесь — только оркестрация (replay через
 * reflow, чтение длительностей из motion-токенов :root).
 */
import { useCallback, useRef } from 'react';

/** Читает миллисекунды из CSS-переменной :root с запасным значением. */
function tokenMs(name: string, fallback: number): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
  const v = Number.parseFloat(raw);
  return Number.isFinite(v) ? v : fallback;
}

/**
 * Shake при ошибке валидации. Элемент должен иметь класс `t-shake`.
 * `trigger()` переигрывает анимацию (remove → reflow → add) и снимает класс.
 */
export function useShake<T extends HTMLElement = HTMLDivElement>(): {
  ref: React.RefObject<T>;
  trigger: () => void;
} {
  const ref = useRef<T>(null);
  const trigger = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove('is-shaking');
    void el.offsetWidth; // force reflow — иначе повторный shake не проигрывается
    el.classList.add('is-shaking');
    const dur = tokenMs('--shake-dur-a', 80) * 2 + tokenMs('--shake-dur-b', 60) * 2;
    window.setTimeout(() => el.classList.remove('is-shaking'), dur + 20);
  }, []);
  return { ref, trigger };
}

/**
 * Success-check после успешного действия. Элемент должен иметь класс
 * `t-success-check` и стартовать с `data-state="out"`.
 * `play()` перезапускает появление (fade + rotate + blur + bob + path-draw).
 */
export function useSuccessCheck<T extends HTMLElement = HTMLSpanElement>(): {
  ref: React.RefObject<T>;
  play: () => void;
} {
  const ref = useRef<T>(null);
  const play = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.setAttribute('data-state', 'out');
    void el.offsetWidth; // force reflow — рестарт keyframes с offset 0
    el.setAttribute('data-state', 'in');
  }, []);
  return { ref, play };
}
