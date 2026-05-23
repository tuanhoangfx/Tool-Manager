// @ts-nocheck

import React from 'react';
import { SpinnerIcon } from '../Icons';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  isLoading = false, 
  icon, 
  className = '', 
  disabled,
  ...props 
}) => {
  
  const baseStyles = "inline-flex items-center justify-center font-semibold rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const sizeStyles = {
    xs: "px-2.5 py-1.5 text-xs",
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  const variantStyles = {
    primary: "text-white bg-gradient-to-r from-[var(--gradient-from)] to-[var(--gradient-to)] hover:opacity-90 shadow-md hover:shadow-lg focus:ring-[var(--accent-color)] border border-transparent",
    secondary: "text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 shadow-sm",
    danger: "text-white bg-red-600 hover:bg-red-700 focus:ring-red-500 shadow-sm",
    ghost: "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-[var(--accent-color)]",
    outline: "text-[var(--accent-color)] border border-[var(--accent-color)] hover:bg-[var(--accent-color)] hover:text-white bg-transparent"
  };

  return (
    <button 
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <SpinnerIcon className="animate-spin -ml-1 mr-2" size={size === 'xs' ? 12 : 16} />}
      {!isLoading && icon && <span className={`${children ? 'mr-2' : ''}`}>{icon}</span>}
      {children}
    </button>
  );
};

export default Button;
