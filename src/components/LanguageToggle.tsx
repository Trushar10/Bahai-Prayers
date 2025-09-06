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
    <div className="language-selector" ref={menuRef}>
      <button
        type="button"
        aria-label="Select language"
        onClick={() => setOpen((prev) => !prev)}
        className="nav-btn language-btn"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="2" y1="12" x2="22" y2="12"></line>
          <path d="m12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
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
              className={`language-option ${lang.code === currentLang ? 'active' : ''}`}
            >
              {lang.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
