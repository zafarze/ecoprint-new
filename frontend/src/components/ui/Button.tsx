import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: 'primary' | 'danger' | 'outline' | 'ghost';
	isLoading?: boolean;
	icon?: React.ReactNode;
}

export default function Button({
	children,
	variant = 'primary',
	isLoading,
	icon,
	className = '',
	disabled,
	...props
}: ButtonProps) {

	const baseClasses = "relative inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all duration-200 active:scale-95 disabled:opacity-70 disabled:pointer-events-none overflow-hidden";

	const variants = {
		primary: "bg-gradient-eco text-white shadow-md hover:shadow-lg hover:shadow-primary/30",
		danger: "bg-red-500 text-white shadow-md hover:bg-red-600 hover:shadow-red-500/30",
		outline: "border-2 border-slate-200 text-slate-600 hover:border-primary hover:text-primary bg-transparent",
		ghost: "bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800",
	};

	return (
		<button
			className={`${baseClasses} ${variants[variant]} ${className}`}
			disabled={disabled || isLoading}
			{...props}
		>
			{isLoading ? <Loader2 className="animate-spin" size={18} /> : icon}
			<span>{children}</span>
		</button>
	);
}