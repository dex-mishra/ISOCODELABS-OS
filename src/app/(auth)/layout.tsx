'use client';

import React, { useEffect } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';

export default function Layout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 1. Theme Configuration
    const savedTheme = localStorage.getItem('theme') || 'light';
    let isDark = savedTheme === 'dark';
    if (savedTheme === 'system') {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    document.documentElement.classList.toggle('dark', isDark);

    // 2. Accent Color Configuration
    const savedAccent = localStorage.getItem('theme_accent_color') || '#0071e3';
    document.documentElement.style.setProperty('--accent-color', savedAccent);
    let hoverColor = savedAccent;
    if (savedAccent === '#0071e3') hoverColor = '#0077ed';
    else if (savedAccent === '#34c759') hoverColor = '#2ec052';
    else if (savedAccent === '#ff3b30') hoverColor = '#f13328';
    else if (savedAccent === '#ff9500') hoverColor = '#e08300';
    else if (savedAccent === '#af52de') hoverColor = '#9f42ce';
    document.documentElement.style.setProperty('--accent-color-hover', hoverColor);

    // 3. Clear Density Compact class for beautiful spacious auth cards
    document.documentElement.classList.remove('density-compact');
  }, []);

  return <AuthProvider>{children}</AuthProvider>;
}
