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
} from "lucide-react";
import Link from "next/link";
import MediaUploader from "./MediaUploader";

interface Category {
  id: string;
  name: string;
}

interface ItineraryDay {
  _id?: string;
  title: string;
  description: string;
}

export default function ExperienceForm({
  initialData = null,
}: Readonly<{
  initialData?: Record<string, any> | null;
}>) {
  const router = useRouter();
  const isEditing = !!initialData;

  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form State
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(
    initialData?.description || "",
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
    initialData?.categories?.map((c: Record<string, any>) => c.categoryId) ||
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
      (d: Record<string, any>) => ({
        ...d,
        _id: d._id || crypto.randomUUID(),
      }),
    ),
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
    (initialData?.faqs || []).map((faq: any) => ({
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
    fetchCats();
  }, []);

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const handleItineraryChange = (
    index: number,
    field: keyof ItineraryDay,
    value: string,
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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl pb-24">
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
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-bold flex items-center gap-2 hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-primary/25"
        >
          <Save className="w-4 h-4" />
          {isSubmitting ? "Saving..." : "Save Trip"}
        </button>
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
              <textarea
                id="desc"
                required
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary/50"
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
                  onChange={(e) => setDurationDays(e.target.value)}
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
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-primary/50"
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
              Additional photos to display in the trip's gallery section.
            </p>

            <MediaUploader
              id="gallery-images-upload"
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
            <h2 className="text-xl font-bold text-foreground border-b border-border pb-2">
              Trek Specifications
            </h2>
            <div>
              <label
                htmlFor="meetingPoint"
                className="block text-sm font-medium text-foreground/80 mb-1"
              >
                Meeting Point
              </label>
              <input
                id="meetingPoint"
                type="text"
                value={meetingPoint}
                onChange={(e) => setMeetingPoint(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary/50"
                placeholder="e.g. Dehradun Railway Station"
              />
            </div>
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
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary/50"
                placeholder="e.g. 14,000 ft"
              />
            </div>
            <div>
              <label
                htmlFor="trekDistance"
                className="block text-sm font-medium text-foreground/80 mb-1"
              >
                Trek Distance
              </label>
              <input
                id="trekDistance"
                type="text"
                value={trekDistance}
                onChange={(e) => setTrekDistance(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary/50"
                placeholder="e.g. 45 km"
              />
            </div>
            <div>
              <label
                htmlFor="bestTime"
                className="block text-sm font-medium text-foreground/80 mb-1"
              >
                Best Time To Visit
              </label>
              <input
                id="bestTime"
                type="text"
                value={bestTimeToVisit}
                onChange={(e) => setBestTimeToVisit(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary/50"
                placeholder="e.g. Sep - Dec"
              />
            </div>
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
              Pricing & Logistics
            </h2>
            <div>
              <label
                htmlFor="price"
                className="block text-sm font-medium text-foreground/80 mb-1"
              >
                Base Price (₹)
              </label>
              <input
                id="price"
                type="number"
                min="0"
                required
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary/50 text-xl font-semibold"
              />
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
                onChange={(e) => setCapacity(e.target.value)}
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
