'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { CheckIcon, ChevronDown, SearchIcon, XCircle, XIcon } from 'lucide-react';

import { cn } from '../lib/utils';
import { Badge } from './badge';
import { Input } from './input';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Separator } from './separator';

/**
 * Variants for the multi-select component to handle different styles.
 * Uses class-variance-authority (cva) to define different styles based on "variant" prop.
 */
const multiSelectVariants = cva('m-0.5 inline-flex items-center gap-0.5 rounded-full border px-2 py-1 text-xs', {
	variants: {
		variant: {
			default: 'border-foreground/10 text-foreground bg-card',
			secondary: 'border-foreground/10 bg-secondary text-secondary-foreground',
			destructive: 'border-transparent bg-destructive text-destructive-foreground',
			inverted: 'inverted',
		},
	},
	defaultVariants: {
		variant: 'default',
	},
});

/**
 * Option interface for MultiSelect component
 */
interface MultiSelectOption {
	/** The text to display for the option. */
	label: string;
	/** The unique value associated with the option. */
	value: string;
	/** Optional description shown in dropdown but not in selected badge. */
	description?: string | null;
	/** Optional icon component to display alongside the option. */
	icon?: React.ComponentType<{ className?: string }>;
	/** Whether this option is disabled */
	disabled?: boolean;
	/** Custom styling for the option */
	style?: {
		/** Custom badge color */
		badgeColor?: string;
		/** Custom icon color */
		iconColor?: string;
		/** Gradient background for badge */
		gradient?: string;
	};
}

/**
 * Group interface for organizing options
 */
interface MultiSelectGroup {
	/** Group heading */
	heading: string;
	/** Options in this group */
	options: MultiSelectOption[];
}

/**
 * Props for MultiSelect component
 */
interface MultiSelectProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof multiSelectVariants> {
	/**
	 * An array of option objects or groups to be displayed in the multi-select component.
	 */
	options: MultiSelectOption[] | MultiSelectGroup[];
	/**
	 * Callback function triggered when the selected values change.
	 * Receives an array of the new selected values.
	 */
	onValueChange: (value: string[]) => void;

	/** The default selected values when the component mounts. */
	defaultValue?: string[];

	/**
	 * Placeholder text to be displayed when no values are selected.
	 * Optional, defaults to "Select options".
	 */
	placeholder?: string;

	/**
	 * Maximum number of items to display. Extra selected items will be summarized.
	 * Optional, defaults to 3.
	 */
	maxCount?: number;

	/**
	 * If true, shows search functionality in the popover.
	 * If false, hides the search input completely.
	 * Optional, defaults to true.
	 */
	searchable?: boolean;

	/**
	 * Custom empty state message when no options match search.
	 * Optional, defaults to "No results found."
	 */
	emptyIndicator?: React.ReactNode;

	/**
	 * If true, allows the component to grow and shrink with its content.
	 * If false, uses fixed width behavior.
	 * Optional, defaults to false.
	 */
	autoSize?: boolean;

	/**
	 * If true, shows badges in a single line with horizontal scroll.
	 * If false, badges wrap to multiple lines.
	 * Optional, defaults to false.
	 */
	singleLine?: boolean;

	/**
	 * Custom CSS class for the popover content.
	 * Optional, can be used to customize popover appearance.
	 */
	popoverClassName?: string;

	/**
	 * If true, disables the component completely.
	 * Optional, defaults to false.
	 */
	disabled?: boolean;

	/**
	 * Responsive configuration for different screen sizes.
	 * Allows customizing maxCount and other properties based on viewport.
	 * Can be boolean true for default responsive behavior or an object for custom configuration.
	 */
	responsive?:
		| boolean
		| {
				/** Configuration for mobile devices (< 640px) */
				mobile?: {
					maxCount?: number;
					hideIcons?: boolean;
					compactMode?: boolean;
				};
				/** Configuration for tablet devices (640px - 1024px) */
				tablet?: {
					maxCount?: number;
					hideIcons?: boolean;
					compactMode?: boolean;
				};
				/** Configuration for desktop devices (> 1024px) */
				desktop?: {
					maxCount?: number;
					hideIcons?: boolean;
					compactMode?: boolean;
				};
		  };

	/**
	 * Minimum width for the component.
	 * Optional, defaults to auto-sizing based on content.
	 * When set, component will not shrink below this width.
	 */
	minWidth?: string;

	/**
	 * Maximum width for the component.
	 * Optional, defaults to 100% of container.
	 * Component will not exceed container boundaries.
	 */
	maxWidth?: string;

	/**
	 * Maximum height for the dropdown list area.
	 * Optional, defaults to responsive viewport-based heights.
	 */
	dropdownMaxHeight?: string;

	/**
	 * If true, automatically removes duplicate options based on their value.
	 * Optional, defaults to false (shows warning in dev mode instead).
	 */
	deduplicateOptions?: boolean;

	/**
	 * If true, the component will reset its internal state when defaultValue changes.
	 * Useful for React Hook Form integration and form reset functionality.
	 * Optional, defaults to true.
	 */
	resetOnDefaultValueChange?: boolean;

	/**
	 * If true, automatically closes the popover after selecting an option.
	 * Useful for single-selection-like behavior or mobile UX.
	 * Optional, defaults to false.
	 */
	closeOnSelect?: boolean;

	/**
	 * Custom footer content to display at the bottom of the dropdown.
	 * Useful for adding action buttons like "Add new item".
	 * Optional.
	 */
	footerContent?: React.ReactNode;
}

/**
 * Imperative methods exposed through ref
 */
export interface MultiSelectRef {
	/**
	 * Programmatically reset the component to its default value
	 */
	reset: () => void;
	/**
	 * Get current selected values
	 */
	getSelectedValues: () => string[];
	/**
	 * Set selected values programmatically
	 */
	setSelectedValues: (values: string[]) => void;
	/**
	 * Clear all selected values
	 */
	clear: () => void;
	/**
	 * Focus the component
	 */
	focus: () => void;
}

/**
 * Individual option item component
 */
function OptionItem({
	option,
	isSelected,
	onSelect,
	highlightedIndex,
	index,
	setHighlightedIndex,
}: {
	option: MultiSelectOption;
	isSelected: boolean;
	onSelect: () => void;
	highlightedIndex: number;
	index: number;
	setHighlightedIndex: (index: number) => void;
}) {
	const isHighlighted = highlightedIndex === index;

	return (
		<div
			role='option'
			aria-selected={isSelected}
			aria-disabled={option.disabled}
			data-highlighted={isHighlighted}
			data-selected={isSelected}
			data-disabled={option.disabled}
			tabIndex={-1}
			className={cn(
				'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
				'data-[highlighted=true]:bg-accent data-[highlighted=true]:text-accent-foreground',
				'data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50',
			)}
			onClick={(e) => {
				e.preventDefault();
				e.stopPropagation();
				if (!option.disabled) {
					onSelect();
				}
			}}
			onMouseEnter={() => setHighlightedIndex(index)}
		>
			<div
				className={cn(
					'border-primary mr-2 flex h-4 w-4 items-center justify-center rounded-sm border',
					isSelected ? 'bg-primary text-primary-foreground' : 'opacity-60 [&_svg]:invisible',
				)}
				aria-hidden='true'
			>
				<CheckIcon className='h-4 w-4' />
			</div>
			{option.icon && <option.icon className='text-muted-foreground mr-2 h-4 w-4' aria-hidden='true' />}
			<span>{option.label}</span>
			{option.description && <span className='text-muted-foreground ml-2 text-xs'>{option.description}</span>}
		</div>
	);
}

export const MultiSelect = React.forwardRef<MultiSelectRef, MultiSelectProps>(
	(
		{
			options,
			onValueChange,
			variant,
			defaultValue = [],
			placeholder = 'Select options',
			maxCount = 3,
			className,
			searchable = true,
			emptyIndicator,
			autoSize = false,
			singleLine = false,
			popoverClassName,
			disabled = false,
			responsive,
			minWidth,
			maxWidth,
			dropdownMaxHeight,
			deduplicateOptions = false,
			footerContent,
			resetOnDefaultValueChange = true,
			closeOnSelect = false,
			onClick,
			...props
		},
		ref,
	) => {
		const [selectedValues, setSelectedValues] = React.useState<string[]>(defaultValue);
		const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
		const [searchValue, setSearchValue] = React.useState('');
		const [highlightedIndex, setHighlightedIndex] = React.useState(-1);

		const multiSelectId = React.useId();
		const listboxId = `${multiSelectId}-listbox`;
		const triggerDescriptionId = `${multiSelectId}-description`;
		const selectedCountId = `${multiSelectId}-count`;
		const searchInputId = `${multiSelectId}-search`;

		const searchInputRef = React.useRef<HTMLInputElement>(null);
		const listRef = React.useRef<HTMLDivElement>(null);
		const prevDefaultValueRef = React.useRef<string[]>(defaultValue);

		const isGroupedOptions = React.useCallback(
			(opts: MultiSelectOption[] | MultiSelectGroup[]): opts is MultiSelectGroup[] => {
				return opts.length > 0 && 'heading' in opts[0];
			},
			[],
		);

		const arraysEqual = React.useCallback((a: string[], b: string[]): boolean => {
			if (a.length !== b.length) return false;
			const sortedA = [...a].sort();
			const sortedB = [...b].sort();
			return sortedA.every((val, index) => val === sortedB[index]);
		}, []);

		const resetToDefault = React.useCallback(() => {
			setSelectedValues(defaultValue);
			setIsPopoverOpen(false);
			setSearchValue('');
			onValueChange(defaultValue);
		}, [defaultValue, onValueChange]);

		const buttonRef = React.useRef<HTMLButtonElement>(null);

		React.useImperativeHandle(
			ref,
			() => ({
				reset: resetToDefault,
				getSelectedValues: () => selectedValues,
				setSelectedValues: (values: string[]) => {
					setSelectedValues(values);
					onValueChange(values);
				},
				clear: () => {
					setSelectedValues([]);
					onValueChange([]);
				},
				focus: () => {
					if (buttonRef.current) {
						buttonRef.current.focus();
						const originalOutline = buttonRef.current.style.outline;
						const originalOutlineOffset = buttonRef.current.style.outlineOffset;
						buttonRef.current.style.outline = '2px solid hsl(var(--ring))';
						buttonRef.current.style.outlineOffset = '2px';
						setTimeout(() => {
							if (buttonRef.current) {
								buttonRef.current.style.outline = originalOutline;
								buttonRef.current.style.outlineOffset = originalOutlineOffset;
							}
						}, 1000);
					}
				},
			}),
			[resetToDefault, selectedValues, onValueChange],
		);

		const [screenSize, setScreenSize] = React.useState<'mobile' | 'tablet' | 'desktop'>('desktop');

		React.useEffect(() => {
			if (typeof window === 'undefined') return;
			const handleResize = () => {
				const width = window.innerWidth;
				if (width < 640) {
					setScreenSize('mobile');
				} else if (width < 1024) {
					setScreenSize('tablet');
				} else {
					setScreenSize('desktop');
				}
			};
			handleResize();
			window.addEventListener('resize', handleResize);
			return () => {
				if (typeof window !== 'undefined') {
					window.removeEventListener('resize', handleResize);
				}
			};
		}, []);

		const getResponsiveSettings = () => {
			if (!responsive) {
				return {
					maxCount: maxCount,
					hideIcons: false,
					compactMode: false,
				};
			}
			if (responsive === true) {
				const defaultResponsive = {
					mobile: { maxCount: 2, hideIcons: false, compactMode: true },
					tablet: { maxCount: 4, hideIcons: false, compactMode: false },
					desktop: { maxCount: 6, hideIcons: false, compactMode: false },
				};
				const currentSettings = defaultResponsive[screenSize];
				return {
					maxCount: currentSettings?.maxCount ?? maxCount,
					hideIcons: currentSettings?.hideIcons ?? false,
					compactMode: currentSettings?.compactMode ?? false,
				};
			}
			const currentSettings = responsive[screenSize];
			return {
				maxCount: currentSettings?.maxCount ?? maxCount,
				hideIcons: currentSettings?.hideIcons ?? false,
				compactMode: currentSettings?.compactMode ?? false,
			};
		};

		const responsiveSettings = getResponsiveSettings();

		const getAllOptions = React.useCallback((): MultiSelectOption[] => {
			if (options.length === 0) return [];
			let allOptions: MultiSelectOption[];
			if (isGroupedOptions(options)) {
				allOptions = options.flatMap((group) => group.options);
			} else {
				allOptions = options;
			}
			const valueSet = new Set<string>();
			const duplicates: string[] = [];
			const uniqueOptions: MultiSelectOption[] = [];
			allOptions.forEach((option) => {
				if (valueSet.has(option.value)) {
					duplicates.push(option.value);
					if (!deduplicateOptions) {
						uniqueOptions.push(option);
					}
				} else {
					valueSet.add(option.value);
					uniqueOptions.push(option);
				}
			});
			if (process.env.NODE_ENV === 'development' && duplicates.length > 0) {
				const action = deduplicateOptions ? 'automatically removed' : 'detected';
				console.warn(
					`MultiSelect: Duplicate option values ${action}: ${duplicates.join(', ')}. ` +
						`${
							deduplicateOptions
								? 'Duplicates have been removed automatically.'
								: "This may cause unexpected behavior. Consider setting 'deduplicateOptions={true}' or ensure all option values are unique."
						}`,
				);
			}
			return deduplicateOptions ? uniqueOptions : allOptions;
		}, [options, deduplicateOptions, isGroupedOptions]);

		const getOptionByValue = React.useCallback(
			(value: string): MultiSelectOption | undefined => {
				const option = getAllOptions().find((option) => option.value === value);
				if (!option && process.env.NODE_ENV === 'development') {
					console.warn(`MultiSelect: Option with value "${value}" not found in options list`);
				}
				return option;
			},
			[getAllOptions],
		);

		const filteredOptions = React.useMemo(() => {
			if (!searchable || !searchValue) return options;
			if (options.length === 0) return [];
			if (isGroupedOptions(options)) {
				return options
					.map((group) => ({
						...group,
						options: group.options.filter(
							(option) =>
								option.label.toLowerCase().includes(searchValue.toLowerCase()) ||
								option.value.toLowerCase().includes(searchValue.toLowerCase()),
						),
					}))
					.filter((group) => group.options.length > 0);
			}
			return options.filter(
				(option) =>
					option.label.toLowerCase().includes(searchValue.toLowerCase()) ||
					option.value.toLowerCase().includes(searchValue.toLowerCase()),
			);
		}, [options, searchValue, searchable, isGroupedOptions]);

		// Flatten filtered options for keyboard navigation
		const flatFilteredOptions = React.useMemo(() => {
			if (isGroupedOptions(filteredOptions)) {
				return filteredOptions.flatMap((group) => group.options);
			}
			return filteredOptions as MultiSelectOption[];
		}, [filteredOptions, isGroupedOptions]);

		const toggleOption = React.useCallback(
			(optionValue: string) => {
				if (disabled) return;
				const option = getOptionByValue(optionValue);
				if (option?.disabled) return;
				const newSelectedValues = selectedValues.includes(optionValue)
					? selectedValues.filter((value) => value !== optionValue)
					: [...selectedValues, optionValue];
				setSelectedValues(newSelectedValues);
				onValueChange(newSelectedValues);
				if (closeOnSelect) {
					setIsPopoverOpen(false);
				}
			},
			[disabled, getOptionByValue, selectedValues, onValueChange, closeOnSelect],
		);

		const handleClear = () => {
			if (disabled) return;
			setSelectedValues([]);
			onValueChange([]);
		};

		const handleTogglePopover = () => {
			if (disabled) return;
			setIsPopoverOpen((prev) => !prev);
		};

		const clearExtraOptions = () => {
			if (disabled) return;
			const newSelectedValues = selectedValues.slice(0, responsiveSettings.maxCount);
			setSelectedValues(newSelectedValues);
			onValueChange(newSelectedValues);
		};

		// Handle keyboard navigation in dropdown
		const handleKeyDown = React.useCallback(
			(event: React.KeyboardEvent) => {
				const optionsCount = flatFilteredOptions.length;
				if (optionsCount === 0) return;

				switch (event.key) {
					case 'ArrowDown':
						event.preventDefault();
						setHighlightedIndex((prev) => (prev < optionsCount - 1 ? prev + 1 : 0));
						break;
					case 'ArrowUp':
						event.preventDefault();
						setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : optionsCount - 1));
						break;
					case 'Enter':
						event.preventDefault();
						if (highlightedIndex >= 0 && highlightedIndex < optionsCount) {
							const option = flatFilteredOptions[highlightedIndex];
							if (option && !option.disabled) {
								toggleOption(option.value);
							}
						}
						break;
					case 'Escape':
						event.preventDefault();
						setIsPopoverOpen(false);
						break;
					case 'Backspace':
						if (!searchValue && selectedValues.length > 0) {
							const newSelectedValues = [...selectedValues];
							newSelectedValues.pop();
							setSelectedValues(newSelectedValues);
							onValueChange(newSelectedValues);
						}
						break;
				}
			},
			[flatFilteredOptions, highlightedIndex, toggleOption, searchValue, selectedValues, onValueChange],
		);

		React.useEffect(() => {
			if (!resetOnDefaultValueChange) return;
			const prevDefaultValue = prevDefaultValueRef.current;
			if (!arraysEqual(prevDefaultValue, defaultValue)) {
				if (!arraysEqual(selectedValues, defaultValue)) {
					setSelectedValues(defaultValue);
				}
				prevDefaultValueRef.current = [...defaultValue];
			}
		}, [defaultValue, selectedValues, arraysEqual, resetOnDefaultValueChange]);

		const getWidthConstraints = () => {
			const defaultMinWidth = screenSize === 'mobile' ? '0px' : '200px';
			const effectiveMinWidth = minWidth || defaultMinWidth;
			const effectiveMaxWidth = maxWidth || '100%';
			return {
				minWidth: effectiveMinWidth,
				maxWidth: effectiveMaxWidth,
				width: autoSize ? 'auto' : '100%',
			};
		};

		const widthConstraints = getWidthConstraints();
		const effectiveDropdownMaxHeight = React.useMemo(() => {
			if (dropdownMaxHeight) return dropdownMaxHeight;
			return screenSize === 'mobile' ? '70vh' : '60vh';
		}, [dropdownMaxHeight, screenSize]);

		// Reset search and highlight when popover closes
		React.useEffect(() => {
			if (!isPopoverOpen) {
				setSearchValue('');
				setHighlightedIndex(-1);
			}
		}, [isPopoverOpen]);

		// Focus search input when popover opens
		React.useEffect(() => {
			if (isPopoverOpen && searchable && searchInputRef.current) {
				// Small delay to ensure popover is rendered
				const timer = setTimeout(() => {
					searchInputRef.current?.focus();
				}, 0);
				return () => clearTimeout(timer);
			}
		}, [isPopoverOpen, searchable]);

		// Reset highlighted index when search changes
		React.useEffect(() => {
			setHighlightedIndex(flatFilteredOptions.length > 0 ? 0 : -1);
		}, [searchValue, flatFilteredOptions.length]);

		// Count total filtered options for empty state
		const totalFilteredCount = React.useMemo(() => {
			if (isGroupedOptions(filteredOptions)) {
				return filteredOptions.reduce((acc, group) => acc + group.options.length, 0);
			}
			return filteredOptions.length;
		}, [filteredOptions, isGroupedOptions]);

		// Track option index across groups for keyboard navigation
		let optionIndex = 0;

		return (
			<>
				<Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
					<div id={triggerDescriptionId} className='sr-only'>
						Multi-select dropdown. Use arrow keys to navigate, Enter to select, and Escape to close.
					</div>
					<div id={selectedCountId} className='sr-only' aria-live='polite'>
						{selectedValues.length === 0
							? 'No options selected'
							: `${selectedValues.length} option${selectedValues.length === 1 ? '' : 's'} selected: ${selectedValues
									.map((value) => getOptionByValue(value)?.label)
									.filter(Boolean)
									.join(', ')}`}
					</div>

					<PopoverTrigger asChild>
						<button
							ref={buttonRef}
							type='button'
							{...props}
							onClick={(event) => {
								if (disabled) return;
								onClick?.(event);
								handleTogglePopover();
							}}
							disabled={disabled}
							role='combobox'
							aria-expanded={isPopoverOpen}
							aria-haspopup='listbox'
							aria-controls={isPopoverOpen ? listboxId : undefined}
							aria-describedby={`${triggerDescriptionId} ${selectedCountId}`}
							aria-label={`Multi-select: ${selectedValues.length} of ${
								getAllOptions().length
							} options selected. ${placeholder}`}
							className={cn(
								`border-input/70 focus-visible:border-primary/60 focus-visible:ring-primary/20 flex items-center
								justify-between rounded-md border bg-transparent pr-1 pl-2 shadow-xs transition-[color,box-shadow]
								outline-none focus-visible:ring-[3px] active:scale-100 disabled:pointer-events-none disabled:opacity-50`,
								singleLine ? 'h-8 min-h-8 py-0.5 text-xs' : 'h-auto min-h-10 py-2 text-sm',
								autoSize && 'w-auto',
								!autoSize && 'w-full',
								responsiveSettings.compactMode && 'min-h-9 py-1.5 text-xs',
								className,
							)}
							style={{
								minWidth: widthConstraints.minWidth,
								maxWidth: widthConstraints.maxWidth,
								width: widthConstraints.width,
							}}
						>
							{selectedValues.length > 0 ? (
								<div className='flex w-full items-center justify-between'>
									<div
										className={cn(
											'flex items-center gap-1',
											singleLine ? 'multiselect-singleline-scroll overflow-x-auto' : 'flex-wrap',
											responsiveSettings.compactMode && 'gap-0.5',
										)}
									>
										{selectedValues
											.slice(0, responsiveSettings.maxCount)
											.map((value) => {
												const option = getOptionByValue(value);
												const IconComponent = option?.icon;
												const customStyle = option?.style;
												if (!option) {
													return null;
												}
												const badgeStyle: React.CSSProperties = {
													...(customStyle?.badgeColor && {
														backgroundColor: customStyle.badgeColor,
													}),
													...(customStyle?.gradient && {
														background: customStyle.gradient,
														color: 'white',
													}),
												};
												return (
													<Badge
														key={value}
														className={cn(
															multiSelectVariants({ variant }),
															customStyle?.gradient && 'border-transparent text-white',
															responsiveSettings.compactMode && 'px-1.5 py-0.5 text-xs',
															singleLine && 'py-0.5',
															screenSize === 'mobile' && 'max-w-[120px] truncate',
															singleLine && 'flex-shrink-0 whitespace-nowrap',
															'[&>svg]:pointer-events-auto',
														)}
														style={badgeStyle}
													>
														{IconComponent && !responsiveSettings.hideIcons && (
															<IconComponent
																className={cn(
																	'mr-2 h-4 w-4',
																	responsiveSettings.compactMode && 'mr-1 h-3 w-3',
																	customStyle?.iconColor && 'text-current',
																)}
																{...(customStyle?.iconColor && {
																	style: { color: customStyle.iconColor },
																})}
															/>
														)}
														<span className={cn(screenSize === 'mobile' && 'truncate')}>{option.label}</span>
														<div
															role='button'
															tabIndex={0}
															onClick={(event) => {
																event.stopPropagation();
																toggleOption(value);
															}}
															onKeyDown={(event) => {
																if (event.key === 'Enter' || event.key === ' ') {
																	event.preventDefault();
																	event.stopPropagation();
																	toggleOption(value);
																}
															}}
															aria-label={`Remove ${option.label} from selection`}
															className='-m-0.5 ml-2 h-4 w-4 cursor-pointer rounded-sm p-0.5 hover:bg-white/20 focus:ring-1 focus:ring-white/50 focus:outline-none'
														>
															<XCircle className={cn('h-3 w-3', responsiveSettings.compactMode && 'h-2.5 w-2.5')} />
														</div>
													</Badge>
												);
											})
											.filter(Boolean)}
										{selectedValues.length > responsiveSettings.maxCount && (
											<Badge
												className={cn(
													'text-foreground border-foreground/10 bg-transparent',
													multiSelectVariants({ variant }),
													responsiveSettings.compactMode && 'px-1.5 py-0.5 text-xs',
													singleLine && 'flex-shrink-0 whitespace-nowrap',
													'[&>svg]:pointer-events-auto',
												)}
											>
												{`+ ${selectedValues.length - responsiveSettings.maxCount} more`}
												<div
													role='button'
													tabIndex={0}
													onClick={(event) => {
														event.stopPropagation();
														clearExtraOptions();
													}}
													onKeyDown={(event) => {
														if (event.key === 'Enter' || event.key === ' ') {
															event.preventDefault();
															event.stopPropagation();
															clearExtraOptions();
														}
													}}
													aria-label='Clear extra selected options'
													className='-m-0.5 ml-2 h-4 w-4 cursor-pointer rounded-sm p-0.5 hover:bg-white/20 focus:ring-1
														focus:ring-white/50 focus:outline-none'
												>
													<XCircle className={cn('h-3 w-3', responsiveSettings.compactMode && 'h-2.5 w-2.5')} />
												</div>
											</Badge>
										)}
									</div>
									<div className='flex items-center justify-between'>
										<div
											role='button'
											tabIndex={0}
											onClick={(event) => {
												event.stopPropagation();
												handleClear();
											}}
											onKeyDown={(event) => {
												if (event.key === 'Enter' || event.key === ' ') {
													event.preventDefault();
													event.stopPropagation();
													handleClear();
												}
											}}
											aria-label={`Clear all ${selectedValues.length} selected options`}
											className='text-muted-foreground hover:text-foreground focus:ring-ring mx-2 flex h-4 w-4
												cursor-pointer items-center justify-center rounded-sm focus:ring-2 focus:ring-offset-1
												focus:outline-none'
										>
											<XIcon className='h-4 w-4' />
										</div>
										<Separator orientation='vertical' className='flex h-full min-h-6' />
										<ChevronDown className='text-muted-foreground mx-1 h-4 cursor-pointer' />
									</div>
								</div>
							) : (
								<div className='mx-auto flex w-full items-center justify-between'>
									<span className='text-muted-foreground mx-1 text-sm'>{placeholder}</span>
									<ChevronDown className='text-muted-foreground mx-1 h-4 cursor-pointer' />
								</div>
							)}
						</button>
					</PopoverTrigger>
					<PopoverContent
						id={listboxId}
						aria-label='Available options'
						className={cn('w-(--anchor-width) overflow-hidden p-0', popoverClassName)}
						style={{
							minWidth: widthConstraints.minWidth,
							maxWidth: widthConstraints.maxWidth,
							width: widthConstraints.width === 'auto' ? 'auto' : undefined,
							maxHeight: effectiveDropdownMaxHeight,
							touchAction: 'manipulation',
						}}
						align='start'
						onEscapeKeyDown={() => setIsPopoverOpen(false)}
					>
						<div className='flex h-full max-h-[inherit] flex-col' onKeyDown={handleKeyDown}>
							{/* Search Input */}
							{searchable && (
								<div className='flex items-center border-b px-3'>
									<SearchIcon className='text-muted-foreground mr-2 h-4 w-4 shrink-0 opacity-50' />
									<input
										ref={searchInputRef}
										id={searchInputId}
										type='text'
										placeholder='Search options...'
										value={searchValue}
										onChange={(e) => setSearchValue(e.target.value)}
										aria-label='Search through available options'
										className='placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50'
									/>
								</div>
							)}

							{/* Options List */}
							<div
								ref={listRef}
								role='listbox'
								aria-multiselectable='true'
								className='multiselect-scrollbar scrollbar-neutral-thin overscroll-contain min-h-0 flex-1 overflow-y-auto p-1'
							>
								{totalFilteredCount === 0 ? (
									<div className='text-muted-foreground py-6 text-center text-sm'>
										{emptyIndicator || 'No results found.'}
									</div>
								) : isGroupedOptions(filteredOptions) ? (
									filteredOptions.map((group) => (
										<div key={group.heading} role='group' aria-labelledby={`group-${group.heading}`}>
											<div
												id={`group-${group.heading}`}
												className='text-muted-foreground px-2 py-1.5 text-xs font-medium'
											>
												{group.heading}
											</div>
											{group.options.map((option) => {
												const currentIndex = optionIndex++;
												const isSelected = selectedValues.includes(option.value);
												return (
													<OptionItem
														key={option.value}
														option={option}
														isSelected={isSelected}
														onSelect={() => toggleOption(option.value)}
														highlightedIndex={highlightedIndex}
														index={currentIndex}
														setHighlightedIndex={setHighlightedIndex}
													/>
												);
											})}
										</div>
									))
								) : (
									(filteredOptions as MultiSelectOption[]).map((option) => {
										const currentIndex = optionIndex++;
										const isSelected = selectedValues.includes(option.value);
										return (
											<OptionItem
												key={option.value}
												option={option}
												isSelected={isSelected}
												onSelect={() => toggleOption(option.value)}
												highlightedIndex={highlightedIndex}
												index={currentIndex}
												setHighlightedIndex={setHighlightedIndex}
											/>
										);
									})
								)}
							</div>

							{/* Footer */}
							{footerContent && <div className='border-t p-1'>{footerContent}</div>}
						</div>
					</PopoverContent>
				</Popover>
			</>
		);
	},
);

MultiSelect.displayName = 'MultiSelect';
export type { MultiSelectOption, MultiSelectGroup, MultiSelectProps };
