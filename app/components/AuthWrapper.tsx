"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const existing = localStorage.getItem('craps-character');
    if (!existing && pathname !== '/create-character') {
      sessionStorage.setItem('craps-redirect-url', window.location.href);
      router.push('/create-character');
    } else {
      setIsReady(true);
    }
  }, [pathname, router]);

  // Hide the content initially to prevent a flash of the home/table page before redirecting
  return (
    <div style={{ visibility: isReady ? 'visible' : 'hidden', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {children}
    </div>
  );
}
