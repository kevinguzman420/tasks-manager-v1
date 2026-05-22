'use client';

import React from 'react';
import { clsx } from 'clsx';

export const Card = ({ children, className }: { children: React.ReactNode, className?: string }) => {
  return (
    <div className={clsx('bg-white border border-[#E5E1D8] rounded-xl p-6 mb-6', className)}>
      {children}
    </div>
  );
};
