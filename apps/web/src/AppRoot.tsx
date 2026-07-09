import { ConfigProvider, App as AntApp } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { dkpDark, dkpLight } from './dkp-theme';
import { useThemeStore } from './stores/theme.store';

export function AppRoot(): React.ReactElement {
  const mode = useThemeStore((s) => s.mode);

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.colorScheme = mode;
  }, [mode]);

  return (
    <ConfigProvider locale={ruRU} theme={mode === 'dark' ? dkpDark : dkpLight}>
      <AntApp>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  );
}
