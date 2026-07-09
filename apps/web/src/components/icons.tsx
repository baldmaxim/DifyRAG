/* eslint-disable react-refresh/only-export-components */
/**
 * DKP icon set — компактный собственный набор (stroke 1.8, 16–18px),
 * перенесён из dkp-design-system.html. Рендерятся как <svg currentColor>.
 */
import type { CSSProperties, ReactElement, ReactNode } from 'react';

interface IconProps {
  d: ReactNode;
  size?: number;
  style?: CSSProperties;
  fill?: string;
}

const I = ({ d, size = 16, style, fill }: IconProps): ReactElement => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill ?? 'none'}
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ verticalAlign: '-2.5px', ...style }}
  >
    {d}
  </svg>
);

const P = (dd: string[]): ReactElement[] => dd.map((x, i) => <path key={i} d={x} />);

export const Icons: Record<string, ReactElement> = {
  dashboard: <I d={P(['M3 3h8v10H3z', 'M13 3h8v6h-8z', 'M13 13h8v8h-8z', 'M3 17h8v4H3z'])} />,
  projects: <I d={P(['M3 21h18', 'M5 21V7l7-4 7 4v14', 'M9 21v-6h6v6', 'M9 10h.01', 'M15 10h.01'])} />,
  search: <I d={P(['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'M21 21l-4.3-4.3'])} />,
  docs: <I d={P(['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M9 13h6', 'M9 17h6'])} />,
  depts: <I d={P(['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M23 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'])} />,
  dataset: <I d={P(['M12 8c4.97 0 9-1.34 9-3s-4.03-3-9-3-9 1.34-9 3 4.03 3 9 3z', 'M21 12c0 1.66-4.03 3-9 3s-9-1.34-9-3', 'M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5'])} />,
  plug: <I d={P(['M9 7V2', 'M15 7V2', 'M6 7h12v5a6 6 0 0 1-12 0z', 'M12 18v4'])} />,
  key: <I d={P(['M21 2l-2 2', 'M15.5 8.5L19 5', 'M12.5 11.5L19 5l2 2-2.5 2.5', 'M11 13a5 5 0 1 0-7 7 5 5 0 0 0 7-7z'])} />,
  gear2: <I d={P(['M12 20a8 8 0 1 0 0-16', 'M12 20a8 8 0 0 1 0-16', 'M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z', 'M12 2v2', 'M12 20v2', 'M2 12h2', 'M20 12h2', 'M4.9 4.9l1.4 1.4', 'M17.7 17.7l1.4 1.4', 'M4.9 19.1l1.4-1.4', 'M17.7 6.3l1.4-1.4'])} />,
  audit: <I d={P(['M12 8v4l3 3', 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z'])} />,
  queue: <I d={P(['M4 6h16', 'M4 12h10', 'M4 18h7', 'M19 12l3 3-3 3'])} />,
  palette: <I d={P(['M12 21a9 9 0 1 1 9-9c0 2-1.5 3-3 3h-2a2 2 0 0 0-2 2c0 1 .5 1 .5 2s-1 2-2.5 2z', 'M7.5 11h.01', 'M11 7.5h.01', 'M15.5 9h.01'])} />,
  door: <I d={P(['M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4', 'M10 17l5-5-5-5', 'M15 12H3'])} />,
  sun: <I d={P(['M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z', 'M12 1v2', 'M12 21v2', 'M4.2 4.2l1.4 1.4', 'M18.4 18.4l1.4 1.4', 'M1 12h2', 'M21 12h2', 'M4.2 19.8l1.4-1.4', 'M18.4 5.6l1.4-1.4'])} size={15} />,
  moon: <I d={P(['M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z'])} size={15} />,
  upload: <I d={P(['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M17 8l-5-5-5 5', 'M12 3v12'])} size={15} />,
  download: <I d={P(['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3'])} size={15} />,
  plus: <I d={P(['M12 5v14', 'M5 12h14'])} size={15} />,
  refresh: <I d={P(['M23 4v6h-6', 'M1 20v-6h6', 'M3.5 9a9 9 0 0 1 14.9-3.4L23 10', 'M1 14l4.6 4.4A9 9 0 0 0 20.5 15'])} size={15} />,
  clock: <I d={P(['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 7v5l3 2'])} size={13} />,
  spin: <I d={P(['M21 12a9 9 0 1 1-6.2-8.6'])} size={13} />,
  check: <I d={P(['M20 6L9 17l-5-5'])} size={13} />,
  cross: <I d={P(['M18 6L6 18', 'M6 6l12 12'])} size={13} />,
  warn: <I d={P(['M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z', 'M12 9v4', 'M12 17h.01'])} size={13} />,
  pause: <I d={P(['M10 5v14', 'M15 5v14'])} size={13} />,
  archive: <I d={P(['M21 8v13H3V8', 'M1 3h22v5H1z', 'M10 12h4'])} size={13} />,
  minus: <I d={P(['M5 12h14'])} size={13} />,
  edit: <I d={P(['M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7', 'M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z'])} size={13} />,
  eye: <I d={P(['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'])} size={15} />,
  folder: <I d={P(['M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z'])} size={14} />,
  file: <I d={P(['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6'])} size={14} />,
  bolt: <I d={P(['M13 2L3 14h8l-1 8 10-12h-8z'])} size={13} />,
  copy: <I d={P(['M20 9h-9a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2z', 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'])} size={14} />,
  trash: <I d={P(['M3 6h18', 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2', 'M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6', 'M10 11v6', 'M14 11v6'])} size={14} />,
  restore: <I d={P(['M3 3v6h6', 'M3.5 9a9 9 0 1 0 2.1-3.4L3 9'])} size={14} />,
  cloud: <I d={P(['M18 10h-1.3A7 7 0 1 0 6 17h12a4 4 0 0 0 0-8z'])} size={18} />,
};
