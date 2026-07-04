import { z } from "zod";

export const participantSchema = z.object({
  isPrimary: z.boolean().optional(),
  name: z.string().min(1, "Participant name is required"),
  email: z.email({ message: "Invalid email format" }),
  phoneNumber: z.string().min(1, "Phone number is required"),
  gender: z.string().min(1, "Gender is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  bloodGroup: z.string().min(1, "Blood group is required"),
  emergencyContactName: z.string().min(1, "Emergency contact name is required"),
  emergencyContactNumber: z.string().min(1, "Emergency contact number is required"),
  emergencyRelationship: z.string().min(1, "Emergency relationship is required"),
  pickupPoint: z.string().optional().or(z.literal("")),
  dropPoint: z.string().optional().or(z.literal("")),
  selectedAmenities: z.array(z.object({
    groupId: z.string(),
    groupName: z.string(),
    optionId: z.string(),
    optionName: z.string(),
    price: z.number(),
  })).optional(),
});

export const bookingSchema = z.object({
  experienceId: z.string().min(1, "experienceId is required"),
  slotId: z.string().min(1, "slotId is required"),
  participantCount: z.number().int().min(1),
  participants: z.array(participantSchema).min(1),
  paymentType: z.enum(["FULL", "ADVANCE"]).optional().default("FULL"),
  appliedCoupons: z.array(z.string()).optional(),
}).refine(data => data.participants.length === data.participantCount, {
  message: "Participant details must match the participant count.",
  path: ["participants"]
});

export type BookingInput = z.infer<typeof bookingSchema>;
export type ParticipantInput = z.infer<typeof participantSchema>;
