import React, { useState, useEffect } from 'react';
import { Save, Package } from 'lucide-react';
import BaseModal from '../components/ui/BaseModal';
import Button from '../components/ui/Button';
import { Input, Label, Select } from '../components/ui/Form';

interface ProductModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSave: (productData: any) => void;
	initialData?: any;
}

export default function ProductModal({ isOpen, onClose, onSave, initialData }: ProductModalProps) {
	const [name, setName] = useState('');
	const [category, setCategory] = useState('polygraphy');
	const [icon, setIcon] = useState('fas fa-box');

	useEffect(() => {
		if (initialData) {
			setName(initialData.name);
			setCategory(initialData.category);
			setIcon(initialData.icon || '');
		} else {
			setName('');
			setCategory('polygraphy');
			setIcon('fas fa-box');
		}
	}, [initialData, isOpen]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSave({ name, category, icon });
	};

	return (
		<BaseModal
			isOpen={isOpen}
			onClose={onClose}
			title={initialData ? 'Редактировать товар' : 'Новый товар'}
			maxWidth="max-w-md"
		>
			<form onSubmit={handleSubmit} className="space-y-6">

				{/* Индикатор текущего действия */}
				<div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl mb-2">
					<div className="w-10 h-10 rounded-xl bg-gradient-eco text-white flex items-center justify-center shadow-md">
						<Package size={20} />
					</div>
					<div>
						<p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Карточка товара</p>
						<p className="text-sm font-black text-slate-700">
							{initialData ? 'Изменение данных' : 'Добавление в базу'}
						</p>
					</div>
				</div>

				<div className="space-y-4">
					<div>
						<Label>Название товара *</Label>
						<Input
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Например: Визитки 4+4"
							required
						/>
					</div>

					<div>
						<Label>Категория *</Label>
						<Select
							value={category}
							onChange={(e) => setCategory(e.target.value)}
							options={[
								{ value: 'polygraphy', label: 'Полиграфия' },
								{ value: 'packaging', label: 'Упаковка' },
								{ value: 'souvenirs', label: 'Сувениры' },
								{ value: 'large-format', label: 'Широкоформатная печать' },
							]}
						/>
					</div>

					<div>
						<Label>Иконка (FontAwesome)</Label>
						<Input
							value={icon}
							onChange={(e) => setIcon(e.target.value)}
							placeholder="Например: fas fa-print"
						/>
						<p className="text-xs font-bold text-slate-400 mt-2 flex items-center gap-2">
							Превью иконки:
							<span className="w-6 h-6 flex items-center justify-center bg-slate-100 rounded text-slate-700">
								<i className={icon}></i>
							</span>
						</p>
					</div>
				</div>

				<div className="pt-4 flex gap-3">
					<Button type="button" variant="ghost" onClick={onClose} className="w-full">
						Отмена
					</Button>
					<Button type="submit" variant="primary" icon={<Save size={18} />} className="w-full">
						Сохранить
					</Button>
				</div>
			</form>
		</BaseModal>
	);
}