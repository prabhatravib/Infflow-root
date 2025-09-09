"use client";

export interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "icon" | "full";
  className?: string;
  isDark?: boolean;
}

const sizeClasses = {
  sm: {
    icon: "w-16 h-16",
    text: "text-lg",
    container: "gap-1.5"
  },
  md: {
    icon: "w-24 h-24",
    text: "text-xl",
    container: "gap-2"
  },
  lg: {
    icon: "w-32 h-32",
    text: "text-3xl",
    container: "gap-3"
  },
  xl: {
    icon: "w-96 h-96",
    text: "text-5xl",
    container: "gap-3"
  }
};

export default function Logo({
  size = "md",
  variant = "full",
  className = "",
  isDark = false
}: LogoProps) {
  const sizes = sizeClasses[size];
  
  const IconComponent = () => <div className={`${sizes.icon} flex items-center justify-center`}>
      <img 
        src={isDark ? "/infflow_whitefont.webp" : "/infflow-logo.webp"} 
        alt="infflow logo" 
        className="w-full h-full object-contain"
        onLoad={() => console.log('Logo loaded successfully')}
        onError={(e) => {
          console.error('Logo failed to load:', e);
        }}
      />
    </div>;

  if (variant === "icon") {
    return <IconComponent />;
  }

  return <div className={`flex items-center ${sizes.container} ${className}`}>
      <IconComponent />
    </div>;
}
