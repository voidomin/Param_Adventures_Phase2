import { z } from "zod";

export const experienceSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(100),
  description: z.any(), // JSON
  basePrice: z.number().min(0, "Base Price is required"),
  capacity: z.number().int().min(1, "Capacity must be at least 1"),
  durationDays: z.number().int().min(1, "Duration (Days) is required"),
  location: z.string().trim().min(1, "Location is required"),
  difficulty: z.enum(["EASY", "MODERATE", "HARD", "EXTREME"]).optional(),
  isFeatured: z.boolean().optional(),
  coverImage: z.string().min(1, "Cover Image is required").nullable(),
  cardImage: z.string().optional().nullable(),
  images: z.array(z.string().trim()).transform(arr => arr.filter(Boolean)).optional(),
  itinerary: z.any().optional(), // JSON
  categoryIds: z.array(z.string()).transform(arr => arr.filter(Boolean)).optional(),
  inclusions: z.any().optional(),
  exclusions: z.any().optional(),
  thingsToCarry: z.any().optional(),
  faqs: z.any().optional(),
  cancellationPolicy: z.string().optional().nullable(),
  meetingPoint: z.string().optional().nullable(),
  minAge: z.number().int().optional().nullable(),
  maxAltitude: z.string().optional().nullable(),
  trekDistance: z.string().optional().nullable(),
  bestTimeToVisit: z.string().optional().nullable(),
  maxGroupSize: z.number().int().optional().nullable(),
  pickupPoints: z.array(z.string().trim()).transform(arr => arr.filter(Boolean)).optional(),
  highlights: z.array(z.string().trim()).transform(arr => arr.filter(Boolean)).optional(),
  networkConnectivity: z.string().optional().nullable(),
  lastAtm: z.string().optional().nullable(),
  fitnessRequirement: z.string().optional().nullable(),
  ageRange: z.string().optional().nullable(),
  meetingTime: z.string().optional().nullable(),
  dropoffTime: z.string().optional().nullable(),
  vibeTags: z.array(z.string().trim()).transform(arr => arr.filter(Boolean)).optional(),
});

export type ExperienceInput = z.infer<typeof experienceSchema>;
