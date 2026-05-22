'use client';

import React from 'react';
import { clsx } from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = ({ className, ...props }: InputProps) => {
  return (
    <input 
      className={clsx(
        'w-full bg-[#FDFCF9] border border-[#E5E1D8] rounded-lg px-3 py-2 focus:border-[#D35400] transition-colors',
        className
      )}
      {...props}
    />
  );
};
