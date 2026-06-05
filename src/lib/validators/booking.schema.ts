import { z } from "zod";

export const participantSchema = z.object({
  isPrimary: z.boolean().optional(),
  name: z.string().min(1, "Participant name is required"),
  email: z.email({ message: "Invalid email format" }),
  phoneNumber: z.string().min(1, "Phone number is required"),
  gender: z.string().min(1, "Gender is required"),
  age: z.union([z.number(), z.string()])
    .transform(val => val.toString())
    .refine(val => val.trim().length > 0, { message: "Age is required" }),
  bloodGroup: z.string().min(1, "Blood group is required"),
  emergencyContactName: z.string().min(1, "Emergency contact name is required"),
  emergencyContactNumber: z.string().min(1, "Emergency contact number is required"),
  emergencyRelationship: z.string().min(1, "Emergency relationship is required"),
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
