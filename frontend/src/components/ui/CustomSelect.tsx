// src/components/ui/CustomSelect.tsx
import React, {
	useCallback,
	useEffect,
	useId,
	useLayoutEffect,
	useRef,
	useState,
} from 'react';
import ReactDOM from 'react-dom';

export interface CustomSelectOption {
	value: string;
	label: string;
}

export interface CustomSelectProps {
	value: string;
	onChange: (value: string) => void;
	options: CustomSelectOption[];
	placeholder?: string;
	disabled?: boolean;
	className?: string;
	id?: string;
}

export default function CustomSelect({
	value,
	onChange,
	options,
	placeholder = '— Выберите —',
	disabled = false,
	className,
	id,
}: CustomSelectProps) {
	const uid = useId();
	const panelId = `cs-panel-${uid}`;

	const [open, setOpen] = useState(false);

	// -1 means no match (nothing highlighted); never default to index 0 on no-match
	const initialIndex = options.findIndex(o => o.value === String(value));
	const [activeIndex, setActiveIndex] = useState(initialIndex);

	const triggerRef = useRef<HTMLButtonElement>(null);
	const panelRef = useRef<HTMLUListElement>(null);

	// Panel position state
	const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});

	// Reset activeIndex when value or options change (while closed)
	useEffect(() => {
		if (!open) {
			const idx = options.findIndex(o => o.value === String(value));
			// Keep -1 when there is no match — do NOT fall back to 0
			setActiveIndex(idx);
		}
	}, [value, options, open]);

	const computePosition = useCallback(() => {
		if (!triggerRef.current) return;
		const rect = triggerRef.current.getBoundingClientRect();
		const estimatedPanelHeight = 280;
		const spaceBelow = window.innerHeight - rect.bottom;
		const flipUp = spaceBelow < estimatedPanelHeight + 4 && rect.top > estimatedPanelHeight + 4;

		setPanelStyle({
			position: 'fixed',
			left: rect.left,
			width: rect.width,
			zIndex: 1100,
			...(flipUp
				? { top: rect.top - estimatedPanelHeight - 4 }
				: { top: rect.bottom + 4 }),
		});
	}, []);

	// FIX 5: useLayoutEffect so position is computed before first paint (no flash at 0,0)
	// FIX 1: keydown listener uses capture phase + stopImmediatePropagation so modal
	//         bubble-phase document listeners never see the Escape when panel is open
	// FIX 7: pass computePosition directly (stable ref via useCallback)
	useLayoutEffect(() => {
		if (!open) return;

		computePosition();

		document.addEventListener('scroll', computePosition, { capture: true, passive: true });
		window.addEventListener('resize', computePosition);

		const handleMouseDown = (e: MouseEvent) => {
			const target = e.target as Node;
			if (
				triggerRef.current && !triggerRef.current.contains(target) &&
				panelRef.current && !panelRef.current.contains(target)
			) {
				setOpen(false);
			}
		};
		document.addEventListener('mousedown', handleMouseDown);

		// Capture phase: runs before any bubble-phase document listener (e.g. modal's onKey).
		// stopImmediatePropagation prevents sibling capture listeners AND all bubble listeners.
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.stopImmediatePropagation();
				e.preventDefault();
				setOpen(false);
				triggerRef.current?.focus();
			}
		};
		document.addEventListener('keydown', handleKeyDown, { capture: true });

		return () => {
			document.removeEventListener('scroll', computePosition, { capture: true });
			window.removeEventListener('resize', computePosition);
			document.removeEventListener('mousedown', handleMouseDown);
			document.removeEventListener('keydown', handleKeyDown, { capture: true });
		};
	}, [open, computePosition]);

	// Scroll active option into view inside panel
	useEffect(() => {
		if (!open || !panelRef.current || activeIndex < 0) return;
		const el = panelRef.current.querySelector<HTMLElement>(
			`#${CSS.escape(`${panelId}-opt-${activeIndex}`)}`,
		);
		el?.scrollIntoView({ block: 'nearest' });
	}, [activeIndex, open, panelId]);

	function selectOption(index: number) {
		onChange(options[index].value);
		setOpen(false);
		triggerRef.current?.focus();
	}

	function handleTriggerKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
		if (disabled) return;

		if (!open) {
			if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
				e.preventDefault();
				// FIX 2: when opening via arrow key with no match, start nav from a sensible index
				if (e.key === 'ArrowDown') {
					setActiveIndex(prev => prev < 0 ? 0 : Math.min(prev + 1, options.length - 1));
				} else if (e.key === 'ArrowUp') {
					setActiveIndex(prev => prev < 0 ? options.length - 1 : Math.max(prev - 1, 0));
				}
				setOpen(true);
			}
			return;
		}

		// Panel is open
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setActiveIndex(prev => prev < 0 ? 0 : Math.min(prev + 1, options.length - 1));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setActiveIndex(prev => prev < 0 ? options.length - 1 : Math.max(prev - 1, 0));
				break;
			case 'Home':
				e.preventDefault();
				setActiveIndex(0);
				break;
			case 'End':
				e.preventDefault();
				setActiveIndex(options.length - 1);
				break;
			case 'Enter':
			case ' ':
				e.preventDefault();
				// FIX 2: guard — do nothing when activeIndex is -1 (no item highlighted)
				if (activeIndex >= 0 && options[activeIndex]) selectOption(activeIndex);
				break;
			case 'Escape':
				// Handled by capture-phase document listener; this synthetic path is a fallback
				e.preventDefault();
				e.stopPropagation();
				setOpen(false);
				triggerRef.current?.focus();
				break;
			case 'Tab':
				setOpen(false);
				break;
		}
	}

	function handleTriggerClick() {
		if (disabled) return;
		if (!open) {
			const idx = options.findIndex(o => o.value === String(value));
			// FIX 2: keep -1 on no-match
			setActiveIndex(idx);
		}
		setOpen(prev => !prev);
	}

	const selectedLabel =
		options.find(o => o.value === String(value))?.label ?? placeholder;

	const triggerClasses = [
		'custom-select-trigger',
		open ? 'is-open' : '',
		disabled ? 'is-disabled' : '',
		className ?? '',
	]
		.filter(Boolean)
		.join(' ');

	// FIX 2: undefined when activeIndex is -1 or out of bounds
	const activeOptId =
		activeIndex >= 0 && options[activeIndex]
			? `${panelId}-opt-${activeIndex}`
			: undefined;

	const panel = (
		// FIX 7: removed no-op onMouseLeave handler
		// FIX 4: aria-activedescendant removed from here (moved to trigger button below)
		<ul
			ref={panelRef}
			role="listbox"
			id={panelId}
			className="custom-select-panel"
			style={panelStyle}
		>
			{options.map((opt, index) => {
				const isSelected = opt.value === String(value);
				const isActive = index === activeIndex;
				const liClasses = [
					'custom-select-option',
					isActive ? 'is-active' : '',
					isSelected ? 'is-selected' : '',
				]
					.filter(Boolean)
					.join(' ');

				return (
					<li
						key={opt.value}
						id={`${panelId}-opt-${index}`}
						role="option"
						aria-selected={isSelected}
						className={liClasses}
						onMouseDown={e => {
							// mousedown fires before blur — prevent blur from closing first
							e.preventDefault();
							selectOption(index);
						}}
						onMouseEnter={() => setActiveIndex(index)}
					>
						{opt.label}
					</li>
				);
			})}
		</ul>
	);

	return (
		<div style={{ position: 'relative', width: '100%' }}>
			{/* FIX 3: removed dead hidden <input required> block — native validation never
			    fires because all modal save buttons use type="button" with onClick */}

			{/* FIX 4: aria-activedescendant on the focused trigger (not the listbox) */}
			<button
				ref={triggerRef}
				type="button"
				id={id}
				className={triggerClasses}
				onClick={handleTriggerClick}
				onKeyDown={handleTriggerKeyDown}
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-controls={panelId}
				aria-activedescendant={activeOptId}
				aria-disabled={disabled || undefined}
				disabled={disabled}
			>
				<span>{selectedLabel}</span>
				<i className="fas fa-chevron-down" aria-hidden="true" />
			</button>

			{open && ReactDOM.createPortal(panel, document.body)}
		</div>
	);
}
