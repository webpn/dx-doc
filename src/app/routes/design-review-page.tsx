import {
  Alert,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Field,
  Input,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@project/design-system';
import { ChevronDown } from 'lucide-react';
import { useState, type ReactElement } from 'react';

/**
 * States catalogue for every design-system primitive (M1.15 UI design
 * validation): default, hover, focus, disabled, loading, empty,
 * validation-error and network-error, reviewed live rather than by
 * screenshot alone. Not a product screen — see docs/ui/README.md.
 */
export function DesignReviewPage(): ReactElement {
  const [invalid, setInvalid] = useState(true);

  return (
    <div className="grid gap-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-primary)]">
          M1.15 review surface
        </p>
        <h1 className="my-2 text-3xl font-bold tracking-tight text-[var(--color-ink)]">
          Design system states
        </h1>
        <p className="max-w-2xl text-[var(--color-muted)]">
          Tab through every control below to review focus order, keyboard activation and announced
          state.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buttons</CardTitle>
          <CardDescription>
            Default, secondary, ghost, danger and disabled variants.
          </CardDescription>
        </CardHeader>
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button disabled>Disabled</Button>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Field states</CardTitle>
          <CardDescription>
            Default, hint and validation-error, with an associated message.
          </CardDescription>
        </CardHeader>
        <div className="grid max-w-sm gap-4">
          <Field
            htmlFor="review-hint"
            hint="A hint appears here when there is no error."
            label="With a hint"
          >
            <Input id="review-hint" placeholder="Try keyboard focus" />
          </Field>
          <Field
            {...(invalid ? { error: 'This value is required.' } : {})}
            htmlFor="review-input"
            label="Project name"
          >
            <Input aria-invalid={invalid} id="review-input" placeholder="Try keyboard focus" />
          </Field>
          <Field htmlFor="review-disabled" label="Disabled">
            <Input disabled id="review-disabled" value="Cannot be edited" />
          </Field>
          <Button
            onClick={() => {
              setInvalid(!invalid);
            }}
            variant="secondary"
          >
            Toggle validation error
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Messages</CardTitle>
          <CardDescription>
            Status is paired with an icon and role, not color alone.
          </CardDescription>
        </CardHeader>
        <div className="grid gap-3">
          <Alert variant="info">Informational status.</Alert>
          <Alert variant="success">Saved successfully.</Alert>
          <Alert variant="error">
            Unable to reach the server. Check your connection and try again.
          </Alert>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Loading</CardTitle>
          <CardDescription>Skeleton placeholders for content still in flight.</CardDescription>
        </CardHeader>
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Empty state</CardTitle>
        </CardHeader>
        <Card className="border-dashed">
          <p className="text-[var(--color-muted)]">No projects are assigned to this account yet.</p>
        </Card>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dialog</CardTitle>
          <CardDescription>
            Focus trap, Escape to close, and a labelled close button.
          </CardDescription>
        </CardHeader>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="secondary">Open dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Grant access</DialogTitle>
              <DialogDescription>Choose a role for this project member.</DialogDescription>
            </DialogHeader>
            <Field htmlFor="review-dialog-email" label="Email address">
              <Input id="review-dialog-email" type="email" />
            </Field>
            <DialogFooter>
              <Button variant="secondary">Cancel</Button>
              <Button>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dropdown menu</CardTitle>
          <CardDescription>
            Arrow-key navigation, Enter/Space to activate, Escape to close.
          </CardDescription>
        </CardHeader>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary">
              Actions
              <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem>Duplicate</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Remove</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Table</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Marketing site</TableCell>
              <TableCell>web</TableCell>
              <TableCell>Editor</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Mobile app</TableCell>
              <TableCell>ios</TableCell>
              <TableCell>Viewer</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
