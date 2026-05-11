import Image from 'next/image';

import iconDark from '@/app/assets/logo/icon-dark.png';
import iconLight from '@/app/assets/logo/icon-light.png';
import wordmarkDark from '@/app/assets/logo/logo-text-dark.png';
import wordmarkLight from '@/app/assets/logo/logo-text-light.png';
import { cn } from '@/lib/utils';

type Variant = 'icon' | 'wordmark';

interface LogoProps {
  variant?: Variant;
  className?: string;
  priority?: boolean;
}

const SOURCES = {
  icon: { light: iconLight, dark: iconDark, alt: 'PandaPay' },
  wordmark: { light: wordmarkLight, dark: wordmarkDark, alt: 'PandaPay' },
} satisfies Record<Variant, { light: typeof iconLight; dark: typeof iconLight; alt: string }>;

export function Logo({
  variant = 'wordmark',
  className,
  priority,
}: Readonly<LogoProps>) {
  const { light, dark, alt } = SOURCES[variant];
  return (
    <>
      <Image
        src={light}
        alt={alt}
        priority={priority}
        className={cn('block w-auto dark:hidden', className)}
      />
      <Image
        src={dark}
        alt=""
        aria-hidden
        priority={priority}
        className={cn('hidden w-auto dark:block', className)}
      />
    </>
  );
}
