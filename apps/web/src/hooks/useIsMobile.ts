import { Grid } from 'antd';

/** true при ширине экрана < 768px (ниже AntD breakpoint `md`). */
export function useIsMobile(): boolean {
  const screens = Grid.useBreakpoint();
  // `md` становится true при ≥768px; отсутствие → мобильный.
  return screens.md === false;
}
