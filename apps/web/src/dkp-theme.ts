/**
 * DKP — Ant Design 5 theme tokens (light + dark)
 * Drop-in usage in apps/web/src/main.tsx:
 *
 *   import { ConfigProvider, theme as antdTheme } from 'antd';
 *   import { dkpLight, dkpDark } from './dkp-theme';
 *   <ConfigProvider theme={isDark ? dkpDark : dkpLight} locale={ruRU}> ... </ConfigProvider>
 *
 * Fonts (index.html or CSS import), both with full Cyrillic coverage:
 *   Inter 400/500/600/700  +  IBM Plex Mono 400/500
 * Add globally:  .num, table cells with numbers → font-variant-numeric: tabular-nums;
 */
import { theme as antdTheme, type ThemeConfig } from 'antd';

const FONT = "'Inter', -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
const FONT_MONO = "'IBM Plex Mono', 'SFMono-Regular', Consolas, monospace";

/** Shared scale: type 12/14/16/20/24/30, spacing on a 4px base, radius 4/6/10 */
const shared = {
  fontFamily: FONT,
  fontFamilyCode: FONT_MONO,
  fontSize: 14, fontSizeSM: 12, fontSizeLG: 16,
  fontSizeHeading1: 30, fontSizeHeading2: 24, fontSizeHeading3: 20,
  fontSizeHeading4: 16, fontSizeHeading5: 14,
  fontWeightStrong: 600,
  borderRadius: 6, borderRadiusLG: 10, borderRadiusSM: 4,
  controlHeight: 34, controlHeightSM: 26, controlHeightLG: 40,
  padding: 16, paddingLG: 24, paddingSM: 12, paddingXS: 8,
  margin: 16, marginLG: 24,
  motionDurationFast: '0.1s', motionDurationMid: '0.16s', motionDurationSlow: '0.24s',
  wireframe: false,
} as const;

export const dkpLight: ThemeConfig = {
  algorithm: antdTheme.defaultAlgorithm,
  token: {
    ...shared,
    // Engineering geekblue primary — reads "system of record", distinct from stock #1677ff
    colorPrimary: '#2F54EB', colorInfo: '#2F54EB',
    colorSuccess: '#3F8600', colorWarning: '#D48806', colorError: '#CF1322',
    colorTextBase: '#1B2430',
    colorText: '#1B2430', colorTextSecondary: '#5A6675',
    colorTextTertiary: '#8593A6', colorTextQuaternary: '#AEB9C9',
    colorBgLayout: '#F2F4F8', colorBgContainer: '#FFFFFF', colorBgElevated: '#FFFFFF',
    colorBorder: '#D9DFE9', colorBorderSecondary: '#E8ECF3',
    colorFillSecondary: '#EEF1F6', colorFillTertiary: '#F4F6FA', colorFillQuaternary: '#F8FAFC',
    boxShadow: '0 1px 2px rgba(27,36,48,.05), 0 2px 8px rgba(27,36,48,.06)',
    boxShadowSecondary:
      '0 6px 16px rgba(27,36,48,.08), 0 3px 6px -4px rgba(27,36,48,.12), 0 9px 28px 8px rgba(27,36,48,.05)',
  },
  components: {
    Layout: { siderBg: '#131A26', headerBg: '#FFFFFF', headerHeight: 56, headerPadding: '0 24px', bodyBg: '#F2F4F8', triggerBg: '#0E141E' },
    Menu: {
      darkItemBg: '#131A26', darkSubMenuItemBg: '#0E141E',
      darkItemColor: '#93A1B8', darkItemHoverColor: '#DCE4F2', darkItemHoverBg: 'rgba(255,255,255,0.05)',
      darkItemSelectedBg: 'rgba(84,116,255,0.18)', darkItemSelectedColor: '#A7BCFF',
      itemHeight: 40, itemMarginInline: 8, itemBorderRadius: 6, iconMarginInlineEnd: 12,
    },
    Table: {
      headerBg: '#F6F8FB', headerColor: '#5A6675', headerSplitColor: 'transparent',
      cellPaddingBlock: 11, cellPaddingInline: 12, rowHoverBg: '#F4F7FE',
      headerBorderRadius: 8, fontSize: 13.5,
    },
    Card: { headerFontSize: 15, paddingLG: 20 },
    Tag: { fontSizeSM: 12, defaultBg: '#F0F2F7' },
    Drawer: { paddingLG: 24 },
    Tree: { titleHeight: 30, indentSize: 18, nodeSelectedBg: 'rgba(47,84,235,.09)', directoryNodeSelectedBg: 'rgba(47,84,235,.09)' },
    Statistic: { contentFontSize: 26, titleFontSize: 12.5 },
    Collapse: { headerBg: '#F6F8FB' },
    Alert: { fontSize: 13 },
    Form: { labelFontSize: 13, verticalLabelPadding: '0 0 6px' },
    Breadcrumb: { fontSize: 13 },
  },
};

export const dkpDark: ThemeConfig = {
  algorithm: antdTheme.darkAlgorithm,
  token: {
    ...shared,
    // Primary lifted for contrast on dark surfaces (AA on #161D28)
    colorPrimary: '#6E8DFF', colorInfo: '#6E8DFF',
    colorSuccess: '#67B33E', colorWarning: '#E0A431', colorError: '#E5534B',
    colorTextBase: '#E7ECF4',
    colorText: '#E7ECF4', colorTextSecondary: '#9AA6B8',
    colorTextTertiary: '#77839A', colorTextQuaternary: '#5A6579',
    colorBgLayout: '#0F141C', colorBgContainer: '#161D28', colorBgElevated: '#1C2432',
    colorBorder: '#2C3543', colorBorderSecondary: '#232B39',
    colorFillSecondary: 'rgba(148,163,190,.12)', colorFillTertiary: 'rgba(148,163,190,.08)', colorFillQuaternary: 'rgba(148,163,190,.05)',
    boxShadow: '0 1px 2px rgba(0,0,0,.35), 0 2px 8px rgba(0,0,0,.3)',
    boxShadowSecondary:
      '0 6px 16px rgba(0,0,0,.45), 0 3px 6px -4px rgba(0,0,0,.5), 0 9px 28px 8px rgba(0,0,0,.3)',
  },
  components: {
    Layout: { siderBg: '#0C1118', headerBg: '#161D28', headerHeight: 56, headerPadding: '0 24px', bodyBg: '#0F141C', triggerBg: '#080C12' },
    Menu: {
      darkItemBg: '#0C1118', darkSubMenuItemBg: '#080C12',
      darkItemColor: '#8B98AE', darkItemHoverColor: '#DCE4F2', darkItemHoverBg: 'rgba(255,255,255,0.05)',
      darkItemSelectedBg: 'rgba(110,141,255,0.16)', darkItemSelectedColor: '#A9BDFF',
      itemHeight: 40, itemMarginInline: 8, itemBorderRadius: 6, iconMarginInlineEnd: 12,
    },
    Table: {
      headerBg: '#1B2330', headerColor: '#9AA6B8', headerSplitColor: 'transparent',
      cellPaddingBlock: 11, cellPaddingInline: 12, rowHoverBg: 'rgba(110,141,255,.07)',
      headerBorderRadius: 8, fontSize: 13.5,
    },
    Card: { headerFontSize: 15, paddingLG: 20 },
    Tag: { fontSizeSM: 12 },
    Drawer: { paddingLG: 24 },
    Tree: { titleHeight: 30, indentSize: 18, nodeSelectedBg: 'rgba(110,141,255,.14)', directoryNodeSelectedBg: 'rgba(110,141,255,.14)' },
    Statistic: { contentFontSize: 26, titleFontSize: 12.5 },
    Collapse: { headerBg: '#1B2330' },
    Alert: { fontSize: 13 },
    Form: { labelFontSize: 13, verticalLabelPadding: '0 0 6px' },
    Breadcrumb: { fontSize: 13 },
  },
};

/**
 * Semantic status language — one map reused everywhere.
 * Render as <Tag color={...} icon={...}>: color never carries meaning alone,
 * every status pairs color + icon + Russian label (color-blind safe, AA in both themes).
 */
export const DKP_STATUS = {
  // Document / Dify pipeline
  queued:    { label: 'В очереди',    color: 'default'  },
  uploading: { label: 'Загрузка',     color: 'geekblue', live: true },
  waiting:   { label: 'Ожидание',     color: 'geekblue' },
  parsing:   { label: 'Парсинг',      color: 'blue',     live: true },
  cleaning:  { label: 'Очистка',      color: 'blue',     live: true },
  splitting: { label: 'Разбиение',    color: 'blue',     live: true },
  indexing:  { label: 'Индексация',   color: 'cyan',     live: true },
  completed: { label: 'Завершено',    color: 'green'    },
  error:     { label: 'Ошибка',       color: 'red'      },
  archived:  { label: 'В архиве',     color: 'default'  },
  disabled:  { label: 'Отключено',    color: 'default'  },
  // Portal-side document states
  draft:     { label: 'Черновик',     color: 'default'  },
  active:    { label: 'Активен',      color: 'green'    },
  stored:    { label: 'В хранилище',  color: 'purple'   },
  processing:{ label: 'Обработка',    color: 'processing', live: true },
  indexed:   { label: 'Индексирован', color: 'green'    },
  deleted:   { label: 'Удалён',       color: 'volcano'  },
  // Processing jobs
  running:   { label: 'Выполняется',  color: 'blue',     live: true },
  success:   { label: 'Успешно',      color: 'green'    },
  failed:    { label: 'Сбой',         color: 'red'      },
  skipped:   { label: 'Пропущено',    color: 'orange'   },
  // Integration health
  ok:              { label: 'Работает',          color: 'green'  },
  degraded:        { label: 'Деградация',        color: 'gold'   },
  down:            { label: 'Недоступно',        color: 'red'    },
  setup_required:  { label: 'Требует настройки', color: 'purple' },
} as const;
