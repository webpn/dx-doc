// Design System — public API surface (ADR-0008, ADR-0011)
// shadcn/ui components brought in as source, kept close to upstream.
// Application code imports from here, never from a component path directly.

export { Alert } from './components/alert';
export { Button, type ButtonProps } from './components/button';
export { Card, CardHeader, CardTitle, CardDescription } from './components/card';
export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './components/dialog';
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuRadioGroup,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from './components/dropdown-menu';
export { Field, type FieldProps } from './components/field';
export { Input } from './components/input';
export { Label } from './components/label';
export { AppShell, AppHeader, AppMain } from './components/layout';
export { Skeleton } from './components/skeleton';
export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './components/table';
export { cn } from './lib/cn';
