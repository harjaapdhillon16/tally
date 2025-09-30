# Responsive Design Quick Reference

## Breakpoint Strategy

```
Mobile First Approach:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│ Mobile (< 640px)  │ Base styles, mobile-first
│ Tablet (640-1024) │ sm: prefix
│ Desktop (>1024px) │ lg: prefix
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Component Patterns

### 1. Table → Card Transformation

#### Desktop (Table)
```
┌─────────────────────────────────────────┐
│ Date    │ Vendor      │ Amount │ Actions│
├─────────────────────────────────────────┤
│ Jan 5   │ Amazon      │ $50.00 │   ⋮   │
│ Jan 4   │ Walmart     │ $25.99 │   ⋮   │
└─────────────────────────────────────────┘
```

#### Mobile (Cards)
```
┌───────────────────────────┐
│ Jan 5          $50.00  ⋮ │
│ Amazon                    │
│ Office supplies           │
│ [OpEx] Office Supplies    │
│ ● High Confidence         │
└───────────────────────────┘
┌───────────────────────────┐
│ Jan 4          $25.99  ⋮ │
│ Walmart                   │
│ ...                       │
└───────────────────────────┘
```

### 2. Button Sizes

```
Mobile:    [    Button    ]  h-10 (40px)
           └─────44px+─────┘

Desktop:   [   Button   ]    h-9 (36px)
```

### 3. Spacing Scale

```
Component         Mobile      Tablet      Desktop
─────────────────────────────────────────────────
Page padding      px-3        px-6        px-8
Card gap          gap-3       gap-4       gap-4
Content py        py-4        py-6        py-8
Header height     h-11        h-12        h-12
```

## Layout Examples

### Dashboard Metrics

```
Mobile (< 640px):
┌──────────────────┐
│  Cash on Hand    │
│  $12,345         │
└──────────────────┘
┌──────────────────┐
│  Safe to Spend   │
│  $8,900          │
└──────────────────┘

Tablet (640-1024px):
┌──────────────────┬──────────────────┐
│  Cash on Hand    │  Safe to Spend   │
│  $12,345         │  $8,900          │
└──────────────────┴──────────────────┘

Desktop (> 1024px):
┌────────┬────────┬────────┬────────┐
│  Cash  │  Safe  │ Review │ Trend  │
│ $12.3k │ $8.9k  │   12   │  +5%   │
└────────┴────────┴────────┴────────┘
```

### Navigation

```
Mobile:
┌─────────────────────────────┐
│ ☰  Nexus        🌙  👤     │  (Full width)
└─────────────────────────────┘

Desktop:
┌───────┬─────────────────────────┐
│ Nexus │      🌙  🏢  👤        │
│ 🏠 D… │                         │
│ 🧾 T… │                         │
│ 👁 R… │                         │
└───────┴─────────────────────────┘
```

## Touch Targets

### Minimum Sizes
```
Element Type        Mobile      Desktop
─────────────────────────────────────────
Button (default)    44×40px     36×36px
Icon button         40×40px     36×36px
Icon button (sm)    36×36px     28×28px
Checkbox            24×24px     20×20px
Menu item           48px tall   36px tall
```

### Padding Guidelines
```
Mobile:
- Buttons: px-4 py-2.5 (minimum)
- Navigation: p-3
- Cards: p-4

Desktop:
- Buttons: px-4 py-2
- Navigation: p-2
- Cards: p-6
```

## Typography Scale

```
Element           Mobile      Desktop     Use Case
──────────────────────────────────────────────────
Page title        text-2xl    text-3xl    H1
Card title        text-xs     text-sm     Uppercase labels
Metric value      text-2xl    text-3xl    Dashboard numbers
Body text         text-sm     text-sm     General content
Small text        text-xs     text-xs     Metadata, labels
```

## Common Patterns

### 1. Responsive Grid
```css
grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4
```

### 2. Responsive Padding
```css
px-3 sm:px-6 lg:px-8  /* Horizontal */
py-4 sm:py-6 lg:py-8  /* Vertical */
```

### 3. Show/Hide Elements
```css
hidden sm:block       /* Hide on mobile, show on tablet+ */
md:hidden             /* Show on mobile/tablet, hide on desktop */
hidden lg:flex        /* Hide on mobile/tablet, flex on desktop */
```

### 4. Adaptive Heights
```css
h-11 sm:h-12          /* Header */
h-10 sm:h-9           /* Button */
```

### 5. Flex Direction
```css
flex flex-col sm:flex-row  /* Stack on mobile, row on desktop */
```

## Real-World Examples

### Transactions Table/Cards

```typescript
{/* Desktop */}
<Card className="hidden md:block">
  <table className="w-full">...</table>
</Card>

{/* Mobile */}
<div className="md:hidden space-y-3">
  {transactions.map(tx => (
    <Card className="p-4">...</Card>
  ))}
</div>
```

### Bulk Action Bar

```typescript
<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
  <span className="text-sm">{count} selected</span>
  <Button className="w-full sm:w-auto">
    <span className="hidden sm:inline">Approve {count} transactions</span>
    <span className="sm:hidden">Approve ({count})</span>
  </Button>
</div>
```

### Responsive Button

```typescript
<Button 
  size="default"  // h-10 on mobile, h-9 on desktop
  className="w-full sm:w-auto touch-manipulation"
>
  Submit
</Button>
```

## Testing Checklist

### Device Sizes to Test
- [ ] iPhone SE (375px) - smallest common
- [ ] iPhone 12/13 (390px)
- [ ] iPhone 14 Pro Max (430px)
- [ ] iPad Mini (768px)
- [ ] iPad Pro (1024px)
- [ ] Desktop (1280px+)

### Features to Test
- [ ] All touch targets ≥ 44×44px on mobile
- [ ] No horizontal scrolling on mobile
- [ ] Text readable without zooming
- [ ] Forms usable with on-screen keyboard
- [ ] Navigation accessible on all sizes
- [ ] Tables transform to cards on mobile
- [ ] Bulk actions work on mobile
- [ ] Modals/dialogs mobile-friendly

### Interaction Testing
- [ ] Tap targets not too close together
- [ ] Swipe gestures don't conflict
- [ ] Pinch-to-zoom works where appropriate
- [ ] Landscape orientation works
- [ ] Safe areas respected (notch, home indicator)

## Performance Tips

### 1. Avoid Layout Shift
```css
/* BAD - causes shift */
<div className="hidden md:block md:h-12" />

/* GOOD - consistent height */
<div className="h-11 sm:h-12" />
```

### 2. Optimize Touch Events
```css
/* Always add to interactive elements */
touch-manipulation
```

### 3. Use Hardware Acceleration
```css
/* For animations */
transition-transform
will-change-transform
```

### 4. Efficient Breakpoints
```css
/* BAD - too many breakpoints */
sm:text-sm md:text-base lg:text-lg xl:text-xl

/* GOOD - minimal breakpoints */
text-sm lg:text-base
```

## Common Mistakes to Avoid

❌ **Don't:**
- Set fixed widths on mobile
- Use hover states as only interaction indicator
- Forget about landscape orientation
- Make touch targets too small (< 44px)
- Hide critical functionality on mobile

✅ **Do:**
- Start with mobile layout first
- Use relative units (rem, %, vh/vw)
- Test on real devices
- Consider thumb zones on mobile
- Provide clear visual feedback

## Resources

### Tools
- Chrome DevTools Device Mode
- Responsive Design Mode (Firefox)
- BrowserStack for real device testing
- Lighthouse Mobile audit

### References
- Apple Human Interface Guidelines (iOS)
- Material Design (Android)
- WCAG 2.1 Touch Target Guidelines
- MDN Responsive Design

---

**Last Updated**: September 30, 2025
**Maintained by**: Nexus Engineering Team
