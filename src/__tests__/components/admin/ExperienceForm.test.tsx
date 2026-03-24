import { render, screen, waitFor } from "@testing-library/react";
import ExperienceForm from "@/components/admin/ExperienceForm";
import { vi, describe, it, expect } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  })
}));

// Mock TiptapEditor to avoid complex rendering in simple smoke tests
vi.mock("@/components/blog/TiptapEditor", () => ({
  default: () => <div data-testid="tiptap-mock">TiptapEditor</div>
}));

// Mock MediaUploader
vi.mock("@/components/admin/MediaUploader", () => ({
  default: () => <div data-testid="media-uploader-mock">MediaUploader</div>
}));

// Mock fetch
globalThis.fetch = vi.fn().mockImplementation(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ categories: [], settings: {} }) }));

describe("ExperienceForm", () => {
  it("renders the create form without crashing", async () => {
    render(<ExperienceForm />);
    expect(screen.getByText(/Create New Trip/i)).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText(/Basic Info/i)).toBeInTheDocument();
    });
  });

  it("renders the edit form when initialData is provided", async () => {
    const initialData = {
      id: "exp-123",
      title: "Test Trip",
      description: {},
      basePrice: 1000,
      capacity: 10,
    };
    render(<ExperienceForm initialData={initialData} />);
    expect(screen.getByText(/Edit Trip/i)).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.queryByDisplayValue("Test Trip")).toBeInTheDocument();
    });
  });
});
