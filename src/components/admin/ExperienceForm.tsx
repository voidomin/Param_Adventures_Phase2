"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
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
  AlertCircle,
  Calendar,
  MapPin,
  ShieldAlert,
  CreditCard,
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
  description: string | object;
  meals?: string[];
  accommodation?: string;
  transportMode?: string;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface ExtraAmenityOption {
  id: string;
  name: string;
  price: number;
}

export interface ExtraAmenityGroup {
  id: string;
  name: string;
  type: "SINGLE" | "MULTI";
  options: ExtraAmenityOption[];
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
  thingsToKeepInMind?: string[];
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
  fitnessRequirement?: string;
  ageRange?: string;
  meetingTime?: string;
  dropoffTime?: string;
  pickupPoints?: string[];
  dropPoints?: string[];
  allowAdvancePayment?: boolean;
  advancePaymentAmount?: number | null;
  extraAmenities?: ExtraAmenityGroup[];
}

export type ActiveTab = "basic" | "itinerary" | "media" | "logistics" | "extras" | "booking";


const MEAL_OPTIONS = ["Breakfast", "Lunch", "Dinner", "Snacks"];

const CANCEL_POLICY_OPTIONS = [
  {
    id: "gst",
    label: "GST & Convenience Fee",
    defaultText: "GST and convenience charges are non-refundable under all circumstances.",
  },
  {
    id: "refund_processing",
    label: "Refund Processing",
    defaultText: "Eligible refunds will be processed to the original payment method within 5–7 working days after approval. Credit timelines may vary depending on your bank/payment provider.",
  },
  {
    id: "partial_refund",
    label: "Partial Refund",
    defaultText: "Refunds, if applicable, will be calculated after deducting the non-refundable booking amount and the applicable cancellation charges.",
  },
  {
    id: "refundable_amount",
    label: "Refundable Amount",
    defaultText: "Only the amount paid over and above the booking amount is eligible for a refund, subject to the cancellation policy.",
  },
  {
    id: "force_majeure",
    label: "Force Majeure",
    defaultText: "In case of natural disasters, pandemics, government restrictions, war, adverse weather, or other unforeseen events, our Emergency Case Cancellation Policy will override the standard cancellation and refund policy. Refunds, credits, or rescheduling will depend on recoveries from our vendors and service providers.",
  },
  {
    id: "calculation_days",
    label: "Cancellation Days Calculation",
    defaultText: "The date of cancellation is counted, while the trip departure date is not counted when calculating the applicable cancellation period.",
  }
];

function parseCancellationPolicyData(policyStr: string | null | undefined) {
  let template = "custom";
  let text = "";
  let selectedPolicies: string[] = [];
  if (policyStr) {
    try {
      const parsed = JSON.parse(policyStr);
      if (parsed && typeof parsed === "object" && "template" in parsed) {
        template = parsed.template || "custom";
        text = parsed.text || "";
        selectedPolicies = Array.isArray(parsed.selectedPolicies) ? parsed.selectedPolicies : [];
      } else {
        text = policyStr;
      }
    } catch {
      text = policyStr;
    }
  }
  return { template, text, selectedPolicies };
}

function MealButtons({
  meals,
  onToggle,
}: Readonly<{
  meals: string[];
  onToggle: (meal: string) => void;
}>) {
  return (
    <div className="flex gap-2 flex-wrap">
      {MEAL_OPTIONS.map((meal) => {
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
  const [error, setError] = useState(""); // General error
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [taxes, setTaxes] = useState<
    { id: string; name: string; percentage: number }[]
  >([]);

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
    initialData?.categories?.map((c) => c.categoryId) || [],
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
    (initialData?.itinerary || [{ title: "", description: "" }]).map((d) => ({
      ...d,
      _id: d._id || crypto.randomUUID(),
    })) as ItineraryDay[],
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
  const [thingsToKeepInMind, setThingsToKeepInMind] = useState<
    { id: string; text: string }[]
  >(
    (initialData?.thingsToKeepInMind || []).map((text: string) => ({
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
  const [dropPoints, setDropPoints] = useState<
    { id: string; text: string }[]
  >(
    (initialData?.dropPoints || []).map((text: string) => ({
      id: crypto.randomUUID(),
      text,
    })),
  );

  const getInitialCancellationPolicy = () => {
    return parseCancellationPolicyData(initialData?.cancellationPolicy);
  };

  const initialPolicy = getInitialCancellationPolicy();
  const [cancelPolicyType, setCancelPolicyType] = useState(initialPolicy.template);
  const [cancelPolicyText, setCancelPolicyText] = useState(initialPolicy.text);
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>(
    initialPolicy.selectedPolicies || []
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
  const [networkConnectivity, setNetworkConnectivity] = useState(
    initialData?.networkConnectivity || "",
  );
  const [fitnessRequirement, setFitnessRequirement] = useState(
    initialData?.fitnessRequirement || "",
  );
  const [ageRange, setAgeRange] = useState(initialData?.ageRange || "");
  const [meetingTime, setMeetingTime] = useState(
    initialData?.meetingTime || "",
  );
  const [dropoffTime, setDropoffTime] = useState(
    initialData?.dropoffTime || "",
  );

  const [allowAdvancePayment, setAllowAdvancePayment] = useState<boolean>(
    initialData?.allowAdvancePayment || false
  );
  const [advancePaymentAmount, setAdvancePaymentAmount] = useState<number | string>(
    initialData?.advancePaymentAmount || ""
  );

  const getInitialAmenities = () => {
    if (!initialData?.extraAmenities) return [];
    if (typeof initialData.extraAmenities === "string") {
      try {
        return JSON.parse(initialData.extraAmenities);
      } catch {
        return [];
      }
    }
    if (Array.isArray(initialData.extraAmenities)) {
      return initialData.extraAmenities;
    }
    return [];
  };

  const [extraAmenities, setExtraAmenities] = useState<ExtraAmenityGroup[]>(getInitialAmenities());
  const [activeTab, setActiveTab] = useState<ActiveTab>("basic");

  const tabs = [
    { id: "basic", label: "Basic Info", icon: Info },
    { id: "itinerary", label: "Itinerary & Details", icon: Calendar },
    { id: "media", label: "Media & Assets", icon: ImageIcon },
    { id: "logistics", label: "Logistics", icon: MapPin },
    { id: "extras", label: "Rules & Extras", icon: ShieldAlert },
    { id: "booking", label: "Booking & Amenities", icon: CreditCard },
  ] as const;

  const addAmenityGroup = () => {
    setExtraAmenities((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: "",
        type: "SINGLE",
        options: [{ id: crypto.randomUUID(), name: "", price: 0 }],
      },
    ]);
  };

  const removeAmenityGroup = (groupId: string) => {
    setExtraAmenities((prev) => prev.filter((g) => g.id !== groupId));
  };

  const updateAmenityGroup = (groupId: string, field: "name" | "type", value: string) => {
    setExtraAmenities((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, [field]: value } : g))
    );
  };

  const addAmenityOption = (groupId: string) => {
    setExtraAmenities((prev) =>
      prev.map((g) => {
        if (g.id === groupId) {
          return {
            ...g,
            options: [...g.options, { id: crypto.randomUUID(), name: "", price: 0 }],
          };
        }
        return g;
      })
    );
  };

  const removeAmenityOption = (groupId: string, optionId: string) => {
    const filterOptions = (g: ExtraAmenityGroup) => ({
      ...g,
      options: g.options.filter((o) => o.id !== optionId),
    });
    setExtraAmenities((prev) =>
      prev.map((g) => (g.id === groupId ? filterOptions(g) : g))
    );
  };

  const updateAmenityOption = (
    groupId: string,
    optionId: string,
    field: "name" | "price",
    value: string | number
  ) => {
    const patchOption = (g: ExtraAmenityGroup) => ({
      ...g,
      options: g.options.map((o) =>
        o.id === optionId ? { ...o, [field]: value } : o
      ),
    });
    setExtraAmenities((prev) =>
      prev.map((g) => (g.id === groupId ? patchOption(g) : g))
    );
  };

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
        if (data.settings?.taxConfig) {
          const config = data.settings.taxConfig;
          if (Array.isArray(config)) {
             setTaxes(config);
          } else if (typeof config === "string") {
            try {
               const parsed = JSON.parse(config);
               if (Array.isArray(parsed)) setTaxes(parsed);
            } catch (e) {
               console.error("Failed to parse taxConfig string:", e);
               // In case of parsing failure, fallback to an empty array
               setTaxes([]);
            }
          }
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
    value: string | string[] | object,
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

  // ─── Refactored Logic Helpers ──────────────────────────

  const validateForm = (): Record<string, string> => {
    const newFieldErrors: Record<string, string> = {};
    if (!title.trim()) newFieldErrors.title = "Title is required";
    if (!location.trim()) newFieldErrors.location = "Location is required";
    if (!basePrice || basePrice < 0)
      newFieldErrors.basePrice = "Valid Base Price is required";
    if (!coverImage) newFieldErrors.coverImage = "Cover Image is required";
    if (!capacity || capacity < 1)
      newFieldErrors.capacity = "Capacity must be at least 1";
    return newFieldErrors;
  };

  const constructPayload = () => ({
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
    categoryIds: (selectedCategories || []).filter(
      (id): id is string => typeof id === "string" && id !== "",
    ),
    inclusions: inclusions
      .map((item) => item.text)
      .filter((item) => item.trim() !== ""),
    exclusions: exclusions
      .map((item) => item.text)
      .filter((item) => item.trim() !== ""),
    thingsToCarry: thingsToCarry
      .map((item) => item.text)
      .filter((item) => item.trim() !== ""),
    thingsToKeepInMind: thingsToKeepInMind
      .map((item) => item.text)
      .filter((item) => item.trim() !== ""),
    pickupPoints: pickupPoints
      .map((item) => item.text)
      .filter((item) => item.trim() !== ""),
    dropPoints: dropPoints
      .map((item) => item.text)
      .filter((item) => item.trim() !== ""),
    faqs: faqs
      .filter((faq) => faq.question.trim() !== "" && faq.answer.trim() !== "")
      .map(({ question, answer }) => ({ question, answer })),
    cancellationPolicy: JSON.stringify({ template: cancelPolicyType, text: cancelPolicyText, selectedPolicies }),
    meetingPoint,
    minAge: minAge ? Number(minAge) : null,
    maxAltitude,
    trekDistance,
    bestTimeToVisit,
    maxGroupSize: maxGroupSize ? Number(maxGroupSize) : null,
    highlights: highlights
      .map((item) => item.text)
      .filter((item) => item.trim() !== ""),
    networkConnectivity,
    fitnessRequirement,
    ageRange,
    meetingTime,
    dropoffTime,
    vibeTags: vibeTags
      .map((item) => item.text)
      .filter(
        (text): text is string => typeof text === "string" && text.trim() !== "",
      ),
    allowAdvancePayment,
    advancePaymentAmount: allowAdvancePayment && advancePaymentAmount !== "" ? Number(advancePaymentAmount) : null,
    extraAmenities,
  });

  const handleServerErrors = (data: { error?: string; details?: Record<string, string | string[]> }) => {
    if (!data.details) {
      setError(data.error || "Failed to save experience");
      return;
    }

    const serverFieldErrors: Record<string, string> = {};
    Object.entries(data.details).forEach(([field, errors]) => {
      if (Array.isArray(errors)) {
        serverFieldErrors[field] = errors[0];
      } else if (typeof errors === "string") {
        serverFieldErrors[field] = errors;
      }
    });

    setFieldErrors(serverFieldErrors);
    setError("Validation failed. Please check the highlighted fields.");

    // Auto-scroll to first error from server
    const firstErrorField = Object.keys(serverFieldErrors)[0];
    if (firstErrorField) {
      const errorTabMap: Record<string, "basic" | "itinerary" | "media" | "logistics" | "extras" | "booking"> = {
        title: "basic",
        description: "basic",
        location: "basic",
        durationDays: "basic",
        difficulty: "basic",
        status: "basic",
        categories: "basic",
        minAge: "basic",
        maxGroupSize: "basic",
        highlights: "basic",
        vibeTags: "basic",
        itinerary: "itinerary",
        maxAltitude: "itinerary",
        trekDistance: "itinerary",
        bestTimeToVisit: "itinerary",
        networkConnectivity: "itinerary",
        fitnessRequirement: "itinerary",
        ageRange: "itinerary",
        coverImage: "media",
        cardImage: "media",
        images: "media",
        pickupPoints: "logistics",
        dropPoints: "logistics",
        meetingPoint: "logistics",
        meetingTime: "logistics",
        dropoffTime: "logistics",
        inclusions: "extras",
        exclusions: "extras",
        thingsToCarry: "extras",
        faqs: "extras",
        cancellationPolicy: "extras",
        basePrice: "booking",
        capacity: "booking",
        allowAdvancePayment: "booking",
        advancePaymentAmount: "booking",
        extraAmenities: "booking",
      };
      if (errorTabMap[firstErrorField]) {
        setActiveTab(errorTabMap[firstErrorField]);
      }
      setTimeout(() => {
        document
          .getElementById(firstErrorField)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
    }
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setFieldErrors({});

    // 1. Frontend Validation
    const newFieldErrors = validateForm();
    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      setError("Please fix the errors highlighted below");
      setIsSubmitting(false);

      const firstErrorField = Object.keys(newFieldErrors)[0];
      const errorTabMap: Record<string, "basic" | "itinerary" | "media" | "logistics" | "extras" | "booking"> = {
        title: "basic",
        description: "basic",
        location: "basic",
        durationDays: "basic",
        difficulty: "basic",
        status: "basic",
        categories: "basic",
        minAge: "basic",
        maxGroupSize: "basic",
        highlights: "basic",
        vibeTags: "basic",
        itinerary: "itinerary",
        maxAltitude: "itinerary",
        trekDistance: "itinerary",
        bestTimeToVisit: "itinerary",
        networkConnectivity: "itinerary",
        fitnessRequirement: "itinerary",
        ageRange: "itinerary",
        coverImage: "media",
        cardImage: "media",
        images: "media",
        pickupPoints: "logistics",
        dropPoints: "logistics",
        meetingPoint: "logistics",
        meetingTime: "logistics",
        dropoffTime: "logistics",
        inclusions: "extras",
        exclusions: "extras",
        thingsToCarry: "extras",
        faqs: "extras",
        cancellationPolicy: "extras",
        basePrice: "booking",
        capacity: "booking",
        allowAdvancePayment: "booking",
        advancePaymentAmount: "booking",
        extraAmenities: "booking",
      };
      if (firstErrorField && errorTabMap[firstErrorField]) {
        setActiveTab(errorTabMap[firstErrorField]);
      }
      setTimeout(() => {
        document
          .getElementById(firstErrorField)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      return;
    }

    // 2. Payload Construction
    const payload = constructPayload();

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

      if (!res.ok) {
        handleServerErrors(data);
        if (res.status >= 500 && !data.details) {
          Sentry.captureException(
            new Error(`Server Error [${res.status}]: ${data.error}`),
          );
        }
        setIsSubmitting(false);
        return;
      }

      router.push("/admin/experiences");
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred. Please try again.");
      Sentry.captureException(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const applyImageData = (data: Partial<ExperienceFormData>) => {
    if (data.coverImage) setCoverImage(data.coverImage);
    if (data.cardImage) setCardImage(data.cardImage);
    if (data.images) setImages(data.images);
  };

  const applyPaymentData = (data: Partial<ExperienceFormData>) => {
    if (data.allowAdvancePayment !== undefined) setAllowAdvancePayment(data.allowAdvancePayment);
    if (data.advancePaymentAmount !== undefined) setAdvancePaymentAmount(data.advancePaymentAmount ?? "");
    if (data.extraAmenities !== undefined) {
      if (typeof data.extraAmenities === "string") {
        try { setExtraAmenities(JSON.parse(data.extraAmenities)); } catch { setExtraAmenities([]); }
      } else if (Array.isArray(data.extraAmenities)) {
        setExtraAmenities(data.extraAmenities);
      } else {
        setExtraAmenities([]);
      }
    }
  };

  const applyBasicData = (data: Partial<ExperienceFormData>) => {
    if (data.title) setTitle(data.title);
    if (data.description && typeof data.description === "object" && Object.keys(data.description).length > 0)
      setDescription(data.description);
    if (data.basePrice !== undefined) setBasePrice(data.basePrice);
    if (data.capacity !== undefined) setCapacity(data.capacity);
    if (data.durationDays !== undefined) setDurationDays(data.durationDays);
    if (data.location) setLocation(data.location);
    if (data.difficulty) setDifficulty(data.difficulty);
    if (data.status) setStatus(data.status);
    if (data.isFeatured !== undefined) setIsFeatured(data.isFeatured);
    if (data.categories) setSelectedCategories(data.categories.map((c) => c.categoryId));
    applyImageData(data);
    applyPaymentData(data);
  };

  const applyListData = (data: Partial<ExperienceFormData>) => {
    if (data.itinerary)
      setItinerary(
        data.itinerary.map((d: ItineraryDay) => ({
          ...d,
          _id: crypto.randomUUID(),
        })),
      );
    const mapToObj = (arr: string[] | undefined) =>
      arr?.map((text) => ({ id: crypto.randomUUID(), text })) || [];
    if (data.inclusions) setInclusions(mapToObj(data.inclusions));
    if (data.exclusions) setExclusions(mapToObj(data.exclusions));
    if (data.thingsToCarry) setThingsToCarry(mapToObj(data.thingsToCarry));
    if (data.thingsToKeepInMind) setThingsToKeepInMind(mapToObj(data.thingsToKeepInMind));
    if (data.highlights) setHighlights(mapToObj(data.highlights));
    if (data.vibeTags) setVibeTags(mapToObj(data.vibeTags));
    if (data.pickupPoints) setPickupPoints(mapToObj(data.pickupPoints));
    if (data.dropPoints) setDropPoints(mapToObj(data.dropPoints));
    if (data.faqs)
      setFaqs(data.faqs.map((f: FAQ) => ({ ...f, id: crypto.randomUUID() })));
  };

  const applyLogisticsData = (data: Partial<ExperienceFormData>) => {
    if (data.cancellationPolicy !== undefined) {
      const { template, text } = parseCancellationPolicyData(data.cancellationPolicy);
      setCancelPolicyType(template);
      setCancelPolicyText(text);
    }
    if (data.meetingPoint !== undefined)
      setMeetingPoint(data.meetingPoint || "");
    if (data.minAge !== undefined) setMinAge(data.minAge || "");
    if (data.maxAltitude !== undefined) setMaxAltitude(data.maxAltitude || "");
    if (data.trekDistance !== undefined)
      setTrekDistance(data.trekDistance || "");
    if (data.bestTimeToVisit !== undefined)
      setBestTimeToVisit(data.bestTimeToVisit || "");
    if (data.maxGroupSize !== undefined)
      setMaxGroupSize(data.maxGroupSize || "");
    if (data.networkConnectivity !== undefined)
      setNetworkConnectivity(data.networkConnectivity || "");
    if (data.fitnessRequirement !== undefined)
      setFitnessRequirement(data.fitnessRequirement || "");
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
    title,
    description,
    basePrice,
    capacity,
    durationDays,
    location,
    difficulty,
    status,
    isFeatured,
    coverImage,
    cardImage,
    images,
    itinerary,
    categories: selectedCategories,
    inclusions: inclusions.map((i) => i.text),
    exclusions: exclusions.map((i) => i.text),
    thingsToCarry: thingsToCarry.map((i) => i.text),
    thingsToKeepInMind: thingsToKeepInMind.map((i) => i.text),
    pickupPoints: pickupPoints.map((i) => i.text),
    dropPoints: dropPoints.map((i) => i.text),
    faqs,
    cancellationPolicy: JSON.stringify({ template: cancelPolicyType, text: cancelPolicyText, selectedPolicies }),
    meetingPoint,
    minAge,
    maxAltitude,
    trekDistance,
    bestTimeToVisit,
    maxGroupSize,
    highlights: highlights.map((i) => i.text),
    networkConnectivity,
    fitnessRequirement,
    ageRange,
    meetingTime,
    dropoffTime,
    vibeTags: vibeTags.map((i) => i.text),
    allowAdvancePayment,
    advancePaymentAmount,
    extraAmenities,
  });

  const getExportFilename = () =>
    `${title ? title.toLowerCase().replaceAll(/\s+/g, "-") : "trip"}-export`;

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
    book_append_sheet(
      workbook: WorkBook,
      worksheet: WorkSheet,
      sheetName: string,
    ): void;
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
        const serialized = JSON.stringify(val);
        return serialized ?? "";
      } catch {
        return "";
      }
    }
    if (typeof val === "symbol") return val.description ?? "";
    if (typeof val === "number" || typeof val === "boolean") return String(val);
    return "";
  };

  const parseExcelBasicInfo = (
    imported: Partial<Record<string, unknown>>,
    wb: WorkBook,
    XLSX: XLSXLib,
  ) => {
    if (wb.Sheets["Basic Info"]) {
      const basicInfo = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        wb.Sheets["Basic Info"],
      );
      basicInfo.forEach((row) => {
        if (row.Key && row.Value !== undefined)
          imported[ensureString(row.Key)] = row.Value;
      });
    }
  };

  const parseExcelItinerary = (
    imported: Partial<ExperienceFormData>,
    wb: WorkBook,
    XLSX: XLSXLib,
  ) => {
    if (wb.Sheets["Itinerary"]) {
      const itinRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        wb.Sheets["Itinerary"],
      );
      imported.itinerary = itinRows.map((row) => ({
        title: ensureString(row.Title),
        description: ensureString(row.Description),
        meals:
          typeof row.Meals === "string"
            ? row.Meals.split(",")
                .map((m: string) => m.trim())
                .filter(Boolean)
            : [],
        accommodation: ensureString(row.Accommodation),
      }));
    }
  };

  const parseExcelFaqs = (
    imported: Partial<ExperienceFormData>,
    wb: WorkBook,
    XLSX: XLSXLib,
  ) => {
    if (wb.Sheets["FAQs"]) {
      const faqRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        wb.Sheets["FAQs"],
      );
      imported.faqs = faqRows.map((row) => ({
        question: ensureString(row.Question),
        answer: ensureString(row.Answer),
      }));
    }
  };

  const parseExcelLists = (
    imported: Partial<ExperienceFormData>,
    wb: WorkBook,
    XLSX: XLSXLib,
  ) => {
    if (wb.Sheets["Lists"]) {
      const listRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        wb.Sheets["Lists"],
      );
      imported.inclusions = listRows
        .map((r) => ensureString(r.Inclusions))
        .filter(Boolean);
      imported.exclusions = listRows
        .map((r) => ensureString(r.Exclusions))
        .filter(Boolean);
      imported.thingsToCarry = listRows
        .map((r) => ensureString(r.ThingsToCarry))
        .filter(Boolean);
      imported.thingsToKeepInMind = listRows
        .map((r) => ensureString(r.ThingsToKeepInMind))
        .filter(Boolean);
      imported.highlights = listRows
        .map((r) => ensureString(r.Highlights))
        .filter(Boolean);
      imported.vibeTags = listRows
        .map((r) => ensureString(r.VibeTags))
        .filter(Boolean);
      imported.pickupPoints = listRows
        .map((r) => ensureString(r.PickupPoints))
        .filter(Boolean);
      imported.dropPoints = listRows
        .map((r) => ensureString(r.DropPoints))
        .filter(Boolean);
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
        { Key: "fitnessRequirement", Value: fitnessRequirement },
        { Key: "ageRange", Value: ageRange },
        { Key: "meetingTime", Value: meetingTime },
        { Key: "dropoffTime", Value: dropoffTime },
        { Key: "meetingPoint", Value: meetingPoint },
        { Key: "cancellationPolicy", Value: JSON.stringify({ template: cancelPolicyType, text: cancelPolicyText, selectedPolicies }) },
        { Key: "allowAdvancePayment", Value: allowAdvancePayment },
        { Key: "advancePaymentAmount", Value: advancePaymentAmount },
        { Key: "extraAmenities", Value: JSON.stringify(extraAmenities) },
      ];

      const itineraryData = itinerary.map((d, i) => ({
        Day: i + 1,
        Title: d.title,
        Description: d.description,
        Meals: d.meals?.join(", ") || "",
        Accommodation: d.accommodation || "",
      }));

      const faqsData = faqs.map((f) => ({
        Question: f.question,
        Answer: f.answer,
      }));

      const maxLen = Math.max(
        inclusions.length,
        exclusions.length,
        thingsToCarry.length,
        highlights.length,
        vibeTags.length,
        pickupPoints.length,
        dropPoints.length,
      );
      const listsData = [];
      for (let i = 0; i < maxLen; i++) {
        listsData.push({
          Inclusions: inclusions[i]?.text || "",
          Exclusions: exclusions[i]?.text || "",
          ThingsToCarry: thingsToCarry[i]?.text || "",
          Highlights: highlights[i]?.text || "",
          VibeTags: vibeTags[i]?.text || "",
          PickupPoints: pickupPoints[i]?.text || "",
          DropPoints: dropPoints[i]?.text || "",
        });
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(basicInfoData),
        "Basic Info",
      );
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(itineraryData),
        "Itinerary",
      );
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(faqsData),
        "FAQs",
      );
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(listsData),
        "Lists",
      );

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
      const wb = XLSX.read(data, { type: "array" });

      const imported: Partial<ExperienceFormData> = {};
      parseExcelBasicInfo(imported, wb, XLSX);
      parseExcelItinerary(imported, wb, XLSX);
      parseExcelFaqs(imported, wb, XLSX);
      parseExcelLists(imported, wb, XLSX);

      applyImportedData(imported);
      setError("");
    } catch (err) {
      setError(
        "Failed to parse Excel file. Ensure it follows the export template structure.",
      );
      console.error(err);
    }
    e.target.value = "";
  };

  const [showImportOptions, setShowImportOptions] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Experience Form"
      className="max-w-7xl mx-auto pb-24 w-full"
    >
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
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      handleImportJSON(e);
                      setShowImportOptions(false);
                    }}
                  />
                  <span>Import JSON</span>
                </label>
                <label className="px-4 py-2.5 hover:bg-foreground/5 cursor-pointer text-sm font-medium transition-colors text-foreground flex items-center gap-2 rounded-lg">
                  <input
                    type="file"
                    accept=".xlsx"
                    className="hidden"
                    onChange={(e) => {
                      handleImportExcel(e);
                      setShowImportOptions(false);
                    }}
                  />
                  <span>Import Excel (.xlsx)</span>
                </label>
              </div>
            )}
            {showImportOptions && (
              <button
                type="button"
                aria-label="Close menu"
                className="fixed inset-0 z-0 w-full h-full cursor-default border-none bg-transparent"
                onClick={() => setShowImportOptions(false)}
              />
            )}
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
                  onClick={() => {
                    handleExportJSON();
                    setShowExportOptions(false);
                  }}
                  className="px-4 py-2.5 hover:bg-foreground/5 text-left text-sm font-medium transition-colors text-foreground flex items-center gap-2 rounded-lg"
                >
                  Export JSON
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleExportExcel();
                    setShowExportOptions(false);
                  }}
                  className="px-4 py-2.5 hover:bg-foreground/5 text-left text-sm font-medium transition-colors text-foreground flex items-center gap-2 rounded-lg"
                >
                  Export Excel (.xlsx)
                </button>
              </div>
            )}
            {showExportOptions && (
              <button
                type="button"
                aria-label="Close menu"
                className="fixed inset-0 z-0 w-full h-full cursor-default border-none bg-transparent"
                onClick={() => setShowExportOptions(false)}
              />
            )}
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
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 font-semibold text-sm">
          {error}
        </div>
      )}

      {/* Horizontal Premium Tabs Bar */}
      <div className="mb-8 border border-border/80 bg-card/50 backdrop-blur-sm rounded-2xl p-2 flex flex-wrap gap-1 shadow-md">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-105"
                  : "text-foreground/60 hover:text-foreground hover:bg-foreground/5 hover:scale-102"
              }`}
            >
              <Icon className={`w-4 h-4 transition-transform duration-200 ${isActive ? "scale-110" : ""}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Grid Layout for Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Main Content (Left Column) */}
        <div className={`${["media", "extras", "logistics"].includes(activeTab) ? "md:col-span-3" : "md:col-span-2"} space-y-6`}>
          
          {/* TAB 1: BASIC INFO */}
          {activeTab === "basic" && (
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <h2 className="text-xl font-bold text-foreground border-b border-border pb-2">
                Basic Info
              </h2>
              <div>
                <label
                  htmlFor="title"
                  className={`block text-sm font-medium mb-1 transition-colors ${fieldErrors.title ? "text-red-500" : "text-foreground/80"}`}
                >
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (fieldErrors.title) setFieldErrors(p => ({ ...p, title: "" }));
                  }}
                  className={`w-full bg-background border rounded-xl px-4 py-2.5 text-foreground focus:outline-none transition-all ${
                    fieldErrors.title 
                      ? "border-red-500 bg-red-500/5 focus:ring-2 focus:ring-red-500/20" 
                      : "border-border focus:border-primary/50"
                  }`}
                  placeholder="e.g. Everest Base Camp Trek"
                />
                {fieldErrors.title && (
                  <p className="mt-1.5 text-xs font-bold text-red-500 flex items-center gap-1 animate-in fade-in slide-in-from-top-1">
                    <AlertCircle className="w-3 h-3" /> {fieldErrors.title}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="desc"
                  className="block text-sm font-medium text-foreground/80 mb-1"
                >
                  Description
                </label>
                <TiptapEditor
                  content={description}
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
                    Location <span className="text-red-500">*</span>
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
                    Duration (Days) <span className="text-red-500">*</span>
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
          )}

          {/* TAB 2: ITINERARY & DETAILS */}
          {activeTab === "itinerary" && (
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
                    <TiptapEditor
                      content={day.description}
                      onChange={(val) =>
                        handleItineraryChange(ix, "description", val)
                      }
                      placeholder="Day description..."
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/50">
                      <div>
                        <span className="block text-xs font-semibold text-foreground/60 mb-2">
                          Meals Included
                        </span>
                        <MealButtons
                          meals={Array.isArray(day.meals) ? day.meals : []}
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
                            handleItineraryChange(
                              ix,
                              "accommodation",
                              e.target.value,
                            )
                          }
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-primary/50"
                          placeholder="e.g. Alpine Tent"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`transportMode-${ix}`}
                          className="block text-xs font-semibold text-foreground/60 mb-2"
                        >
                          Transport Mode (Optional)
                        </label>
                        <input
                          id={`transportMode-${ix}`}
                          type="text"
                          value={day.transportMode || ""}
                          onChange={(e) =>
                            handleItineraryChange(
                              ix,
                              "transportMode",
                              e.target.value,
                            )
                          }
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-primary/50"
                          placeholder="e.g. Trek / Jeep / Boat"
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
          )}

          {/* TAB 3: MEDIA & ASSETS */}
          {activeTab === "media" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={`bg-card border rounded-2xl p-6 space-y-4 transition-all ${fieldErrors.coverImage ? "border-red-500 bg-red-500/5 ring-1 ring-red-500/20" : "border-border"}`}>
                  <h2 className={`text-xl font-bold border-b pb-2 flex items-center justify-between ${fieldErrors.coverImage ? "text-red-500 border-red-500/20" : "text-foreground border-border"}`}>
                    Trip Cover Image <span className="text-red-500">*</span>
                    {fieldErrors.coverImage && (
                       <span className="text-xs font-black uppercase tracking-tighter bg-red-500 text-white px-2 py-0.5 rounded">Required</span>
                    )}
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
            </div>
          )}

          {/* TAB 4: LOGISTICS & LOCATIONS */}
          {activeTab === "logistics" && (
            <div className="space-y-6">
              {/* Timing & Core Settings */}
              <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <h2 className="text-xl font-bold text-foreground border-b border-border pb-2">
                  Timing & Logistics
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label
                      htmlFor="meetingPoint"
                      className="block text-sm font-medium text-foreground/80 mb-1"
                    >
                      Starting Point
                    </label>
                    <input
                      id="meetingPoint"
                      type="text"
                      value={meetingPoint}
                      onChange={(e) => setMeetingPoint(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-primary/50"
                      placeholder="e.g. Bangalore"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="meetingTime"
                      className="block text-sm font-medium text-foreground/80 mb-1"
                    >
                      Starting Time
                    </label>
                    <input
                      id="meetingTime"
                      type="text"
                      value={meetingTime}
                      onChange={(e) => setMeetingTime(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-primary/50"
                      placeholder="e.g. 6:00 AM"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="dropoffTime"
                      className="block text-sm font-medium text-foreground/80 mb-1"
                    >
                      Drop-off Time
                    </label>
                    <input
                      id="dropoffTime"
                      type="text"
                      value={dropoffTime}
                      onChange={(e) => setDropoffTime(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-primary/50"
                      placeholder="e.g. 8:00 PM"
                    />
                  </div>
                </div>
              </div>

              {/* Pickup & Drop Points side-by-side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pickup Points */}
                <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
                  <h3 className="text-lg font-bold text-foreground border-b border-border pb-2">
                    Pickup Locations
                  </h3>
                  <div className="space-y-3">
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
                </div>

                {/* Drop Points */}
                <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
                  <h3 className="text-lg font-bold text-foreground border-b border-border pb-2">
                    Drop-off Locations
                  </h3>
                  <div className="space-y-3">
                    {dropPoints.map((item) => (
                      <div key={item.id} className="flex gap-2">
                        <input
                          type="text"
                          value={item.text}
                          onChange={(e) =>
                            handleStringArrayChange(
                              setDropPoints,
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
                            removeStringArrayItem(setDropPoints, item.id)
                          }
                          className="p-2 text-foreground/50 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addStringArrayItem(setDropPoints)}
                      className="text-xs font-medium text-primary flex items-center gap-1 hover:text-primary/80"
                    >
                      <Plus className="w-3 h-3" /> Add Location
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: RULES & EXTRAS */}
          {activeTab === "extras" && (
            <div className="space-y-6">
              {/* Row 1: Inclusions & Exclusions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Inclusions */}
                <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
                  <h3 className="text-lg font-bold text-foreground border-b border-border pb-2">
                    Inclusions
                  </h3>
                  <div className="space-y-3">
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
                </div>

                {/* Exclusions */}
                <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
                  <h3 className="text-lg font-bold text-foreground border-b border-border pb-2">
                    Exclusions
                  </h3>
                  <div className="space-y-3">
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
                </div>
              </div>

              {/* Row 2: Things to Carry & Cancellation Policy */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Things to Carry */}
                <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
                  <h3 className="text-lg font-bold text-foreground border-b border-border pb-2">
                    Things to Carry
                  </h3>
                  <div className="space-y-3">
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
                </div>

                {/* Cancellation Policy */}
                <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                  <h3 className="text-lg font-bold text-foreground border-b border-border pb-2">
                    Cancellation Policy
                  </h3>
                  <div>
                    <label
                      htmlFor="cancelPolicyType"
                      className="block text-sm font-bold text-foreground/80 mb-1"
                    >
                      Cancellation Policy Template
                    </label>
                    <select
                      id="cancelPolicyType"
                      value={cancelPolicyType}
                      onChange={(e) => setCancelPolicyType(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-primary/50"
                    >
                      <option value="custom">Custom (No template table)</option>
                      <option value="one_two_days">One- & Two-Days Treks/Trips Policy Table</option>
                      <option value="multi_days">Multiple Days Treks/Trips Policy Table</option>
                      <option value="international">International Treks/Trips Policy Table</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="cancelPolicy"
                      className="block text-xs font-bold text-foreground/60 mb-1"
                    >
                      Cancellation Policy Notes/Custom Text
                    </label>
                    <textarea
                      id="cancelPolicy"
                      rows={4}
                      value={cancelPolicyText}
                      onChange={(e) => setCancelPolicyText(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-primary/50"
                      placeholder="e.g. 100% refund if cancelled 30 days prior..."
                    />
                  </div>

                  <div className="space-y-4 border-t border-border pt-4">
                    <span className="block text-xs font-bold text-foreground/80">
                      Select Cancellation Policy Alerts/Callouts to Add
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {CANCEL_POLICY_OPTIONS.map((policy) => {
                        const isChecked = selectedPolicies.includes(policy.id);
                        return (
                          <label
                            key={policy.id}
                            htmlFor={policy.id}
                            className={`p-3 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${
                              isChecked
                                ? "bg-primary/5 border-primary/40 ring-1 ring-primary/10"
                                : "bg-background border-border hover:bg-foreground/5"
                            }`}
                          >
                            <input
                              id={policy.id}
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedPolicies([...selectedPolicies, policy.id]);
                                } else {
                                  setSelectedPolicies(
                                    selectedPolicies.filter((id) => id !== policy.id)
                                  );
                                }
                              }}
                              className="mt-1 w-4 h-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
                            />
                            <div className="flex-1">
                              <span className="block text-xs font-bold text-foreground">
                                {policy.label}
                              </span>
                              <span className="block text-[10px] text-foreground/50 mt-1 line-clamp-2" title={policy.defaultText}>
                                {policy.defaultText}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2.5: Things to Keep in Mind */}
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 space-y-6">
                <div className="flex items-center gap-3 border-b border-amber-500/20 pb-2">
                  <span className="text-amber-500 text-lg">⚠️</span>
                  <h3 className="text-lg font-bold text-foreground">
                    Things to Keep in Mind
                  </h3>
                </div>
                <p className="text-sm text-foreground/60 -mt-2">
                  Important reminders or safety notes for travellers — shown prominently on the trip page.
                </p>
                <div className="space-y-3">
                  {thingsToKeepInMind.map((item) => (
                    <div key={item.id} className="flex gap-2">
                      <input
                        type="text"
                        value={item.text}
                        onChange={(e) =>
                          handleStringArrayChange(
                            setThingsToKeepInMind,
                            item.id,
                            e.target.value,
                          )
                        }
                        className="flex-1 bg-background border border-amber-500/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/60"
                        placeholder="e.g. Carry a valid ID proof at all times"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          removeStringArrayItem(setThingsToKeepInMind, item.id)
                        }
                        className="p-2 text-foreground/50 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addStringArrayItem(setThingsToKeepInMind)}
                    className="text-xs font-medium text-amber-600 flex items-center gap-1 hover:text-amber-700"
                  >
                    <Plus className="w-3 h-3" /> Add Point
                  </button>
                </div>
              </div>

              {/* Row 3: FAQs */}
              <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
                <h3 className="text-lg font-bold text-foreground border-b border-border pb-2">
                  Frequently Asked Questions (FAQs)
                </h3>
                <div className="space-y-3">
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
              </div>
            </div>
          )}

          {/* TAB 6: BOOKING & AMENITIES */}
          {activeTab === "booking" && (
            <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
              <div className="border-b border-border pb-2 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Extra Amenities & Stay Customization</h2>
                  <p className="text-sm text-foreground/60">
                    Define optional stay sharing, transport, or gear add-ons per participant
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addAmenityGroup}
                  className="bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Group
                </button>
              </div>

              <div className="space-y-6">
                {extraAmenities.map((group) => (
                  <div key={group.id} className="bg-background border border-border rounded-xl p-4 space-y-4">
                    <div className="flex gap-4 items-start justify-between">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label
                            htmlFor={`amenity-group-name-${group.id}`}
                            className="block text-xs font-bold text-foreground/60 mb-1"
                          >
                            Group Name (e.g. Accommodation Sharing)
                          </label>
                          <input
                            id={`amenity-group-name-${group.id}`}
                            type="text"
                            value={group.name}
                            onChange={(e) => updateAmenityGroup(group.id, "name", e.target.value)}
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50 font-semibold text-foreground"
                            placeholder="e.g. Stay Sharing"
                            required
                          />
                        </div>
                        <div>
                          <label
                            htmlFor={`amenity-group-type-${group.id}`}
                            className="block text-xs font-bold text-foreground/60 mb-1"
                          >
                            Selection Mode
                          </label>
                          <select
                            id={`amenity-group-type-${group.id}`}
                            value={group.type}
                            onChange={(e) => updateAmenityGroup(group.id, "type", e.target.value)}
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50 text-foreground"
                          >
                            <option value="SINGLE">Single-select (Radio buttons, e.g. sharing choices)</option>
                            <option value="MULTI">Multi-select (Checkboxes, e.g. gear rentals)</option>
                          </select>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAmenityGroup(group.id)}
                        className="p-2 text-foreground/40 hover:text-red-500 transition-colors mt-5"
                        title="Remove Group"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Options List */}
                    <div className="pl-4 border-l-2 border-primary/20 space-y-3">
                      <span className="block text-xs font-bold text-foreground/50">Options & Prices</span>
                      {group.options.map((option) => (
                        <div key={option.id} className="flex gap-3 items-center">
                          <input
                            type="text"
                            value={option.name}
                            onChange={(e) => updateAmenityOption(group.id, option.id, "name", e.target.value)}
                            className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary/50 text-foreground"
                            placeholder="e.g. Triple Sharing"
                            required
                          />
                          {/* Plus/Minus Toggle Button */}
                          <button
                            type="button"
                            onClick={() => {
                              const newPrice = option.price === 0 ? -0.001 : -option.price;
                              updateAmenityOption(group.id, option.id, "price", newPrice);
                            }}
                            className={`px-2.5 py-1.5 rounded-lg border font-bold text-xs transition-colors flex items-center justify-center w-20 ${
                              option.price < 0
                                ? "bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20"
                                : "bg-green-500/10 border-green-500/20 text-green-500 hover:bg-green-500/20"
                            }`}
                            title={option.price < 0 ? "Deduction (Subtracts from total)" : "Addition (Adds to total)"}
                          >
                            {option.price < 0 ? "- Deduct" : "+ Add"}
                          </button>
                          <div className="w-32 relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-foreground/50">₹</span>
                            <input
                              type="number"
                              min="0"
                              value={Math.abs(option.price) < 0.01 ? "" : Math.abs(option.price)}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                const finalVal = option.price < 0 ? -val : val;
                                updateAmenityOption(group.id, option.id, "price", finalVal);
                              }}
                              className="w-full bg-background border border-border rounded-lg pl-6 pr-3 py-1.5 text-sm focus:outline-none focus:border-primary/50 text-foreground font-semibold"
                              placeholder="0"
                              required
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAmenityOption(group.id, option.id)}
                            className="text-foreground/40 hover:text-red-500 transition-colors p-1.5"
                            title="Remove Option"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addAmenityOption(group.id)}
                        className="text-xs font-bold text-primary flex items-center gap-1 hover:text-primary/80 transition-colors"
                      >
                        <Plus className="w-3 h-3" /> Add Option
                      </button>
                    </div>
                  </div>
                ))}
                {extraAmenities.length === 0 && (
                  <div className="text-center py-6 border-2 border-dashed border-border rounded-xl text-foreground/40 text-sm">
                    No extra amenities defined yet. Click &apos;Add Group&apos; to set some up.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Settings (Right Column, hidden for full-width tabs) */}
        {!["media", "extras", "logistics"].includes(activeTab) && (
          <div className="space-y-6">
            
            {/* TAB 1: BASIC INFO SIDEBAR */}
            {activeTab === "basic" && (
              <>
                <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                  <div className="border-b border-border pb-2">
                    <h2 className="text-xl font-bold text-foreground">
                      Trip Highlights
                    </h2>
                    <p className="text-sm text-foreground/60">
                      Punchy selling points shown at the top of the page
                    </p>
                  </div>
                  <div className="space-y-3">
                    {highlights.map((item) => (
                      <div key={item.id} className="relative group">
                        <input
                          type="text"
                          value={item.text}
                          onChange={(e) =>
                            handleStringArrayChange(
                              setHighlights,
                              item.id,
                              e.target.value,
                            )
                          }
                          className="w-full bg-background border border-border rounded-xl pl-4 pr-10 py-2 text-foreground text-sm focus:outline-none focus:border-primary/50 transition-colors"
                          placeholder="e.g. Stargazing at 14,000ft"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            removeStringArrayItem(setHighlights, item.id)
                          }
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center text-foreground/20 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                          title="Remove Highlight"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
                    <h2 className="text-xl font-bold text-foreground">
                      Vibe Tags
                    </h2>
                    <p className="text-sm text-foreground/60">
                      Badges near the title (e.g. Solo-Safe)
                    </p>
                  </div>
                  <div className="space-y-3">
                    {vibeTags.map((item) => (
                      <div key={item.id} className="relative group">
                        <input
                          type="text"
                          value={item.text}
                          onChange={(e) =>
                            handleStringArrayChange(
                              setVibeTags,
                              item.id,
                              e.target.value,
                            )
                          }
                          className="w-full bg-background border border-border rounded-xl pl-4 pr-10 py-2 text-foreground text-sm focus:outline-none focus:border-primary/50 transition-colors"
                          placeholder="e.g. Solo-Female Friendly"
                        />
                        <button
                          type="button"
                          onClick={() => removeStringArrayItem(setVibeTags, item.id)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center text-foreground/20 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                          title="Remove Vibe Tag"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
                    Group & Age Limits
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
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
                        Max Group Size (Per Booking)
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
                    Publishing
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
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
                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary/50 text-sm"
                      >
                        <option value="DRAFT">Draft — Hidden</option>
                        <option value="PUBLISHED">Published — Public</option>
                        <option value="ARCHIVED">
                          Archived — Hidden
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
                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary/50 text-sm"
                      >
                        <option value="EASY">Easy</option>
                        <option value="MODERATE">Moderate</option>
                        <option value="HARD">Hard</option>
                        <option value="EXTREME">Extreme</option>
                      </select>
                    </div>
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
                        Show on homepage banner
                      </span>
                    </div>
                  </label>
                </div>

                <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                  <h2 className="text-xl font-bold text-foreground border-b border-border pb-2">
                    Categories
                  </h2>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 max-h-64 overflow-y-auto no-scrollbar pt-1">
                    {categories.map((cat) => (
                      <label
                        key={cat.id}
                        className="flex items-center gap-2 cursor-pointer group whitespace-nowrap"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(cat.id)}
                          onChange={() => toggleCategory(cat.id)}
                          className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-background bg-background"
                        />
                        <span className="text-sm text-foreground/80 group-hover:text-foreground transition-colors truncate">
                          {cat.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* TAB 2: ITINERARY SIDEBAR */}
            {activeTab === "itinerary" && (
              <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <h2 className="text-xl font-bold text-foreground border-b border-border pb-2">
                  Trek Specs
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="maxAltitude"
                      className="block text-sm font-medium text-foreground/80 mb-1"
                    >
                      Max Altitude
                    </label>
                    <input
                      id="maxAltitude"
                      type="text"
                      value={maxAltitude}
                      onChange={(e) => setMaxAltitude(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-primary/50"
                      placeholder="e.g. 14,000 ft"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="trekDistance"
                      className="block text-sm font-medium text-foreground/80 mb-1"
                    >
                      Total Distance
                    </label>
                    <input
                      id="trekDistance"
                      type="text"
                      value={trekDistance}
                      onChange={(e) => setTrekDistance(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-primary/50"
                      placeholder="e.g. 45 km"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="bestTimeToVisit"
                      className="block text-sm font-medium text-foreground/80 mb-1"
                    >
                      Best Season
                    </label>
                    <input
                      id="bestTimeToVisit"
                      type="text"
                      value={bestTimeToVisit}
                      onChange={(e) => setBestTimeToVisit(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-primary/50"
                      placeholder="e.g. Sep - Nov"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="networkConnectivity"
                      className="block text-sm font-medium text-foreground/80 mb-1"
                    >
                      Connectivity
                    </label>
                    <input
                      id="networkConnectivity"
                      type="text"
                      value={networkConnectivity}
                      onChange={(e) => setNetworkConnectivity(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-primary/50"
                      placeholder="e.g. Jio/Airtel"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="fitnessRequirement"
                      className="block text-sm font-medium text-foreground/80 mb-1"
                    >
                      Fitness Level
                    </label>
                    <input
                      id="fitnessRequirement"
                      type="text"
                      value={fitnessRequirement}
                      onChange={(e) => setFitnessRequirement(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-primary/50"
                      placeholder="e.g. Run 5km in 30m"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="ageRange"
                      className="block text-sm font-medium text-foreground/80 mb-1"
                    >
                      Age Range
                    </label>
                    <input
                      id="ageRange"
                      type="text"
                      value={ageRange}
                      onChange={(e) => setAgeRange(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-primary/50"
                      placeholder="e.g. 12-65 Years"
                    />
                  </div>
                </div>
              </div>
            )}



            {/* TAB 6: BOOKING SIDEBAR */}
            {activeTab === "booking" && (
              <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <h2 className="text-xl font-bold text-foreground border-b border-border pb-2">
                  Pricing & Settings
                </h2>
                <div>
                  <label
                    htmlFor="price"
                    className={`block text-sm font-medium mb-1 transition-colors ${fieldErrors.basePrice ? "text-red-500" : "text-foreground/80"}`}
                  >
                    Base Price (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="price"
                    type="number"
                    min="0"
                    value={basePrice}
                    onChange={(e) => {
                      setBasePrice(Number(e.target.value));
                      if (fieldErrors.basePrice) setFieldErrors(p => ({ ...p, basePrice: "" }));
                    }}
                    className={`w-full bg-background border rounded-xl px-4 py-2.5 text-foreground focus:outline-none transition-all text-xl font-semibold mb-2 ${
                      fieldErrors.basePrice 
                        ? "border-red-500 bg-red-500/5 focus:ring-1 focus:ring-red-500/20" 
                        : "border-border focus:border-primary/50"
                    }`}
                  />
                  {fieldErrors.basePrice && (
                    <p className="mb-2 text-xs font-bold text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {fieldErrors.basePrice}
                    </p>
                  )}
                  {basePrice > 0 && (
                    <div className="bg-primary/5 rounded-lg p-3 text-xs text-foreground/80 border border-primary/20 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-primary mb-1">
                        <Info className="w-3.5 h-3.5" />
                        <span>Live Price Breakdown (Per Seat)</span>
                      </div>
                      <div className="flex justify-between text-foreground/80">
                        <span>Base Price:</span>
                        <span>₹{basePrice.toFixed(2)}</span>
                      </div>
                      {taxes.map((tax) => {
                        const amount = (basePrice * tax.percentage) / 100;
                        return (
                          <div
                            key={tax.id}
                            className="flex justify-between text-foreground/60"
                          >
                            <span>
                              {tax.name} ({tax.percentage}%):
                            </span>
                            <span>+ ₹{amount.toFixed(2)}</span>
                          </div>
                        );
                      })}
                      <div className="flex justify-between font-bold pt-1 border-t border-primary/10 mt-1 text-foreground">
                        <span>Total Price (with Taxes):</span>
                        <span>
                          ₹
                          {(
                            basePrice +
                            taxes.reduce(
                              (acc, tax) =>
                                acc + (basePrice * tax.percentage) / 100,
                              0,
                            )
                          ).toFixed(2)}
                        </span>
                      </div>

                      {allowAdvancePayment && Number(advancePaymentAmount) > 0 && (
                        <>
                          <div className="flex justify-between text-foreground/80 font-bold pt-1.5 border-t border-dashed border-primary/10">
                            <span>Advance Payment:</span>
                            <span className="text-primary">
                              - ₹{Number(advancePaymentAmount).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between font-bold pt-1 text-green-500 border-t border-primary/10 mt-1">
                            <span>Remaining Balance:</span>
                            <span>
                              ₹
                              {(
                                Math.max(
                                  0,
                                  basePrice +
                                    taxes.reduce(
                                      (acc, tax) =>
                                        acc + (basePrice * tax.percentage) / 100,
                                      0,
                                    ) -
                                    Number(advancePaymentAmount)
                                )
                              ).toFixed(2)}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  {allowAdvancePayment && Number(advancePaymentAmount) > 0 && Number(advancePaymentAmount) > (basePrice + taxes.reduce((acc, tax) => acc + (basePrice * tax.percentage) / 100, 0)) && (
                    <div className="mt-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Advance amount cannot exceed the Total Price.</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-border pt-4 mt-2 space-y-4">
                  <label
                    htmlFor="allowAdvancePayment"
                    className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-border hover:bg-foreground/5 transition-colors"
                    aria-labelledby="advance-pay-label"
                  >
                    <input
                      id="allowAdvancePayment"
                      type="checkbox"
                      checked={allowAdvancePayment}
                      onChange={(e) => setAllowAdvancePayment(e.target.checked)}
                      className="w-5 h-5 rounded border-border text-primary focus:ring-primary focus:ring-offset-background bg-background"
                    />
                    <div id="advance-pay-label">
                      <span className="block text-sm font-medium text-foreground">
                        Allow Advance Payment
                      </span>
                      <span className="block text-xs text-foreground/60">
                        Pay partial booking amount
                      </span>
                    </div>
                  </label>

                  {allowAdvancePayment && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                      <label
                        htmlFor="advancePaymentAmount"
                        className="block text-xs font-bold text-foreground/80 mb-1"
                      >
                        Advance Amount (₹, per seat)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-foreground/50">₹</span>
                        <input
                          id="advancePaymentAmount"
                          type="number"
                          min="0"
                          value={advancePaymentAmount}
                          onChange={(e) => setAdvancePaymentAmount(e.target.value)}
                          className="w-full bg-background border border-border rounded-xl pl-8 pr-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-primary/50 font-semibold"
                          placeholder="e.g. 2000"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="cap"
                    className={`block text-sm font-medium mb-1 transition-colors ${fieldErrors.capacity ? "text-red-500" : "text-foreground/80"}`}
                  >
                    Total Capacity <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="cap"
                    type="number"
                    min="1"
                    value={capacity}
                    onChange={(e) => {
                      setCapacity(Number(e.target.value));
                      if (fieldErrors.capacity) setFieldErrors(p => ({ ...p, capacity: "" }));
                    }}
                    className={`w-full bg-background border rounded-xl px-4 py-2.5 text-foreground focus:outline-none transition-all ${
                      fieldErrors.capacity 
                        ? "border-red-500 bg-red-500/5 focus:ring-1 focus:ring-red-500/20" 
                        : "border-border focus:border-primary/50"
                    }`}
                  />
                  {fieldErrors.capacity && (
                    <p className="mt-1.5 text-xs font-bold text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {fieldErrors.capacity}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </form>
  );
}
