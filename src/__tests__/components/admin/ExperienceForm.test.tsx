import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ExperienceForm from "@/components/admin/ExperienceForm";
import { vi, describe, it, expect, beforeEach } from "vitest";
import React from "react";

const mockRouter = {
  push: vi.fn(),
  refresh: vi.fn(),
};

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

// Mock TiptapEditor
vi.mock("@/components/blog/TiptapEditor", () => ({
  default: ({ content, onChange }: any) => (
    <div data-testid="tiptap-mock">
      <button onClick={() => onChange({ type: "doc", content: [] })}>Update Tiptap</button>
    </div>
  ),
}));

// Mock MediaUploader
vi.mock("@/components/admin/MediaUploader", () => ({
  default: ({ onUploadComplete }: any) => (
    <div data-testid="media-uploader-mock">
      <button onClick={() => onUploadComplete("https://test.com/img.jpg")}>Upload Image</button>
    </div>
  ),
}));

// Mock XLSX
vi.mock("xlsx", () => ({
  utils: {
    book_new: vi.fn(() => ({})),
    json_to_sheet: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
    sheet_to_json: vi.fn(() => []),
  },
  writeFile: vi.fn(),
  read: vi.fn(() => ({ Sheets: {} })),
}));

// Mock URL
const mockCreateObjectURL = vi.fn(() => "blob:test");
const mockRevokeObjectURL = vi.fn();
vi.stubGlobal("URL", {
  createObjectURL: mockCreateObjectURL,
  revokeObjectURL: mockRevokeObjectURL,
});

// Mock crypto
let uuidCounter = 0;
vi.stubGlobal("crypto", {
  randomUUID: () => `test-uuid-${uuidCounter++}`,
});

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

vi.setConfig({ testTimeout: 30000 });

describe("ExperienceForm Comprehensive Smoke Test", () => {
  const initialData = {
    id: "exp-123",
    title: "Old Trip",
    description: {},
    basePrice: 1000,
    capacity: 10,
    durationDays: 2,
    location: "Paris",
    difficulty: "EASY",
    status: "DRAFT",
    categories: [{ categoryId: "cat-1" }],
    itinerary: [{ title: "Day 1", description: "Start" }],
    inclusions: ["Meal 1"],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ categories: [{ id: "cat-1", name: "Trek" }], settings: { taxConfig: [] } }),
      })
    );
  });

  it("renders correctly and loads categories", async () => {
    render(<ExperienceForm />);
    expect(screen.getByText(/Create New Trip/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/admin/categories");
    });
  });

  it("handles basic field changes", () => {
    render(<ExperienceForm />);
    const titleInput = screen.getByLabelText(/Title/i);
    fireEvent.change(titleInput, { target: { value: "New Trek" } });
    expect(titleInput).toHaveValue("New Trek");
  });

  it("manages dynamic itinerary days", () => {
    render(<ExperienceForm />);
    const addDayBtn = screen.getByText(/Add Day/i);
    fireEvent.click(addDayBtn);
    
    const dayTitles = screen.getAllByPlaceholderText(/Day \d Title/i);
    expect(dayTitles.length).toBe(2);
  });

  it("handles form submission", async () => {
    render(<ExperienceForm />);
    
    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: "Submission Trip" } });
    fireEvent.change(screen.getByLabelText(/Location/i), { target: { value: "Nepal" } });
    
    const form = screen.getByRole("form", { name: /Experience Form/i });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/admin/experiences", expect.objectContaining({
        method: "POST",
      }));
      expect(mockRouter.push).toHaveBeenCalledWith("/admin/experiences");
    });
  });

  it("triggers JSON export", () => {
    render(<ExperienceForm initialData={initialData} />);
    const exportBtn = screen.getByText(/Export Data/i);
    fireEvent.click(exportBtn);
    
    const jsonBtn = screen.getByText(/Export JSON/i);
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    
    fireEvent.click(jsonBtn);
    
    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it("triggers Excel export", async () => {
    render(<ExperienceForm initialData={initialData} />);
    const exportBtn = screen.getByText(/Export Data/i);
    fireEvent.click(exportBtn);
    
    const excelBtn = screen.getByText(/Export Excel/i);
    fireEvent.click(excelBtn);

    const XLSX = await import("xlsx");
    await waitFor(() => {
      expect(XLSX.writeFile).toHaveBeenCalled();
    });
  });

  it("handles JSON import", async () => {
    render(<ExperienceForm />);
    const importBtn = screen.getByText(/Import Data/i);
    fireEvent.click(importBtn);
    
    const jsonInput = screen.getByLabelText(/Import JSON/i);
    const mockFile = new File([JSON.stringify({ title: "Imported Trip" })], "test.json", { type: "application/json" });
    
    fireEvent.change(jsonInput, { target: { files: [mockFile] } });
    
    await waitFor(() => {
      expect(screen.getByDisplayValue("Imported Trip")).toBeInTheDocument();
    });
  });
});
