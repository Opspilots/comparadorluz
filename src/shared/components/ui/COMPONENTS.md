# UI Components Documentation

This document provides comprehensive documentation for the reusable UI components in the `src/shared/components/ui/` directory. All components are built on top of **Radix UI primitives** styled with **Tailwind CSS** (shadcn/ui pattern).

---

## Progress Component

### Overview

The `Progress` component displays the progress of a task in a visual bar format. It's a wrapper around Radix UI's `@radix-ui/react-progress` component, providing semantic accessibility and consistent styling within the EnergyDeal design system.

**Location**: `src/shared/components/ui/progress.tsx`

### Purpose

- Display linear progress for tasks or processes (e.g., tariff batch uploads, file parsing progress)
- Provide visual feedback to users about task completion
- Maintain accessibility standards with ARIA attributes (handled by Radix UI)
- Ensure responsive design through Tailwind CSS styling

### Technical Details

#### Props

The component accepts all standard props from Radix UI's `ProgressPrimitive.Root`:

| Prop | Type | Description |
|------|------|-------------|
| `value` | `number \| null \| undefined` | Progress percentage (0-100). `null` or `undefined` renders as indeterminate. |
| `max` | `number` | Maximum value (default: 100). |
| `className` | `string` | Additional CSS classes (merged with default styles via `cn()`). |
| `ref` | `React.ForwardedRef` | Reference to the root element. |
| `...props` | `React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>` | Any other standard HTML attributes. |

#### Default Styling

The component applies:
- **Container**: `relative h-4 w-full overflow-hidden rounded-full bg-secondary`
  - Fixed height of 16px (h-4)
  - Full width of parent
  - Rounded corners
  - Secondary background color
- **Indicator**: `h-full w-full flex-1 bg-primary transition-all`
  - Primary color fill
  - Smooth transition animations
  - Hardware-accelerated transform (uses `translateX`)

#### Performance Notes

- Uses CSS `transform: translateX()` for high-performance animations (GPU-accelerated)
- No JavaScript re-renders on every progress update unless props change
- Radix UI primitives are unstyled and lightweight (~2KB gzipped)
- Safe for frequent updates in long-running operations

### Usage Examples

#### Basic Usage

```tsx
import { Progress } from '@/shared/components/ui/progress'

export function FileUploadProgress() {
  const [progress, setProgress] = useState(0)

  return <Progress value={progress} />
}
```

#### With Custom Styling

```tsx
import { Progress } from '@/shared/components/ui/progress'

export function CustomProgress() {
  return <Progress value={75} className="h-2 rounded-sm" />
}
```

#### Indeterminate (Loading) State

```tsx
// When loading or unable to determine progress
<Progress value={undefined} />
// or
<Progress value={null} />
```

#### Real-World Example: Tariff Upload Progress

```tsx
import { Progress } from '@/shared/components/ui/progress'
import { useTariffUpload } from '@/features/tariffs/hooks'

export function TariffUploadPanel() {
  const { uploadProgress, isUploading } = useTariffUpload()

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        Upload Progress
      </label>
      <Progress
        value={isUploading ? uploadProgress : undefined}
        className={isUploading ? '' : 'opacity-50'}
      />
      <p className="text-xs text-muted-foreground">
        {isUploading ? `${uploadProgress}% complete` : 'Ready to upload'}
      </p>
    </div>
  )
}
```

### Accessibility

The component inherits accessibility features from Radix UI:
- **ARIA attributes**: Automatically includes `role="progressbar"`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-label`
- **Keyboard support**: No keyboard interaction required; component is informational
- **Screen readers**: Announces current progress percentage
- **Color contrast**: Tailwind `bg-primary` and `bg-secondary` meet WCAG AA standards

### When to Use

✅ **Use Progress for:**
- File uploads/downloads with known duration
- Multi-step form progress indicators
- Data processing pipelines with measurable stages
- Long-running async operations (tariff parsing, email campaigns)
- Batch operations with clear completion metrics

❌ **Don't use for:**
- Indefinite loading (use `<Loader2 />` or skeleton states instead)
- Page load progress (layout shift risk)
- Very fast operations (<500ms total time)

### Related Components

- **Radix UI Progress**: https://www.radix-ui.com/docs/primitives/components/progress
- **Skeleton**: `src/shared/components/ui/` (for loading placeholders)
- **Button**: Can contain a Progress component for operation status

### Future Improvements (Backlog)

- [ ] Add `indeterminate` prop for explicit indeterminate state
- [ ] Support `aria-label` and `aria-labelledby` passthrough
- [ ] Add variant support (size, color) via class-variance-authority
- [ ] Create Storybook stories for visual testing

---

## Component Pattern Overview

All components in this directory follow the **shadcn/ui pattern**:

1. **Radix UI Primitives** provide unstyled, accessible foundations
2. **Tailwind CSS** applies design system styling
3. **cn() utility** merges custom classes without conflicts
4. **React.forwardRef** enables parent component ref access
5. **TypeScript strict mode** ensures type safety

For consistency, new components should follow this same pattern.
