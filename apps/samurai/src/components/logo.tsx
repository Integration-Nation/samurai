'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import Image from 'next/image';

export function Logo() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const logoSrc = resolvedTheme === 'dark'
    ? '/samur-logo-dark.png'
    : '/samur-logo.png';

  return (
    <Image
      src={logoSrc}
      alt="Logo"
      width={48}
      height={48}
      className="size-12"
      priority
    />
  );
}
