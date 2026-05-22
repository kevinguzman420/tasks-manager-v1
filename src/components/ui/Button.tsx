'use client';

import React from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className, 
  ...props 
}: ButtonProps) => {
  const variants = {
    primary: 'bg-[#2C2C2C] text-white hover:bg-black',
    secondary: 'bg-[#D35400] text-white hover:bg-[#A04000]',
    outline: 'border border-[#E5E1D8] text-[#2C2C2C] hover:bg-[#FDFCF9]',
    ghost: 'text-[#2C2C2C] hover:bg-[#F5F5F5]',
    danger: 'bg-[#C0392B] text-white hover:bg-[#922B21]',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button 
      className={clsx(
        'inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:opacity-50',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};
