# Developer Guide: Image Cropping & Aspect Ratios

This document explains how to implement and maintain image cropping for new features in the Param Adventure codebase.

## 1. The Centralized Configuration

Before adding a new upload field, always check or update the centralized aspect ratio config:
**Location**: `src/lib/constants/aspect-ratios.ts`

```typescript
export const ASPECT_RATIOS = {
  NEW_FEATURE_RATIO: 16 / 9, // Add your new ratio here
} as const;
```

## 2. Using MediaUploader (Admin/Forms)

The `MediaUploader` component handles the interception of image selections and shows the cropper automatically.

### Implementation:

```tsx
import { ASPECT_RATIOS } from "@/lib/constants/aspect-ratios";
import MediaUploader from "./MediaUploader";

// Inside your component
<MediaUploader
  id="unique-id"
  shouldCrop={true}
  aspectRatio={ASPECT_RATIOS.EXPERIENCE_CARD} // Use the constant!
  onUploadSuccess={(urls) => {
    // urls[0] will be the cropped image URL
  }}
/>;
```

## 3. Standalone Cropping (Custom UI)

If you aren't using `MediaUploader` (e.g., custom avatar upload), use `ImageCropper` directly.

### Implementation:

```tsx
import ImageCropper from "@/components/admin/ImageCropper";
import { ASPECT_RATIOS } from "@/lib/constants/aspect-ratios";

// 1. Capture file from <input type="file">
// 2. Create a preview URL: URL.createObjectURL(file)
// 3. Render the cropper:

{
  cropPreviewUrl && (
    <ImageCropper
      image={cropPreviewUrl}
      aspectRatio={ASPECT_RATIOS.AVATAR}
      onCropComplete={async (croppedBlob) => {
        // Upload the blob to your API
      }}
      onCancel={() => setCropPreviewUrl(null)}
    />
  );
}
```

## 4. Keeping Frontend in Sync

To ensure the cropped image fits perfectly in the UI without black bars or awkward stretching, use the same aspect ratio in your CSS.

### Best Practice:

Instead of fixed heights (`h-64`), use Tailwind's aspect-ratio utilities:

```tsx
<div className="relative aspect-[4/3] w-full overflow-hidden">
  <img src={image} className="object-cover w-full h-full" />
</div>
```

## 5. Summary of Roles

- **MediaUploader**: High-level component that wraps the entire flow (Select -> Crop -> Upload).
- **ImageCropper**: Low-level modal component for the cropping UI itself.
- **ASPECT_RATIOS**: The single source of truth for all dimensions.

---

_Last Updated: March 2026_
Every thing else in phase 11 is completed.
