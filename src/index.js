import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from 'styled-components';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { RestaurantProvider, useRestaurant } from './restaurant/RestaurantContext';
import { buildTheme } from './restaurant/defaultTheme';

// Resolves the restaurant, then feeds its theme to styled-components' ThemeProvider
// so every component reads colours/fonts from config. A fallback theme covers first
// paint and any missing values.
function Root() {
  const { restaurant, loading, error } = useRestaurant();
  const theme = buildTheme(restaurant?.theme);

  return (
    <ThemeProvider theme={theme}>
      {loading && <CenteredMessage title="Loading…" />}
      {!loading && error && (
        <CenteredMessage
          title="This restaurant isn't available"
          detail={error}
        />
      )}
      {!loading && !error && <App />}
    </ThemeProvider>
  );
}

function CenteredMessage({ title, detail }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        fontFamily: 'system-ui, sans-serif',
        padding: 24,
        textAlign: 'center',
      }}
    >
      <h1 style={{ margin: 0, fontSize: '1.4rem' }}>{title}</h1>
      {detail && <p style={{ margin: 0, color: '#6b6560', maxWidth: 480 }}>{detail}</p>}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <RestaurantProvider>
      <Root />
    </RestaurantProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
