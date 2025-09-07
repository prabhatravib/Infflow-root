"use client";

import * as React from "react";

export interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "icon" | "full";
  className?: string;
}

const sizeClasses = {
  sm: {
    icon: "w-6 h-6",
    text: "text-lg",
    container: "gap-1.5"
  },
  md: {
    icon: "w-8 h-8",
    text: "text-xl",
    container: "gap-2"
  },
  lg: {
    icon: "w-12 h-12",
    text: "text-3xl",
    container: "gap-3"
  },
  xl: {
    icon: "w-16 h-16",
    text: "text-7xl",
    container: "gap-3"
  }
};

export default function Logo({
  size = "md",
  variant = "full",
  className = ""
}: LogoProps) {
  const sizes = sizeClasses[size];
  
  const IconComponent = () => <div className={`${sizes.icon} bg-black dark:bg-white rounded-lg flex items-center justify-center`}>
      <svg className="w-3/5 h-3/5 text-white dark:text-black" viewBox="0 0 24 24" fill="currentColor">
        <path d="M2 4h4l2 6 2-6h4l2 6 2-6h4v2h-2.5l-2.5 8h-3l-2-6-2 6h-3l-2.5-8H2V4z" />
      </svg>
    </div>;

  if (variant === "icon") {
    return <IconComponent />;
  }

  return <div className={`flex items-center ${sizes.container} ${className}`}>
      <IconComponent />
      <h1 className={`${sizes.text} font-normal text-gray-900 dark:text-white`} style={{
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
        <span>infflow</span>
      </h1>
    </div>;
}
