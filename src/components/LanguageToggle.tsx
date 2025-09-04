import React, { useState, useRef, useEffect } from 'react';

interface Language {
  code: string;
  name: string;
}

interface Props {
  languages: Language[];
  currentLang: string;
  onChange: (lang: string) => void;
}

export default function LanguageToggle({ languages = [], currentLang, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <div className="language-toggle-container" ref={menuRef}>
      <button
        type="button"
        aria-label="Select language"
        onClick={() => setOpen((prev) => !prev)}
        className="language-toggle-button"
      >
        {/* Language SVG icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          version="1.2"
          viewBox="0 0 600 600"
          width="25"
          height="25"
          fill="currentColor"
        >
          <path d="m119.2 167c-8.8 0-11.6-1.2-10-5.3l41-103.4h2.4l37.4 108.8zm-43.3 81.5l22.1-57.9c2-5.2 4.4-6.8 14-6.8l84.4 0.1 23.1 67.6c4.7 13.9-10.6 15.1-29.6 16.4-2.4 2.4-2.4 10.8 0 13.2 14.8-0.4 36.8-0.7 52.4-0.7 16.4 0 31.6 0.4 45.6 0.8 2.4-2.4 2.4-10.8 0-13.2-15.5-1.4-29-2.7-36-22l-82.1-228.9c-6 3.6-16.8 8-22 7.9l-91.1 214.3c-10.4 24.8-22.6 27.2-40 28.4-2.4 2.4-2.4 10.8 0 13.2 10.4-0.4 23.4-0.8 35.6-0.8 16.4 0 36.4 0.5 51.2 0.9 2.4-2.4 2.4-10.8 0-13.2-15.1-1.1-33.8-2.8-27.6-19.3z"/>
          <path d="m430.2 353.1l-10.9-19.6-125.4 1.8 0.1 5.4 10.5 19.2 53.6-0.8 1.3 90.4c-10.9 7.8-23.4 14.1-40.8 14.3-18.3 0.3-39.3-7-52.3-13.3 15.4-13.1 22.4-30.7 22.1-46.3-0.5-36.8-41.7-74.3-73.3-74.6-13.6 0.2-44.6 14-58.1 24.1l15.6 28.6c15-13.1 34.2-25.2 54.3-25.5 18.7-0.2 38.3 15.8 38.9 33.7 0.7 18.2-9.1 28.6-21.1 36-13.6 8.2-35.2 10.8-49.3 12.1l-3.3 8.4 12.1 21.1c16-1.7 29.6-4.2 46.3-9.4 13.4 10.9 21.6 27.5 21.9 43 0.3 23.6-18 42.5-44.6 42.9-36.1 0.5-70.9-38.5-89.6-69.4l-12 8.1c17.9 32.1 53.7 88.9 114.5 88.1 35.3-0.6 58.9-23.7 58.4-57.5-0.2-15.6-4.9-28.4-12.7-39.7l1.5-0.8c12.3 8.5 27.2 16.3 45.5 16 11-0.1 19.7-3.3 26.1-7.2h0.4l1.4 96.1 24.1 13 5.7-0.1-3.4-232.5 42.6-0.6z"/>
          <path d="m267.1 88.6l319.6-0.2v24.8l-36.7 0.1 0.1 192.8h-27q-10.1-20.6-25.2-36-15-15.8-32.2-26.9l8.7-23.1q13.3 7.6 27.7 20.9 14.4 13.3 22.1 27-0.4-5.3-0.7-9.8 0-4.6-0.4-9.5 0-4.9 0-10.5l-0.1-124.9-255.8 0.1zm135.2 185.8q-23.8 0-45.5-11.2-21.7-11.2-41-37.7-18.9-27-35-73.9l25.5-8.4q12.6 36.4 26.3 59.8 14 23.1 31.2 34 17.1 10.8 39.2 10.8 19.2 0 30.8-6 11.9-6.3 17.1-16.8 5.2-10.8 5.2-23.8 0-20.3-11.2-32.9-10.8-12.6-27.3-12.6-11.5 0-17.5 5.3-5.9 4.9-5.9 15.1 0 2.4 0.7 6.6 0.7 4.2 2.1 7.7l-26.6 5.3q-2.5-7.4-3.9-13.3-1-6.3-1-11.9 0-13 6.9-21.7 7.4-8.8 18.6-13 11.5-4.5 24.1-4.6 20.7 0 35.7 9.5 15.1 9.1 23.5 25.2 8.4 16 8.4 37.4 0 18.9-8.7 35.4-8.7 16.1-26.6 25.9-17.8 9.8-45.1 9.8zm16.3-132l-27.6 1.1q-1.8-11.2-10.5-19.6-8.4-8.7-24.9-12.2l8.4-15.8 15.8 4.2q19.9 7.7 28.7 17.5 8.7 9.8 10.1 24.8z"/>
        </svg>
      </button>
      {open && (
        <div className="language-menu">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                onChange(lang.code);
                setOpen(false);
              }}
              className={`language-menu-item ${lang.code === currentLang ? 'active' : ''}`}
            >
              {lang.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
