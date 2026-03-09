import React from 'react';

// --- ЛЕЙБЛ ---
export const Label = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
	<label className={`block text-xs font-black text-slate-400 uppercase mb-1.5 ml-1 ${className}`}>
		{children}
	</label>
);

// --- ИНПУТ ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { }

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className = '', ...props }, ref) => (
	<input
		ref={ref}
		className={`w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 transition-all focus:outline-none focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 ${className}`}
		{...props}
	/>
));
Input.displayName = 'Input';

// --- СЕЛЕКТ ---
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
	options: { value: string; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ options, className = '', ...props }, ref) => (
	<select
		ref={ref}
		className={`w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 transition-all focus:outline-none focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 appearance-none cursor-pointer ${className}`}
		style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.2em 1.2em' }}
		{...props}
	>
		{options.map((opt) => (
			<option key={opt.value} value={opt.value}>{opt.label}</option>
		))}
	</select>
));
Select.displayName = 'Select';