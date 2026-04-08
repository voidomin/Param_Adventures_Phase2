import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ExperienceForm from "@/components/admin/ExperienceForm";
import React from "react";
import * as XLSX from "xlsx";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// Mock MediaUploader
vi.mock("@/components/admin/MediaUploader", () => ({ 
  default: ({ onUploadSuccess, id }: any) => {
    return (
      <div data-testid={id}>
        <input
          type="file"
          aria-label={id === "cover-image-upload" ? "Cover Image Input" : "Media Input"}
          onChange={() => {
            onUploadSuccess(["https://example.com/mock-image.jpg"]);
          }}
        />
      </div>
    );
  },
}));

// Mock xlsx
vi.mock("xlsx", () => ({
  read: vi.fn(),
  utils: {
    sheet_to_json: vi.fn(),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
    json_to_sheet: vi.fn(() => ({})),
  },
  writeFile: vi.fn(),
}));

// Hoist mock objects to avoid initialization and nesting errors
const { mockExtension, mockEditor } = vi.hoisted(() => {
  const mockRun = { run: vi.fn() };
  const mockFocus = {
    toggleBold: () => mockRun,
    toggleItalic: () => mockRun,
    toggleStrike: () => mockRun,
    toggleBulletList: () => mockRun,
    toggleOrderedList: () => mockRun,
    toggleHeading: () => mockRun,
    toggleBlockquote: () => mockRun,
    toggleCodeBlock: () => mockRun,
    undo: () => mockRun,
    redo: () => mockRun,
    run: vi.fn(),
  };

  return {
    mockExtension: {
      configure: vi.fn().mockReturnThis(),
    },
    mockEditor: {
      getJSON: () => ({ type: "doc", content: [] }),
      getHTML: () => "<p></p>",
      isActive: () => false,
      chain: () => ({
        focus: () => mockFocus,
      }),
    },
  };
});

// Mock TipTap extensions
vi.mock("@tiptap/react", () => ({
  useEditor: () => mockEditor,
  EditorContent: () => <div data-testid="rich-text-editor" />,
}));
vi.mock("@tiptap/starter-kit", () => ({ default: mockExtension, StarterKit: mockExtension }));
vi.mock("@tiptap/extension-underline", () => ({ default: mockExtension }));
vi.mock("@tiptap/extension-link", () => ({ default: mockExtension }));
vi.mock("@tiptap/extension-image", () => ({ default: mockExtension }));
vi.mock("@tiptap/extension-placeholder", () => ({ default: mockExtension }));
vi.mock("@tiptap/extension-youtube", () => ({ default: mockExtension }));

describe("ExperienceForm Comprehensive Smoke Test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockImplementation((url: string) => {
      if (url === "/api/admin/categories") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ categories: [{ id: "1", name: "Trekking", icon: "Mountain" }] }),
        });
      }
      if (url === "/api/admin/settings") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ settings: { taxConfig: [] } }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    
    globalThis.URL.createObjectURL = vi.fn(() => "blob:url");
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  it("renders correctly", async () => {
    render(<ExperienceForm />);
    expect(screen.getByText(/Create New Trip/i)).toBeInTheDocument();
  });

  it("handles basic field changes", async () => {
    render(<ExperienceForm />);
    const titleInput = screen.getByLabelText(/Title/i);
    fireEvent.change(titleInput, { target: { value: "New Adventure" } });
    expect(titleInput).toHaveValue("New Adventure");
  });

  it("handles form submission", async () => {
    render(<ExperienceForm />);
    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: "Valid Trip" } });
    fireEvent.change(screen.getByLabelText(/Location/i), { target: { value: "Manali" } });
    fireEvent.change(screen.getByLabelText(/Total Gross Price/i), { target: { value: "1000" } });
    fireEvent.change(screen.getByLabelText(/Total Capacity/i), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText(/Duration/i), { target: { value: "5" } });
    
    // Trigger the mocked upload via test-id
    const coverInput = screen.getByTestId("cover-image-upload").querySelector('input[type="file"]');
    if (coverInput) fireEvent.change(coverInput, { target: { files: [] } });
    
    fireEvent.submit(screen.getByRole("form", { name: /Experience Form/i }));
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/api/admin/experiences"), expect.objectContaining({ method: "POST" }));
    }, { timeout: 10000 });
  }, 15000);

  it("triggers JSON export", async () => {
    render(<ExperienceForm initialData={{ title: "Test Trip" }} />);
    fireEvent.click(screen.getByText(/Export Data/i));
    fireEvent.click(screen.getByText(/Export JSON/i));
    expect(globalThis.URL.createObjectURL).toHaveBeenCalled();
  });

  it("triggers Excel export", async () => {
    render(<ExperienceForm initialData={{ title: "Test Trip" }} />);
    fireEvent.click(screen.getByText(/Export Data/i));
    fireEvent.click(screen.getByText(/Export Excel/i));
    await waitFor(() => {
      expect(XLSX.writeFile).toHaveBeenCalled();
    });
  });

  it("handles JSON import", async () => {
    render(<ExperienceForm />);
    fireEvent.click(screen.getByText(/Import Data/i));
    const file = new File([JSON.stringify({ title: "Imported" })], "test.json", { type: "application/json" });
    fireEvent.change(screen.getByLabelText(/Import JSON/i), { target: { files: [file] } });
    await waitFor(() => {
      expect(screen.getByLabelText(/Title/i)).toHaveValue("Imported");
    }, { timeout: 10000 });
  }, 15000);

  it("handles editing existing experience", async () => {
    const mockExperience: any = {
      id: "exp-1", 
      title: "Editing Mode", 
      location: "Leh", 
      basePrice: 2000, 
      capacity: 5, 
      durationDays: 3, 
      coverImage: "img.jpg",
      description: { type: "doc", content: [] },
      difficulty: "MODERATE",
      status: "DRAFT",
      isFeatured: false,
      categories: []
    };
    render(<ExperienceForm initialData={mockExperience} />);
    expect(screen.getByText(/Edit Trip/i)).toBeInTheDocument();
    fireEvent.submit(screen.getByRole("form", { name: /Experience Form/i }));
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/api/admin/experiences"), expect.objectContaining({ method: "PUT" }));
    });
  });

  it("shows error when importing invalid JSON file", async () => {
    render(<ExperienceForm />);
    fireEvent.click(screen.getByText(/Import Data/i));
    const badFile = new File(["not json"], "bad.json", { type: "application/json" });
    fireEvent.change(screen.getByLabelText(/Import JSON/i), { target: { files: [badFile] } });
    await waitFor(() => {
      expect(screen.getByText(/Invalid JSON file uploaded/i)).toBeInTheDocument();
    }, { timeout: 10000 });
  }, 15000);

  it("shows error when form submission fails", async () => {
    mockFetch.mockImplementation((url: string, opts?: any) => {
      if (url === "/api/admin/experiences" && opts?.method === "POST") {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: "API Server Error" }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    render(<ExperienceForm />);
    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: "Fail Trip" } });
    fireEvent.change(screen.getByLabelText(/Location/i), { target: { value: "Manali" } });
    fireEvent.change(screen.getByLabelText(/Total Gross Price/i), { target: { value: "1000" } });
    fireEvent.change(screen.getByLabelText(/Total Capacity/i), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText(/Duration/i), { target: { value: "5" } });
    
    // Trigger mocked upload via test-id
    const coverInputErr = screen.getByTestId("cover-image-upload").querySelector('input[type="file"]');
    if (coverInputErr) fireEvent.change(coverInputErr, { target: { files: [] } });

    fireEvent.submit(screen.getByRole("form", { name: /Experience Form/i }));
    await waitFor(() => {
      expect(screen.getByText(/API Server Error/i)).toBeInTheDocument();
    }, { timeout: 10000 });
  }, 15000);

  it("renders form even when category fetch fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockImplementation((url: string) => {
      if (url === "/api/admin/categories") return Promise.reject(new Error("Net Error"));
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    render(<ExperienceForm />);
    expect(screen.getByText(/Create New Trip/i)).toBeInTheDocument();
  });

  it("shows error when Excel import fails (malformed file)", async () => {
    vi.mocked(XLSX.read).mockImplementation(() => { throw new Error("Parse Error"); });
    render(<ExperienceForm />);
    fireEvent.click(screen.getByText(/Import Data/i));
    const mockExcel = new File(["dummy"], "test.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    fireEvent.change(screen.getByLabelText(/Import Excel \(.xlsx\)/i), { target: { files: [mockExcel] } });
    await waitFor(() => {
      expect(screen.getByText(/Failed to parse Excel file/i)).toBeInTheDocument();
    });
  });
});
