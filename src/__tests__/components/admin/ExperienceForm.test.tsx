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
  default: ({ onUploadSuccess }: any) => (
    <div data-testid="media-uploader-mock">
      <button onClick={() => onUploadSuccess(["https://test.com/img.jpg"])}>Upload Image</button>
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
  read: vi.fn(() => ({ 
    Sheets: {
      "Basic Info": {},
      "Itinerary": {},
      "FAQs": {},
      "Lists": {},
    } 
  })),
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
    basePrice: 10000,
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
        json: () => Promise.resolve({ 
          categories: [{ id: "cat-1", name: "Trek" }], 
          settings: { 
            taxConfig: [
              { id: "tax-1", name: "GST", percentage: 5 }
            ] 
          } 
        }),
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

  it("interacts with advanced UI fields (FAQs, Logistics, Pricing)", async () => {
    mockFetch.mockImplementation((url) => {
      if (url === "/api/admin/categories") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ categories: [{ id: "cat-1", name: "Trek" }] }),
        });
      }
      if (url === "/api/admin/settings") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            settings: { taxConfig: [{ id: "tax-1", name: "GST", percentage: 5 }] } 
          }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<ExperienceForm initialData={initialData} />);
    
    // 1. Text Fields
    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: "Advanced Trek" } });
    fireEvent.change(screen.getByLabelText(/Location/i), { target: { value: "Himalayas" } });
    fireEvent.change(screen.getByLabelText(/Meeting Point/i), { target: { value: "Dehradun" } });
    fireEvent.change(screen.getByLabelText(/Max Altitude/i), { target: { value: "15,000 ft" } });
    fireEvent.change(screen.getByLabelText(/Trek Distance/i), { target: { value: "50 km" } });
    fireEvent.change(screen.getByLabelText(/Best Season/i), { target: { value: "Spring" } });
    fireEvent.change(screen.getByLabelText(/Last ATM/i), { target: { value: "Basecamp" } });

    // 2. Selects & Checkboxes
    fireEvent.change(screen.getByLabelText(/Status/i), { target: { value: "PUBLISHED" } });
    fireEvent.change(screen.getByLabelText(/Difficulty/i), { target: { value: "HARD" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /Featured Trip/i }));

    // 3. Dynamic Arrays (Add/Edit/Remove)
    const arrayTesters = [
      { btn: /Add Inclusion/i, placeholder: /e\.g\. All meals/i },
      { btn: /Add Exclusion/i, placeholder: /e\.g\. Flights/i },
      { btn: /Add Item/i, placeholder: /e\.g\. Trekking shoes/i }, // Things to Carry
      { btn: /Add Location/i, placeholder: /e\.g\. Bangalore/i }, // Pickup Points
      { btn: /Add Highlight/i, placeholder: /e\.g\. Stargazing/i },
      { btn: /Add Vibe Tag/i, placeholder: /e\.g\. Solo-Female Friendly/i },
    ];

    for (const test of arrayTesters) {
      fireEvent.click(screen.getByText(test.btn));
      const inputs = screen.getAllByPlaceholderText(test.placeholder);
      fireEvent.change(inputs.at(-1)!, { target: { value: "Test Item" } });
    }

    // 4. Itinerary & Meals
    fireEvent.click(screen.getByText(/Add Day/i));
    const mealBtns = screen.getAllByText(/Breakfast|Lunch|Dinner|Snacks/i);
    fireEvent.click(mealBtns[0]); // Toggle Breakfast on Day 2

    // 5. FAQ
    fireEvent.click(screen.getByText(/Add FAQ/i));
    const questions = screen.getAllByPlaceholderText(/Question/i);
    fireEvent.change(questions.at(-1)!, { target: { value: "Is it safe?" } });

    // 6. Pricing & Revenue
    const priceInput = screen.getByLabelText(/Total Gross Price/i);
    fireEvent.change(priceInput, { target: { value: "50000" } });
    await waitFor(() => {
      expect(screen.getByText(/GST \(5%\)/i)).toBeInTheDocument();
      expect(screen.getByText(/₹2500\.00/i)).toBeInTheDocument();
    });

    // 7. Media Uploaders
    const uploadBtns = screen.getAllByText(/Upload Image/i);
    uploadBtns.forEach(btn => fireEvent.click(btn));

    // 8. Delete operations
    const trashBtns = screen.getAllByRole("button").filter(b => b.querySelector(".lucide-trash2"));
    trashBtns.slice(0, 3).forEach(btn => fireEvent.click(btn));

    // 9. Excel Import (Actual flow)
    const XLSX = await import("xlsx");
    (XLSX.read as any).mockReturnValue({
      Sheets: {
        "Basic Info": {},
        "Itinerary": {},
        "FAQs": {},
        "Lists": {},
      }
    });
    
    // Mock sheet_to_json with a sequence that matches the component's calls
    const mockSheetToJson = XLSX.utils.sheet_to_json as any;
    mockSheetToJson.mockReset();
    mockSheetToJson
      .mockReturnValueOnce([ { Key: "title", Value: "Excel Trip" } ]) // Basic Info
      .mockReturnValueOnce([ { Title: "Day 1", Description: "Start", Meals: "Breakfast, Lunch", Accommodation: "Hotel" } ]) // Itinerary
      .mockReturnValueOnce([ { Question: "Q1", Answer: "A1" } ]) // FAQs
      .mockReturnValueOnce([ { Inclusions: "Inc 1", Exclusions: "Exc 1" } ]); // Lists

    const importBtn = screen.getByText(/Import Data/i);
    fireEvent.click(importBtn);
    const excelInput = screen.getByLabelText(/Import Excel \(.xlsx\)/i);
    const mockExcel = new File(["dummy"], "test.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    fireEvent.change(excelInput, { target: { files: [mockExcel] } });

    await waitFor(() => {
      expect(screen.getByDisplayValue("Excel Trip")).toBeInTheDocument();
    });

    // 10. Submission (Update)
    const form = screen.getByRole("form", { name: /Experience Form/i });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/api/admin/experiences"), expect.objectContaining({
        method: "PUT",
      }));
    });
  });
});
