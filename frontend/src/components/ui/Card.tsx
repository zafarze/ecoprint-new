import React from 'react';

interface CardProps {
	children: React.ReactNode;
	className?: string;
	noPadding?: boolean;
}

export default function Card({ children, className = '', noPadding = false }: CardProps) {
	return (
		<div className={`bg-white rounded-3xl border border-slate-100 shadow-eco-sm ${noPadding ? '' : 'p-6'} ${className}`}>
			{children}
		</div>
	);
}