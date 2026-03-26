 
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  GripVertical,
  Image as ImageIcon,
  Save,
  ArrowLeft,
  Info,
  Download,
  Upload,
} from "lucide-react";
import Link from "next/link";
import MediaUploader from "./MediaUploader";
import { ASPECT_RATIOS } from "@/lib/constants/aspect-ratios";
import TiptapEditor from "../blog/TiptapEditor";
import { RichTextNode } from "@/lib/utils/rich-text";

interface Category {
  id: string;
  name: string;
}

export interface ItineraryDay {
  _id?: string;
  title: string;
  description: string;
  meals?: string[];
  accommodation?: string;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface ExperienceFormData {
  id?: string;
  title: string;
  description: RichTextNode | string; // ProseMirror/Tiptap JSON
  basePrice: number;
  capacity: number;
  durationDays: number;
  location: string;
  difficulty: string;
  status: string;
  isFeatured: boolean;
  coverImage: string;
  cardImage: string;
  images: string[];
  itinerary: ItineraryDay[];
  categories?: { categoryId: string }[];
  inclusions?: string[];
  exclusions?: string[];
  thingsToCarry?: string[];
  faqs?: FAQ[];
  cancellationPolicy?: string;
  meetingPoint?: string;
  minAge?: number | string | null;
  maxAltitude?: string;
  trekDistance?: string;
  bestTimeToVisit?: string;
  maxGroupSize?: number | string | null;
  highlights?: string[];
  vibeTags?: string[];
  networkConnectivity?: string;
  lastAtm?: string;
  fitnessRequirement?: string;
  ageRange?: string;
  meetingTime?: string;
  dropoffTime?: string;
  pickupPoints?: string[];
}

const MEAL_OPTIONS = ["Breakfast", "Lunch", "Dinner", "Snacks"];

function MealButtons({ 
  meals, 
  onToggle 
}: Readonly<{ 
  meals: string[]; 
  onToggle: (meal: string) => void 
}>) {
  return (
    <div className="flex gap-2 flex-wrap">
      {MEAL_OPTIONS.map(meal => {
        const isSelected = meals.includes(meal);
        return (
          <button
            key={meal}
            type="button"
            onClick={() => onToggle(meal)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
              isSelected 
                ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                : "bg-background text-foreground/60 border-border hover:border-primary/50 hover:text-foreground"
            }`}
          >
            {meal}
          </button>
        );
      })}
    </div>
  );
}

export default function ExperienceForm({
  initialData = null,
}: Readonly<{
  initialData?: ExperienceFormData | null;
}>) {
  const router = useRouter();
  const isEditing = !!initialData;

  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [taxes, setTaxes] = useState<{ id: string; name: string; percentage: number }[]>([]);

  // Form State
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState<RichTextNode | string>(
    initialData?.description || {},
  );
  const [basePrice, setBasePrice] = useState(initialData?.basePrice || 0);
  const [capacity, setCapacity] = useState(initialData?.capacity || 10);
  const [durationDays, setDurationDays] = useState(
    initialData?.durationDays || 1,
  );
  const [location, setLocation] = useState(initialData?.location || "");
  const [difficulty, setDifficulty] = useState(
    initialData?.difficulty || "EASY",
  );
  const [status, setStatus] = useState(initialData?.status || "DRAFT");
  const [isFeatured, setIsFeatured] = useState(
    initialData?.isFeatured || false,
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialData?.categories?.map((c) => c.categoryId) ||
      [],
  );

  // Images
  const [coverImage, setCoverImage] = useState<string>(
    initialData?.coverImage || "",
  );
  const [cardImage, setCardImage] = useState<string>(
    initialData?.cardImage || "",
  );
  const [images, setImages] = useState<string[]>(initialData?.images || []);

  const [itinerary, setItinerary] = useState<ItineraryDay[]>(
    (initialData?.itinerary || [{ title: "", description: "" }]).map(
      (d) => ({
        ...d,
        _id: d._id || crypto.randomUUID(),
      }),
    ) as ItineraryDay[],
  );

  // New Array States with stable IDs
  const [inclusions, setInclusions] = useState<{ id: string; text: string }[]>(
    (initialData?.inclusions || []).map((text: string) => ({
      id: crypto.randomUUID(),
      text,
    })),
  );
  const [exclusions, setExclusions] = useState<{ id: string; text: string }[]>(
    (initialData?.exclusions || []).map((text: string) => ({
      id: crypto.randomUUID(),
      text,
    })),
  );
  const [thingsToCarry, setThingsToCarry] = useState<
    { id: string; text: string }[]
  >(
    (initialData?.thingsToCarry || []).map((text: string) => ({
      id: crypto.randomUUID(),
      text,
    })),
  );
  const [faqs, setFaqs] = useState<
    { id: string; question: string; answer: string }[]
  >(
    (initialData?.faqs || []).map((faq: FAQ) => ({
      id: crypto.randomUUID(),
      ...faq,
    })),
  );
  const [pickupPoints, setPickupPoints] = useState<
    { id: string; text: string }[]
  >(
    (initialData?.pickupPoints || []).map((text: string) => ({
      id: crypto.randomUUID(),
      text,
    })),
  );

  // New Logistic States
  const [cancellationPolicy, setCancellationPolicy] = useState(
    initialData?.cancellationPolicy || "",
  );
  const [meetingPoint, setMeetingPoint] = useState(
    initialData?.meetingPoint || "",
  );
  const [minAge, setMinAge] = useState(initialData?.minAge || "");
  const [maxAltitude, setMaxAltitude] = useState(
    initialData?.maxAltitude || "",
  );
  const [trekDistance, setTrekDistance] = useState(
    initialData?.trekDistance || "",
  );
  const [bestTimeToVisit, setBestTimeToVisit] = useState(
    initialData?.bestTimeToVisit || "",
  );
  const [maxGroupSize, setMaxGroupSize] = useState(
    initialData?.maxGroupSize || "",
  );

  // Comprehensive Metadata
  const [highlights, setHighlights] = useState<{ id: string; text: string }[]>(
    (initialData?.highlights || []).map((text: string) => ({
      id: crypto.randomUUID(),
      text,
    })),
  );
  const [vibeTags, setVibeTags] = useState<{ id: string; text: string }[]>(
    (initialData?.vibeTags || []).map((text: string) => ({
      id: crypto.randomUUID(),
      text,
    })),
  );
  const [networkConnectivity, setNetworkConnectivity] = useState(initialData?.networkConnectivity || "");
  const [lastAtm, setLastAtm] = useState(initialData?.lastAtm || "");
  const [fitnessRequirement, setFitnessRequirement] = useState(initialData?.fitnessRequirement || "");
  const [ageRange, setAgeRange] = useState(initialData?.ageRange || "");
  const [meetingTime, setMeetingTime] = useState(initialData?.meetingTime || "");
  const [dropoffTime, setDropoffTime] = useState(initialData?.dropoffTime || "");

  useEffect(() => {
    // Fetch available categories
    const fetchCats = async () => {
      try {
        const res = await fetch("/api/admin/categories");
        const data = await res.json();
        setCategories(data.categories || []);
      } catch (err) {
        console.error("Failed to load categories:", err);
      }
    };
    
    // Fetch Taxes
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/admin/settings");
        const data = await res.json();
        if (data.settings && Array.isArray(data.settings.taxConfig)) {
          setTaxes(data.settings.taxConfig);
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      }
    };

    fetchCats();
    fetchSettings();
  }, []);

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const handleItineraryChange = (
    index: number,
    field: keyof ItineraryDay,
    value: string | string[],
  ) => {
    setItinerary((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addItineraryDay = () =>
    setItinerary((prev) => [
      ...prev,
      {
        _id: crypto.randomUUID(),
        title: "",
        description: "",
      },
    ]);
  const removeItineraryDay = (index: number) =>
    setItinerary((prev) => prev.filter((_, i) => i !== index));

  // Array Handlers
  // Array Handlers for stable object-based states
  const handleStringArrayChange = (
    setter: React.Dispatch<
      React.SetStateAction<{ id: string; text: string }[]>
    >,
    id: string,
    value: string,
  ) => {
    setter((prev) =>
      prev.map((item) => (item.id === id ? { ...item, text: value } : item)),
    );
  };

  const addStringArrayItem = (
    setter: React.Dispatch<
      React.SetStateAction<{ id: string; text: string }[]>
    >,
  ) => {
    setter((prev) => [...prev, { id: crypto.randomUUID(), text: "" }]);
  };

  const removeStringArrayItem = (
    setter: React.Dispatch<
      React.SetStateAction<{ id: string; text: string }[]>
    >,
    id: string,
  ) => {
    setter((prev) => prev.filter((item) => item.id !== id));
  };

  // FAQ Handlers
  const handleFaqChange = (
    id: string,
    field: "question" | "answer",
    value: string,
  ) => {
    setFaqs((prev) =>
      prev.map((faq) => (faq.id === id ? { ...faq, [field]: value } : faq)),
    );
  };

  const addFaq = () =>
    setFaqs((prev) => [
      ...prev,
      { id: crypto.randomUUID(), question: "", answer: "" },
    ]);
  const removeFaq = (id: string) =>
    setFaqs((prev) => prev.filter((faq) => faq.id !== id));

  const addImageUrl = () => setImages((prev) => [...prev, ""]);
  const updateImageUrl = (index: number, val: string) => {
    setImages((prev) => {
      const updated = [...prev];
      updated[index] = val;
      return updated;
    });
  };
  const removeImageUrl = (index: number) =>
    setImages((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    const payload = {
      title,
      description,
      basePrice: Number(basePrice),
      capacity: Number(capacity),
      durationDays: Number(durationDays),
      location,
      difficulty,
      status,
      isFeatured,
      coverImage,
      cardImage,
      images: images.filter((url) => url.trim() !== ""),
      itinerary,
      categoryIds: selectedCategories,
      inclusions: inclusions
        .map((item) => item.text)
        .filter((item) => item.trim() !== ""),
      exclusions: exclusions
        .map((item) => item.text)
        .filter((item) => item.trim() !== ""),
      thingsToCarry: thingsToCarry
        .map((item) => item.text)
        .filter((item) => item.trim() !== ""),
      pickupPoints: pickupPoints
        .map((item) => item.text)
        .filter((item) => item.trim() !== ""),
      faqs: faqs
        .filter((faq) => faq.question.trim() !== "" && faq.answer.trim() !== "")
        .map(({ question, answer }) => ({ question, answer })),
      cancellationPolicy,
      meetingPoint,
      minAge: minAge ? Number(minAge) : null,
      maxAltitude,
      trekDistance,
      bestTimeToVisit,
      maxGroupSize: maxGroupSize ? Number(maxGroupSize) : null,
      highlights: highlights.map((item) => item.text).filter((item) => item.trim() !== ""),
      networkConnectivity,
      lastAtm,
      fitnessRequirement,
      ageRange,
      meetingTime,
      dropoffTime,
      vibeTags: vibeTags.map((item) => item.text).filter((item) => item.trim() !== ""),
    };

    try {
      const url = isEditing
        ? `/api/admin/experiences/${initialData.id}`
        : "/api/admin/experiences";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save experience");

      router.push("/admin/experiences");
      router.refresh(); // Ensure the list page shows the new data
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save experience");
    } finally {
      setIsSubmitting(false);
    }
  };

  const applyBasicData = (data: Partial<ExperienceFormData>) => {
    if (data.title) setTitle(data.title);
    if (data.description && typeof data.description === 'object' && Object.keys(data.description as object).length > 0) setDescription(data.description);
    if (data.basePrice !== undefined) setBasePrice(data.basePrice);
    if (data.capacity !== undefined) setCapacity(data.capacity);
    if (data.durationDays !== undefined) setDurationDays(data.durationDays);
    if (data.location) setLocation(data.location);
    if (data.difficulty) setDifficulty(data.difficulty);
    if (data.status) setStatus(data.status);
    if (data.isFeatured !== undefined) setIsFeatured(data.isFeatured);
    if (data.coverImage) setCoverImage(data.coverImage);
    if (data.cardImage) setCardImage(data.cardImage);
    if (data.images) setImages(data.images);
    if (data.categories) setSelectedCategories(data.categories.map(c => c.categoryId));
  };

  const applyListData = (data: Partial<ExperienceFormData>) => {
    if (data.itinerary) setItinerary(data.itinerary.map((d: ItineraryDay) => ({ ...d, _id: crypto.randomUUID() })));
    const mapToObj = (arr: string[] | undefined) => arr?.map((text) => ({ id: crypto.randomUUID(), text })) || [];
    if (data.inclusions) setInclusions(mapToObj(data.inclusions));
    if (data.exclusions) setExclusions(mapToObj(data.exclusions));
    if (data.thingsToCarry) setThingsToCarry(mapToObj(data.thingsToCarry));
    if (data.highlights) setHighlights(mapToObj(data.highlights));
    if (data.vibeTags) setVibeTags(mapToObj(data.vibeTags));
    if (data.pickupPoints) setPickupPoints(mapToObj(data.pickupPoints));
    if (data.faqs) setFaqs(data.faqs.map((f: FAQ) => ({ ...f, id: crypto.randomUUID() })));
  };

  const applyLogisticsData = (data: Partial<ExperienceFormData>) => {
    if (data.cancellationPolicy !== undefined) setCancellationPolicy(data.cancellationPolicy || "");
    if (data.meetingPoint !== undefined) setMeetingPoint(data.meetingPoint || "");
    if (data.minAge !== undefined) setMinAge(data.minAge || "");
    if (data.maxAltitude !== undefined) setMaxAltitude(data.maxAltitude || "");
    if (data.trekDistance !== undefined) setTrekDistance(data.trekDistance || "");
    if (data.bestTimeToVisit !== undefined) setBestTimeToVisit(data.bestTimeToVisit || "");
    if (data.maxGroupSize !== undefined) setMaxGroupSize(data.maxGroupSize || "");
    if (data.networkConnectivity !== undefined) setNetworkConnectivity(data.networkConnectivity || "");
    if (data.lastAtm !== undefined) setLastAtm(data.lastAtm || "");
    if (data.fitnessRequirement !== undefined) setFitnessRequirement(data.fitnessRequirement || "");
    if (data.ageRange !== undefined) setAgeRange(data.ageRange || "");
    if (data.meetingTime !== undefined) setMeetingTime(data.meetingTime || "");
    if (data.dropoffTime !== undefined) setDropoffTime(data.dropoffTime || "");
  };

  const applyImportedData = (data: Partial<ExperienceFormData>) => {
    applyBasicData(data);
    applyListData(data);
    applyLogisticsData(data);
  };

  const currentPayload = () => ({
    title, description, basePrice, capacity, durationDays, location, difficulty, status, isFeatured,
    coverImage, cardImage, images, itinerary, categories: selectedCategories,
    inclusions: inclusions.map((i) => i.text), exclusions: exclusions.map((i) => i.text),
    thingsToCarry: thingsToCarry.map((i) => i.text), pickupPoints: pickupPoints.map((i) => i.text),
    faqs, cancellationPolicy, meetingPoint, minAge, maxAltitude, trekDistance, bestTimeToVisit, maxGroupSize,
    highlights: highlights.map((i) => i.text), networkConnectivity, lastAtm, fitnessRequirement, ageRange, meetingTime, dropoffTime,
    vibeTags: vibeTags.map((i) => i.text),
  });

  const getExportFilename = () => `${title ? title.toLowerCase().replaceAll(/\s+/g, '-') : 'trip'}-export`;

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(currentPayload(), null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${getExportFilename()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      applyImportedData(data);
      setError("");
    } catch {
      setError("Invalid JSON file uploaded.");
    }
    e.target.value = "";
  };

  // Define local interfaces for XLSX and Workbook to avoid 'any'
  interface WorkSheet {
    [key: string]: unknown;
  }

  interface WorkBook {
    Sheets: { [sheetName: string]: WorkSheet };
    SheetNames: string[];
  }

  interface XLSXUtils {
    sheet_to_json<T>(worksheet: WorkSheet, opts?: unknown): T[];
    book_new(): WorkBook;
    book_append_sheet(workbook: WorkBook, worksheet: WorkSheet, sheetName: string): void;
    json_to_sheet(data: unknown[], opts?: unknown): WorkSheet;
  }

  interface XLSXLib {
    utils: XLSXUtils;
    read(data: Uint8Array, opts?: unknown): WorkBook;
    writeFile(workbook: WorkBook, filename: string, opts?: unknown): void;
  }

  const ensureString = (val: unknown): string => {
    if (typeof val === "string") return val;
    if (val === null || val === undefined) return "";
    if (typeof val === "object") {
      try {
        return JSON.stringify(val);
      } catch {
        return String(val);
      }
    }
    return String(val);
  };

  const parseExcelBasicInfo = (imported: Partial<Record<string, unknown>>, wb: WorkBook, XLSX: XLSXLib) => {
    if (wb.Sheets["Basic Info"]) {
      const basicInfo = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets["Basic Info"]);
      basicInfo.forEach((row) => {
        if (row.Key && row.Value !== undefined) imported[ensureString(row.Key)] = row.Value;
      });
    }
  };

  const parseExcelItinerary = (imported: Partial<ExperienceFormData>, wb: WorkBook, XLSX: XLSXLib) => {
    if (wb.Sheets["Itinerary"]) {
      const itinRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets["Itinerary"]);
      imported.itinerary = itinRows.map((row) => ({
        title: ensureString(row.Title),
        description: ensureString(row.Description),
        meals: (typeof row.Meals === 'string') ? row.Meals.split(",").map((m: string) => m.trim()).filter(Boolean) : [],
        accommodation: ensureString(row.Accommodation)
      }));
    }
  };

  const parseExcelFaqs = (imported: Partial<ExperienceFormData>, wb: WorkBook, XLSX: XLSXLib) => {
    if (wb.Sheets["FAQs"]) {
      const faqRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets["FAQs"]);
      imported.faqs = faqRows.map((row) => ({
        question: ensureString(row.Question),
        answer: ensureString(row.Answer)
      }));
    }
  };

  const parseExcelLists = (imported: Partial<ExperienceFormData>, wb: WorkBook, XLSX: XLSXLib) => {
    if (wb.Sheets["Lists"]) {
      const listRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets["Lists"]);
      imported.inclusions = listRows.map((r) => ensureString(r.Inclusions)).filter(Boolean);
      imported.exclusions = listRows.map((r) => ensureString(r.Exclusions)).filter(Boolean);
      imported.thingsToCarry = listRows.map((r) => ensureString(r.ThingsToCarry)).filter(Boolean);
      imported.highlights = listRows.map((r) => ensureString(r.Highlights)).filter(Boolean);
      imported.vibeTags = listRows.map((r) => ensureString(r.VibeTags)).filter(Boolean);
      imported.pickupPoints = listRows.map((r) => ensureString(r.PickupPoints)).filter(Boolean);
    }
  };

  const handleExportExcel = () => {
    import("xlsx").then((XLSX) => {
      const basicInfoData = [
        { Key: "title", Value: title },
        { Key: "basePrice", Value: basePrice },
        { Key: "capacity", Value: capacity },
        { Key: "durationDays", Value: durationDays },
        { Key: "location", Value: location },
        { Key: "difficulty", Value: difficulty },
        { Key: "status", Value: status },
        { Key: "minAge", Value: minAge },
        { Key: "maxAltitude", Value: maxAltitude },
        { Key: "trekDistance", Value: trekDistance },
        { Key: "bestTimeToVisit", Value: bestTimeToVisit },
        { Key: "maxGroupSize", Value: maxGroupSize },
        { Key: "networkConnectivity", Value: networkConnectivity },
        { Key: "lastAtm", Value: lastAtm },
        { Key: "fitnessRequirement", Value: fitnessRequirement },
        { Key: "ageRange", Value: ageRange },
        { Key: "meetingTime", Value: meetingTime },
        { Key: "dropoffTime", Value: dropoffTime },
        { Key: "meetingPoint", Value: meetingPoint },
        { Key: "cancellationPolicy", Value: cancellationPolicy }
      ];
      
      const itineraryData = itinerary.map((d, i) => ({
        Day: i + 1,
        Title: d.title,
        Description: d.description,
        Meals: d.meals?.join(", ") || "",
        Accommodation: d.accommodation || ""
      }));

      const faqsData = faqs.map(f => ({
        Question: f.question,
        Answer: f.answer
      }));

      const maxLen = Math.max(inclusions.length, exclusions.length, thingsToCarry.length, highlights.length, vibeTags.length, pickupPoints.length);
      const listsData = [];
      for (let i = 0; i < maxLen; i++) {
        listsData.push({
          Inclusions: inclusions[i]?.text || "",
          Exclusions: exclusions[i]?.text || "",
          ThingsToCarry: thingsToCarry[i]?.text || "",
          Highlights: highlights[i]?.text || "",
          VibeTags: vibeTags[i]?.text || "",
          PickupPoints: pickupPoints[i]?.text || "",
        });
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(basicInfoData), "Basic Info");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(itineraryData), "Itinerary");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(faqsData), "FAQs");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(listsData), "Lists");

      XLSX.writeFile(wb, `${getExportFilename()}.xlsx`);
    });
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const data = new Uint8Array(buffer);
      const wb = XLSX.read(data, { type: 'array' });
      
      const imported: Partial<ExperienceFormData> = {};
      parseExcelBasicInfo(imported as Record<string, unknown>, wb, XLSX);
      parseExcelItinerary(imported, wb, XLSX);
      parseExcelFaqs(imported, wb, XLSX);
      parseExcelLists(imported, wb, XLSX);
      
      applyImportedData(imported);
      setError("");
    } catch (err) {
      setError("Failed to parse Excel file. Ensure it follows the export template structure.");
      console.error(err);
    }
    e.target.value = "";
  };
  
  const [showImportOptions, setShowImportOptions] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);


  return (
    <form onSubmit={handleSubmit} aria-label="Experience Form" className="max-w-4xl pb-24">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/experiences"
            className="p-2 hover:bg-foreground/10 rounded-full transition-colors text-foreground/50 hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-3xl font-heading font-bold text-foreground">
            {isEditing ? "Edit Trip" : "Create New Trip"}
          </h1>
        </div>
        <div className="flex items-center gap-3 relative">
          
          {/* Import Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowImportOptions(!showImportOptions)}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors border border-border"
            >
              <Upload className="w-4 h-4" />
              Import Data
            </button>
            {showImportOptions && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-lg shadow-black/10 overflow-hidden z-10 flex flex-col p-1">
                <label className="px-4 py-2.5 hover:bg-foreground/5 cursor-pointer text-sm font-medium transition-colors text-foreground flex items-center gap-2 rounded-lg">
                  <input type="file" accept=".json" className="hidden" onChange={(e) => { handleImportJSON(e); setShowImportOptions(false); }} />
                  <span>Import JSON</span>
                </label>
                <label className="px-4 py-2.5 hover:bg-foreground/5 cursor-pointer text-sm font-medium transition-colors text-foreground flex items-center gap-2 rounded-lg">
                  <input type="file" accept=".xlsx" className="hidden" onChange={(e) => { handleImportExcel(e); setShowImportOptions(false); }} />
                  <span>Import Excel (.xlsx)</span>
                </label>
              </div>
            )}
            {showImportOptions && <button type="button" aria-label="Close menu" className="fixed inset-0 z-0 w-full h-full cursor-default border-none bg-transparent" onClick={() => setShowImportOptions(false)} />}
          </div>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExportOptions(!showExportOptions)}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors border border-border"
            >
              <Download className="w-4 h-4" />
              Export Data
            </button>
            {showExportOptions && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-lg shadow-black/10 overflow-hidden z-10 flex flex-col p-1">
                <button
                  type="button"
                  onClick={() => { handleExportJSON(); setShowExportOptions(false); }}
                  className="px-4 py-2.5 hover:bg-foreground/5 text-left text-sm font-medium transition-colors text-foreground flex items-center gap-2 rounded-lg"
                >
                  Export JSON
                </button>
                <button
                  type="button"
                  onClick={() => { handleExportExcel(); setShowExportOptions(false); }}
                  className="px-4 py-2.5 hover:bg-foreground/5 text-left text-sm font-medium transition-colors text-foreground flex items-center gap-2 rounded-lg"
                >
                  Export Excel (.xlsx)
                </button>
              </div>
            )}
            {showExportOptions && <button type="button" aria-label="Close menu" className="fixed inset-0 z-0 w-full h-full cursor-default border-none bg-transparent" onClick={() => setShowExportOptions(false)} />}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-primary/25"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? "Saving..." : "Save Trip"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 font-medium">
          {error}
        </div>
      )}

      {/* Grid Layout for Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Main Content (Left Column) */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-foreground border-b border-border pb-2">
              Basic Info
            </h2>
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-foreground/80 mb-1"
              >
                Title
              </label>
              <input
                id="title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary/50"
                placeholder="e.g. Everest Base Camp Trek"
              />
            </div>
            <div>
              <label
                htmlFor="desc"
                className="block text-sm font-medium text-foreground/80 mb-1"
              >
                Description
              </label>
              <TiptapEditor
                content={description as string | object}
                onChange={setDescription}
                placeholder="Describe the experience..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="loc"
                  className="block text-sm font-medium text-foreground/80 mb-1"
                >
                  Location
                </label>
                <input
                  id="loc"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary/50"
                  placeholder="e.g. Nepal"
                />
              </div>
              <div>
                <label
                  htmlFor="dur"
                  className="block text-sm font-medium text-foreground/80 mb-1"
                >
                  Duration (Days)
                </label>
                <input
                  id="dur"
                  type="number"
                  min="1"
                  required
                  value={durationDays}
                  onChange={(e) => setDurationDays(Number(e.target.value))}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary/50"
                />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-foreground border-b border-border pb-2">
              Itinerary Builder
            </h2>
            {itinerary.map((day, ix) => (
              <div
                key={day._id || `itinerary-${ix}`}
                className="bg-background border border-border rounded-xl p-4 flex gap-4"
              >
                <div className="text-foreground/50 pt-2 cursor-grab">
                  <GripVertical className="w-5 h-5" />
                </div>
                <div className="flex-1 space-y-3">
                  <input
                    type="text"
                    value={day.title}
                    onChange={(e) =>
                      handleItineraryChange(ix, "title", e.target.value)
                    }
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-primary/50 font-bold"
                    placeholder={`Day ${ix + 1} Title (e.g. Arrival in Kathmandu)`}
                    required
                  />
                  <textarea
                    rows={2}
                    value={day.description}
                    onChange={(e) =>
                      handleItineraryChange(ix, "description", e.target.value)
                    }
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-primary/50"
                    placeholder="Day description..."
                    required
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/50">
                    <div>
                      <span className="block text-xs font-semibold text-foreground/60 mb-2">
                        Meals Included
                      </span>
                      <MealButtons
                        meals={Array.isArray(day.meals)
                          ? day.meals
                          : []}
                        onToggle={(meal) => {
                          const currentMeals = Array.isArray(day.meals)
                            ? day.meals
                            : [];
                          const nextMeals = currentMeals.includes(meal)
                            ? currentMeals.filter((m) => m !== meal)
                            : [...currentMeals, meal];
                          handleItineraryChange(ix, "meals", nextMeals);
                        }}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`accommodation-${ix}`}
                        className="block text-xs font-semibold text-foreground/60 mb-2"
                      >
                        Accommodation (Optional)
                      </label>
                      <input
                        id={`accommodation-${ix}`}
                        type="text"
                        value={day.accommodation || ""}
                        onChange={(e) =>
                          handleItineraryChange(ix, "accommodation", e.target.value)
                        }
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-primary/50"
                        placeholder="e.g. Alpine Tent"
                      />
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeItineraryDay(ix)}
                  className="text-foreground/50 hover:text-red-500 transition-colors p-2 h-fit"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addItineraryDay}
              className="w-full py-3 border-2 border-dashed border-border rounded-xl text-foreground/60 hover:text-foreground hover:border-foreground/30 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <Plus className="w-4 h-4" /> Add Day
            </button>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-foreground border-b border-border pb-2">
              Trip Cover Image
            </h2>
            <p className="text-sm text-foreground/60 pb-2">
              The main hero banner at the top of the trip page.
            </p>
            <MediaUploader
              id="cover-image-upload"
              shouldCrop={true}
              aspectRatio={ASPECT_RATIOS.EXPERIENCE_COVER}
              onUploadSuccess={(urls) => {
                if (urls && urls.length > 0) setCoverImage(urls[0]);
              }}
            />
            {coverImage && (
              <div className="flex gap-2 items-center bg-background border border-border rounded-lg px-3 py-2 mt-2">
                <ImageIcon className="w-4 h-4 text-primary" />
                <input
                  type="url"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  className="w-full bg-transparent text-sm text-foreground focus:outline-none"
                  placeholder="https://example.com/cover.jpg"
                />
                <button
                  type="button"
                  onClick={() => setCoverImage("")}
                  className="p-1 text-foreground/50 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-foreground border-b border-border pb-2">
              Trip Card Image
            </h2>
            <p className="text-sm text-foreground/60 pb-2">
              The square/portrait thumbnail shown on the homepage and catalog.
            </p>
            <MediaUploader
              id="card-image-upload"
              shouldCrop={true}
              aspectRatio={ASPECT_RATIOS.EXPERIENCE_CARD}
              onUploadSuccess={(urls) => {
                if (urls && urls.length > 0) setCardImage(urls[0]);
              }}
            />
            {cardImage && (
              <div className="flex gap-2 items-center bg-background border border-border rounded-lg px-3 py-2 mt-2">
                <ImageIcon className="w-4 h-4 text-primary" />
                <input
                  type="url"
                  value={cardImage}
                  onChange={(e) => setCardImage(e.target.value)}
                  className="w-full bg-transparent text-sm text-foreground focus:outline-none"
                  placeholder="https://example.com/card.jpg"
                />
                <button
                  type="button"
                  onClick={() => setCardImage("")}
                  className="p-1 text-foreground/50 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-foreground border-b border-border pb-2">
              Gallery Images
            </h2>
            <p className="text-sm text-foreground/60 pb-2">
              Additional photos to display in the trip&apos;s gallery section.
            </p>

            <MediaUploader
              id="gallery-images-upload"
              shouldCrop={true}
              aspectRatio={ASPECT_RATIOS.GALLERY_IMAGE}
              onUploadSuccess={(urls) => {
                if (urls && urls.length > 0) {
                  setImages((prev) => [...prev, ...urls]);
                }
              }}
            />

            {images.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border space-y-2">
                <h3 className="text-sm font-medium text-foreground mb-3">
                  Attached Media
                </h3>
                {images.map((url, ix) => (
                  <div key={`${url}-${ix}`} className="flex gap-2">
                    <div className="flex-1 flex gap-2 items-center bg-background border border-border rounded-lg px-3 py-2">
                      <ImageIcon className="w-4 h-4 text-foreground/50" />
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => updateImageUrl(ix, e.target.value)}
                        className="w-full bg-transparent text-sm text-foreground focus:outline-none"
                        placeholder="https://example.com/image.jpg"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeImageUrl(ix)}
                      className="p-2 text-foreground/50 hover:text-red-500 transition-colors rounded-lg bg-background border border-border"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addImageUrl}
                  className="font-medium text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Add another image
                </button>
              </div>
            )}
          </div>

          {/* Detailed Information Sections */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
            <h2 className="text-xl font-bold text-foreground border-b border-border pb-2">
              Detailed Information
            </h2>

            {/* Inclusions */}
            <div className="space-y-3">
              <span className="block text-sm font-bold text-foreground/80">
                Inclusions
              </span>
              {inclusions.map((item) => (
                <div key={item.id} className="flex gap-2">
                  <input
                    type="text"
                    value={item.text}
                    onChange={(e) =>
                      handleStringArrayChange(
                        setInclusions,
                        item.id,
                        e.target.value,
                      )
                    }
                    className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
                    placeholder="e.g. All meals during the trek"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      removeStringArrayItem(setInclusions, item.id)
                    }
                    className="p-2 text-foreground/50 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addStringArrayItem(setInclusions)}
                className="text-xs font-medium text-primary flex items-center gap-1 hover:text-primary/80"
              >
                <Plus className="w-3 h-3" /> Add Inclusion
              </button>
            </div>

            {/* Exclusions */}
            <div className="space-y-3 border-t border-border pt-4">
              <span className="block text-sm font-bold text-foreground/80">
                Exclusions
              </span>
              {exclusions.map((item) => (
                <div key={item.id} className="flex gap-2">
                  <input
                    type="text"
                    value={item.text}
                    onChange={(e) =>
                      handleStringArrayChange(
                        setExclusions,
                        item.id,
                        e.target.value,
                      )
                    }
                    className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
                    placeholder="e.g. Flights to basecamp"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      removeStringArrayItem(setExclusions, item.id)
                    }
                    className="p-2 text-foreground/50 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addStringArrayItem(setExclusions)}
                className="text-xs font-medium text-primary flex items-center gap-1 hover:text-primary/80"
              >
                <Plus className="w-3 h-3" /> Add Exclusion
              </button>
            </div>

            {/* Things to Carry */}
            <div className="space-y-3 border-t border-border pt-4">
              <span className="block text-sm font-bold text-foreground/80">
                Things to Carry
              </span>
              {thingsToCarry.map((item) => (
                <div key={item.id} className="flex gap-2">
                  <input
                    type="text"
                    value={item.text}
                    onChange={(e) =>
                      handleStringArrayChange(
                        setThingsToCarry,
                        item.id,
                        e.target.value,
                      )
                    }
                    className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
                    placeholder="e.g. Trekking shoes"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      removeStringArrayItem(setThingsToCarry, item.id)
                    }
                    className="p-2 text-foreground/50 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addStringArrayItem(setThingsToCarry)}
                className="text-xs font-medium text-primary flex items-center gap-1 hover:text-primary/80"
              >
                <Plus className="w-3 h-3" /> Add Item
              </button>
            </div>

            {/* Pickup Points */}
            <div className="space-y-3 border-t border-border pt-4">
              <span className="block text-sm font-bold text-foreground/80">
                Pickup & Drop Locations
              </span>
              {pickupPoints.map((item) => (
                <div key={item.id} className="flex gap-2">
                  <input
                    type="text"
                    value={item.text}
                    onChange={(e) =>
                      handleStringArrayChange(
                        setPickupPoints,
                        item.id,
                        e.target.value,
                      )
                    }
                    className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
                    placeholder="e.g. Bangalore"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      removeStringArrayItem(setPickupPoints, item.id)
                    }
                    className="p-2 text-foreground/50 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addStringArrayItem(setPickupPoints)}
                className="text-xs font-medium text-primary flex items-center gap-1 hover:text-primary/80"
              >
                <Plus className="w-3 h-3" /> Add Location
              </button>
            </div>

            {/* FAQs */}
            <div className="space-y-3 border-t border-border pt-4">
              <span className="block text-sm font-bold text-foreground/80">
                Frequently Asked Questions (FAQs)
              </span>
              {faqs.map((faq) => (
                <div
                  key={faq.id}
                  className="flex gap-4 items-start bg-background border border-border rounded-xl p-3"
                >
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={faq.question}
                      onChange={(e) =>
                        handleFaqChange(faq.id, "question", e.target.value)
                      }
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50 font-medium"
                      placeholder="Question"
                    />
                    <textarea
                      value={faq.answer}
                      rows={2}
                      onChange={(e) =>
                        handleFaqChange(faq.id, "answer", e.target.value)
                      }
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
                      placeholder="Answer..."
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFaq(faq.id)}
                    className="p-2 text-foreground/50 hover:text-red-500 transition-colors h-full"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addFaq}
                className="w-full py-2 border-2 border-dashed border-border rounded-lg text-foreground/60 hover:text-foreground hover:border-foreground/30 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
              >
                <Plus className="w-4 h-4" /> Add FAQ
              </button>
            </div>

            {/* Cancellation Policy */}
            <div className="pt-4 border-t border-border">
              <label
                htmlFor="cancelPolicy"
                className="block text-sm font-bold text-foreground/80 mb-1"
              >
                Cancellation Policy
              </label>
              <textarea
                id="cancelPolicy"
                rows={4}
                value={cancellationPolicy}
                onChange={(e) => setCancellationPolicy(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-primary/50"
                placeholder="e.g. 100% refund if cancelled 30 days prior..."
              />
            </div>
          </div>
        </div>

        {/* Sidebar Settings (Right Column) */}
        <div className="space-y-6">

          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="border-b border-border pb-2">
              <h2 className="text-xl font-bold text-foreground">Trip Highlights</h2>
              <p className="text-sm text-foreground/60">Punchy selling points shown at the top of the page</p>
            </div>
            <div className="space-y-3">
              {highlights.map((item) => (
                <div key={item.id} className="flex gap-2">
                  <input type="text" value={item.text} onChange={(e) => handleStringArrayChange(setHighlights, item.id, e.target.value)} className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-primary/50" placeholder="e.g. Stargazing at 14,000ft" />
                  <button type="button" onClick={() => removeStringArrayItem(setHighlights, item.id)} className="p-2 text-foreground/50 hover:text-red-500 transition-colors" > <Trash2 className="w-5 h-5" /> </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addStringArrayItem(setHighlights)}
                className="w-full py-2.5 border-2 border-dashed border-border rounded-xl text-foreground/60 hover:text-foreground hover:border-foreground/30 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
              >
                <Plus className="w-4 h-4" /> Add Highlight
              </button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="border-b border-border pb-2">
              <h2 className="text-xl font-bold text-foreground">Vibe Tags / Suitable For</h2>
              <p className="text-sm text-foreground/60">Badges near the title (e.g. Solo-Safe, Family Friendly)</p>
            </div>
            <div className="space-y-3">
              {vibeTags.map((item) => (
                <div key={item.id} className="flex gap-2">
                  <input type="text" value={item.text} onChange={(e) => handleStringArrayChange(setVibeTags, item.id, e.target.value)} className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-primary/50" placeholder="e.g. Solo-Female Friendly" />
                  <button type="button" onClick={() => removeStringArrayItem(setVibeTags, item.id)} className="p-2 text-foreground/50 hover:text-red-500 transition-colors" > <Trash2 className="w-5 h-5" /> </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addStringArrayItem(setVibeTags)}
                className="w-full py-2.5 border-2 border-dashed border-border rounded-xl text-foreground/60 hover:text-foreground hover:border-foreground/30 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
              >
                <Plus className="w-4 h-4" /> Add Vibe Tag
              </button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-foreground border-b border-border pb-2">
              Group Size & Age Limits
            </h2>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label
                  htmlFor="minAge"
                  className="block text-sm font-medium text-foreground/80 mb-1"
                >
                  Min Age
                </label>
                <input
                  id="minAge"
                  type="number"
                  min="0"
                  value={minAge}
                  onChange={(e) => setMinAge(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary/50"
                  placeholder="e.g. 12"
                />
              </div>
              <div>
                <label
                  htmlFor="maxGroupSize"
                  className="block text-sm font-medium text-foreground/80 mb-1"
                >
                  Max Group Size
                </label>
                <input
                  id="maxGroupSize"
                  type="number"
                  min="1"
                  value={maxGroupSize}
                  onChange={(e) => setMaxGroupSize(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary/50"
                  placeholder="e.g. 15"
                />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-foreground border-b border-border pb-2">
              Trek Specifications & Logistics
            </h2>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label htmlFor="meetingPoint" className="block text-sm font-medium text-foreground/80 mb-1">Meeting Point</label>
                <input id="meetingPoint" type="text" value={meetingPoint} onChange={(e) => setMeetingPoint(e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-primary/50" placeholder="e.g. Dehradun" />
              </div>
              <div>
                <label htmlFor="meetingTime" className="block text-sm font-medium text-foreground/80 mb-1">Meeting Time</label>
                <input id="meetingTime" type="text" value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-primary/50" placeholder="e.g. 6:00 AM" />
              </div>
              <div>
                <label htmlFor="maxAltitude" className="block text-sm font-medium text-foreground/80 mb-1">Max Altitude</label>
                <input id="maxAltitude" type="text" value={maxAltitude} onChange={(e) => setMaxAltitude(e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-primary/50" placeholder="e.g. 14,000 ft" />
              </div>
              <div>
                <label htmlFor="trekDistance" className="block text-sm font-medium text-foreground/80 mb-1">Trek Distance</label>
                <input id="trekDistance" type="text" value={trekDistance} onChange={(e) => setTrekDistance(e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-primary/50" placeholder="e.g. 45 km" />
              </div>
              <div>
                <label htmlFor="dropoffTime" className="block text-sm font-medium text-foreground/80 mb-1">Drop-off Time</label>
                <input id="dropoffTime" type="text" value={dropoffTime} onChange={(e) => setDropoffTime(e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-primary/50" placeholder="e.g. 8:00 PM (Day 6)" />
              </div>
              <div>
                <label htmlFor="bestTimeToVisit" className="block text-sm font-medium text-foreground/80 mb-1">Best Season</label>
                <input id="bestTimeToVisit" type="text" value={bestTimeToVisit} onChange={(e) => setBestTimeToVisit(e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-primary/50" placeholder="e.g. Sep - Nov" />
              </div>
              <div>
                <label htmlFor="networkConnectivity" className="block text-sm font-medium text-foreground/80 mb-1">Network Connectivity</label>
                <input id="networkConnectivity" type="text" value={networkConnectivity} onChange={(e) => setNetworkConnectivity(e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-primary/50" placeholder="e.g. Jio/Airtel till basecamp" />
              </div>
              <div>
                <label htmlFor="lastAtm" className="block text-sm font-medium text-foreground/80 mb-1">Last ATM</label>
                <input id="lastAtm" type="text" value={lastAtm} onChange={(e) => setLastAtm(e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-primary/50" placeholder="e.g. Joshimath" />
              </div>
              <div>
                <label htmlFor="fitnessRequirement" className="block text-sm font-medium text-foreground/80 mb-1">Fitness Requirement</label>
                <input id="fitnessRequirement" type="text" value={fitnessRequirement} onChange={(e) => setFitnessRequirement(e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-primary/50" placeholder="e.g. Jog 5km in 35m" />
              </div>
              <div>
                <label htmlFor="ageRange" className="block text-sm font-medium text-foreground/80 mb-1">Age Range</label>
                <input id="ageRange" type="text" value={ageRange} onChange={(e) => setAgeRange(e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-primary/50" placeholder="e.g. 12-60 Years" />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-foreground border-b border-border pb-2">
              Pricing & Logistics
            </h2>
            <div>
              <label
                htmlFor="price"
                className="block text-sm font-medium text-foreground/80 mb-1"
              >
                Total Gross Price (₹)
              </label>
              <input
                id="price"
                type="number"
                min="0"
                required
                value={basePrice}
                onChange={(e) => setBasePrice(Number(e.target.value))}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary/50 text-xl font-semibold mb-2"
              />
              {basePrice > 0 && (
                <div className="bg-primary/5 rounded-lg p-3 text-xs text-foreground/80 border border-primary/20 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-primary mb-1">
                    <Info className="w-3.5 h-3.5" />
                    <span>Live Revenue Breakdown (per seat)</span>
                  </div>
                  {taxes.map((tax) => {
                     const amount = (basePrice * tax.percentage) / 100;
                     return (
                        <div key={tax.id} className="flex justify-between text-red-500/80">
                           <span>{tax.name} ({tax.percentage}%):</span>
                           <span>- ₹{amount.toFixed(2)}</span>
                        </div>
                     );
                  })}
                  <div className="flex justify-between font-bold pt-1 border-t border-primary/10 mt-1 text-green-500">
                    <span>Net Base Revenue:</span>
                    <span>₹{(basePrice - taxes.reduce((acc, tax) => acc + ((basePrice * tax.percentage) / 100), 0)).toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
            <div>
              <label
                htmlFor="cap"
                className="block text-sm font-medium text-foreground/80 mb-1"
              >
                Total Capacity
              </label>
              <input
                id="cap"
                type="number"
                min="1"
                required
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-foreground border-b border-border pb-2">
              Publishing
            </h2>

            <div>
              <label
                htmlFor="status"
                className="block text-sm font-medium text-foreground/80 mb-1"
              >
                Status
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary/50"
              >
                <option value="DRAFT">Draft — Hidden</option>
                <option value="PUBLISHED">Published — Public</option>
                <option value="ARCHIVED">
                  Archived — Hidden, not accepting bookings
                </option>
              </select>
            </div>

            <div>
              <label
                htmlFor="difficulty"
                className="block text-sm font-medium text-foreground/80 mb-1"
              >
                Difficulty
              </label>
              <select
                id="difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary/50"
              >
                <option value="EASY">Easy</option>
                <option value="MODERATE">Moderate</option>
                <option value="HARD">Hard</option>
                <option value="EXTREME">Extreme</option>
              </select>
            </div>

            <label
              htmlFor="featured"
              className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-border hover:bg-foreground/5 transition-colors"
              aria-labelledby="featured-label"
            >
              <input
                id="featured"
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="w-5 h-5 rounded border-border text-primary focus:ring-primary focus:ring-offset-background bg-background"
              />
              <div id="featured-label">
                <span className="block text-sm font-medium text-foreground">
                  Featured Trip
                </span>
                <span className="block text-xs text-foreground/60">
                  Show strictly on the homepage banner
                </span>
              </div>
            </label>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-foreground border-b border-border pb-2">
              Categories
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
              {categories.map((cat) => (
                <label
                  key={cat.id}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat.id)}
                    onChange={() => toggleCategory(cat.id)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-background bg-background"
                  />
                  <span className="text-sm text-foreground/80 group-hover:text-foreground transition-colors">
                    {cat.name}
                  </span>
                </label>
              ))}
              {categories.length === 0 && (
                <span className="text-sm text-foreground/50">
                  No categories found.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
