// Utilities
export { cn } from './lib/utils';
export { Slot, Slottable, composeRefs, mergeProps } from './lib/slot';
export { useControllableState } from './lib/use-controllable-state';
export { easings, durations, springs, transitions, variants } from './lib/motion/motion-config';

// Core primitives
export { Button, buttonVariants, type ButtonProps } from './components/button';
export { Badge, badgeVariants, type BadgeProps } from './components/badge';
export { Label, type LabelProps } from './components/label';
export { Skeleton, type SkeletonProps } from './components/skeleton';
export {
	Card,
	CardHeader,
	CardFooter,
	CardTitle,
	CardAction,
	CardDescription,
	CardContent,
	cardVariants,
	type CardProps,
} from './components/card';
export { Separator, type SeparatorProps } from './components/separator';
export { Alert, AlertTitle, AlertDescription, alertVariants } from './components/alert';

// Form primitives
export { Input, type InputProps } from './components/input';
export { Textarea, type TextareaProps } from './components/textarea';
export { Checkbox, type CheckboxProps } from './components/checkbox';
export { CheckboxGroup, type CheckboxGroupProps } from './components/checkbox-group';
export { RadioGroup, Radio, RadioGroupItem, type RadioGroupProps, type RadioProps } from './components/radio-group';
export { Switch, type SwitchProps } from './components/switch';
export {
	Select,
	SelectTrigger,
	SelectValue,
	SelectPopup,
	SelectContent,
	SelectItem,
	SelectRichItem,
	SelectFieldItem,
	SelectSeparator,
	SelectGroup,
	SelectGroupLabel,
	SelectLabel,
} from './components/select';
export { Progress, type ProgressProps } from './components/progress';
export {
	useFormField,
	Form,
	FormItem,
	FormLabel,
	FormControl,
	FormDescription,
	FormMessage,
	FormField,
} from './components/form';
export { FormControl as FormControlComponent, type FormControlLayout } from './components/form-control';
export {
	InputGroup,
	InputGroupAddon,
	InputGroupText,
	InputGroupInput,
	InputGroupTextarea,
} from './components/input-group';
export { Field, FieldRow, type FieldProps, type FieldRowProps } from './components/field';

// Overlay components
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './components/tooltip';
export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor } from './components/popover';
export {
	Dialog,
	DialogPortal,
	DialogBackdrop,
	DialogTrigger,
	DialogClose,
	DialogContent,
	DialogHeader,
	DialogFooter,
	DialogTitle,
	DialogDescription,
} from './components/dialog';
export {
	AlertDialog,
	AlertDialogPortal,
	AlertDialogTrigger,
	AlertDialogContent,
	AlertDialogHeader,
	AlertDialogFooter,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogAction,
	AlertDialogCancel,
} from './components/alert-dialog';
export {
	DropdownMenu,
	DropdownMenuPortal,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuCheckboxItem,
	DropdownMenuRadioItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuGroup,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuRadioGroup,
} from './components/dropdown-menu';
export {
	Sheet,
	SheetTrigger,
	SheetClose,
	SheetContent,
	SheetHeader,
	SheetFooter,
	SheetTitle,
	SheetDescription,
} from './components/sheet';
export {
	Drawer,
	DrawerPortal,
	DrawerOverlay,
	DrawerTrigger,
	DrawerClose,
	DrawerContent,
	DrawerHeader,
	DrawerFooter,
	DrawerTitle,
	DrawerDescription,
} from './components/drawer';

// Layout & navigation
export { Tabs, TabsList, TabsTrigger, TabsContent } from './components/tabs';
export { Collapsible, CollapsibleTrigger, CollapsibleContent } from './components/collapsible';
export { ScrollArea, ScrollBar } from './components/scroll-area';
export { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './components/resizable';
export {
	Table,
	TableHeader,
	TableBody,
	TableFooter,
	TableHead,
	TableRow,
	TableCell,
	TableCaption,
} from './components/table';
export {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationPrevious,
	PaginationNext,
	PaginationEllipsis,
} from './components/pagination';
export {
	Breadcrumb,
	BreadcrumbList,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbPage,
	BreadcrumbSeparator,
	BreadcrumbEllipsis,
} from './components/breadcrumb';
export { Avatar, AvatarImage, AvatarFallback } from './components/avatar';
export {
	Autocomplete,
	AutocompleteInput,
	AutocompletePopup,
	AutocompleteItem,
	AutocompleteSeparator,
	AutocompleteEmpty,
} from './components/autocomplete';

// Complex components
export { FlowZoomPanel } from './components/flow-zoom-panel';
export { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from './components/command';
export {
	Combobox,
	ComboboxTrigger,
	ComboboxContent,
	ComboboxInput,
	ComboboxList,
	ComboboxItem,
	ComboboxEmpty,
	ComboboxGroup,
	ComboboxSeparator,
	type ComboboxProps,
	type ComboboxTriggerProps,
	type ComboboxContentProps,
	type ComboboxInputProps,
	type ComboboxListProps,
	type ComboboxEmptyProps,
	type ComboboxGroupProps,
	type ComboboxItemProps,
	type ComboboxSeparatorProps,
} from './components/combobox';
export {
	MultiSelect,
	type MultiSelectRef,
	type MultiSelectOption,
	type MultiSelectGroup,
	type MultiSelectProps,
} from './components/multi-select';
export {
	Tags,
	TagsTrigger,
	TagsValue,
	TagsContent,
	TagsInput,
	TagsList,
	TagsEmpty,
	TagsGroup,
	TagsItem,
	type TagsProps,
	type TagsTriggerProps,
	type TagsValueProps,
	type TagsContentProps,
	type TagsInputProps,
	type TagsListProps,
	type TagsEmptyProps,
	type TagsGroupProps,
	type TagsItemProps,
} from './components/tags';
export { RecordPicker } from './components/record-picker';
export {
	Stepper,
	StepperItem,
	StepperTrigger,
	StepperIndicator,
	StepperSeparator,
	StepperTitle,
	StepperDescription,
} from './components/stepper';
export {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupAction,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInput,
	SidebarInset,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuBadge,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSkeleton,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarProvider,
	SidebarSeparator,
	SidebarTrigger,
	useSidebar,
} from './components/sidebar';

// Specialized components
export { Calendar, RangeCalendar } from './components/calendar-rac';
export { JsonInput, JsonEditor, validateJson } from './components/json-input';
export { Toaster } from './components/sonner';
export { Dock, DockIcon, dockVariants } from './components/dock';
export { PageHeader } from './components/page-header';
export { FlickeringGrid } from './components/flickering-grid';
export { MotionGrid, type MotionGridProps, type FrameDot, type Frame, type Frames } from './components/motion-grid';
export { ProgressiveBlur } from './components/progressive-blur';
export { ProgressiveBlurScrollContainer } from './components/progressive-blur-scroll-container';
export { ResponsiveDiagram } from './components/responsive-diagram';
export {
	PortalRoot,
	usePortalContainer,
	usePortalContext,
	useRootPortalContainer,
	useInModalOverlay,
	useFloatingOverlayPortalProps,
	ModalPortalScope,
	PORTAL_ROOT_ID,
	type OverlayLayer,
	type FloatingPortalStrategy,
	type FloatingZIndex,
} from './components/portal';
export { UnlinkButton } from './components/unlink-button';

// Complex subsystems
export * from './components/stack';
export * from './components/toast';
export * from './components/org-chart';
export * from './components/storage';
