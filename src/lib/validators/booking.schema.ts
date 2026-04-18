import { z } from "zod";

export const participantSchema = z.object({
  isPrimary: z.boolean().optional(),
  name: z.string().min(1, "Participant name is required"),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  phoneNumber: z.string().optional().or(z.literal("")),
  gender: z.string().optional().or(z.literal("")),
  age: z.union([z.number(), z.string()]).optional().or(z.literal("")),
  bloodGroup: z.string().optional().or(z.literal("")),
  emergencyContactName: z.string().optional().or(z.literal("")),
  emergencyContactNumber: z.string().optional().or(z.literal("")),
  emergencyRelationship: z.string().optional().or(z.literal("")),
  pickupPoint: z.string().optional().or(z.literal("")),
  dropPoint: z.string().optional().or(z.literal("")),
});

export const bookingSchema = z.object({
  experienceId: z.string().min(1, "experienceId is required"),
  slotId: z.string().min(1, "slotId is required"),
  participantCount: z.number().int().min(1),
  participants: z.array(participantSchema).min(1),
}).refine(data => data.participants.length === data.participantCount, {
  message: "Participant details must match the participant count.",
  path: ["participants"]
});

export type BookingInput = z.infer<typeof bookingSchema>;
export type ParticipantInput = z.infer<typeof participantSchema>;
