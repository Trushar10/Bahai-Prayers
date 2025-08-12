import { useEffect, useState } from 'react';

interface Props {
  className?: string;
}

export default function ThemeToggle({ className }: Props) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('theme') as 'light' | 'dark' | null;
      const systemPref = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      const initial = stored || systemPref;
      setTheme(initial);
      document.documentElement.setAttribute('data-theme', initial);
    } catch {
      // ignore in SSR
    }
  }, []);

  const toggle = () => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem('theme', next);
      } catch {}
      document.documentElement.setAttribute('data-theme', next);
      return next;
    });
  };

  return (
    <button
      className={className || 'theme-toggle-btn'}
      onClick={toggle}
      aria-label="Toggle theme"
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
}
