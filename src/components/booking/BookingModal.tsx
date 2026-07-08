"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import {
  X,
  CalendarDays,
  Users,
  IndianRupee,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  User,
} from "lucide-react";

interface Slot {
  id: string;
  date: string;
  capacity: number;
  remainingCapacity: number;
}

interface BookingModalProps {
  experienceId: string;
  experienceTitle: string;
  experienceSlug: string;
  basePrice: number;
  pickupPoints: string[];
  dropPoints?: string[];
  maxCapacity: number;
  initialSelectedSlotId?: string;
  onClose: () => void;
}

interface SelectedAmenity {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  price: number;
}

interface ExtraAmenityOption {
  id: string;
  name: string;
  price: number;
}

interface ExtraAmenityGroup {
  id: string;
  name: string;
  type: "SINGLE" | "MULTI";
  options: ExtraAmenityOption[];
}

interface UpdateAmenityParams {
  index: number;
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  price: number;
  type: "SINGLE" | "MULTI";
  selected: boolean;
}

interface ExperienceDetail {
  id: string;
  extraAmenities?: ExtraAmenityGroup[] | string | null;
  allowAdvancePayment?: boolean;
  advancePaymentAmount?: number | null;
}

interface ParticipantDetails {
  id: string;
  isPrimary: boolean;
  name: string;
  email: string;
  phoneNumber: string;
  gender: string;
  dateOfBirth: string;
  bloodGroup: string;
  emergencyContactName: string;
  emergencyContactNumber: string;
  emergencyRelationship: string;
  pickupPoint: string;
  dropPoint: string;
  selectedAmenities?: SelectedAmenity[];
}

type Step =
  | "slots"
  | "participants"
  | "summary"
  | "processing"
  | "success"
  | "error";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (globalThis.window?.Razorpay !== undefined) {
      resolve(true);
      return;
    }
    const razorpayUrl = new URL("https://checkout.razorpay.com/v1/checkout.js");
    const isTrustedRazorpayHost =
      razorpayUrl.protocol === "https:" &&
      razorpayUrl.hostname === "checkout.razorpay.com";

    if (!isTrustedRazorpayHost) {
      resolve(false);
      return;
    }

    const script = globalThis.document.createElement("script");
    // Razorpay does not recommend SRI for checkout.js because the file is updated frequently.
    // Mitigation: load only from fixed HTTPS origin and strict referrer policy.
    script.src = razorpayUrl.toString(); // NOSONAR
    script.crossOrigin = "anonymous";
    script.referrerPolicy = "strict-origin-when-cross-origin";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    globalThis.document.body.appendChild(script);
  });
}

const countryCodes = [
  { code: "+91", label: "+91 (IN)" },
  { code: "+1", label: "+1 (US)" },
  { code: "+44", label: "+44 (UK)" },
  { code: "+971", label: "+971 (UAE)" },
  { code: "+65", label: "+65 (SG)" },
  { code: "+61", label: "+61 (AU)" },
];

function parsePhone(phone: string) {
  const defaultCode = "+91";
  if (!phone) return { code: defaultCode, local: "" };

  const sortedCodes = [...countryCodes].sort(
    (a, b) => b.code.length - a.code.length,
  );
  const matched = sortedCodes.find((c) => phone.startsWith(c.code));
  if (matched) {
    return { code: matched.code, local: phone.substring(matched.code.length) };
  }

  if (phone.startsWith("+")) {
    return { code: "+91", local: phone.replace("+91", "").replace("+", "") };
  }

  return { code: defaultCode, local: phone };
}

function validateBasicDetails(p: ParticipantDetails, pErrors: Record<string, string>) {
  if (!p.name.trim()) {
    pErrors.name = "Full name is required";
  }
  if (!p.gender) {
    pErrors.gender = "Gender is required";
  }
  if (p.dateOfBirth.trim()) {
    const dob = new Date(p.dateOfBirth);
    if (Number.isNaN(dob.getTime()) || dob > new Date()) {
      pErrors.dateOfBirth = "Date of birth must be a valid date in the past";
    }
  } else {
    pErrors.dateOfBirth = "Date of birth is required";
  }
  if (!p.bloodGroup) {
    pErrors.bloodGroup = "Blood group is required";
  }
  if (!p.email.trim()) {
    pErrors.email = "Email ID is required";
  } else if (!/\S+@\S+\.\S+/.test(p.email)) {
    pErrors.email = "Invalid email format";
  }
}

function validateContactDetails(p: ParticipantDetails, pErrors: Record<string, string>) {
  const parsedPhone = parsePhone(p.phoneNumber);
  if (!parsedPhone.local.trim()) {
    pErrors.phoneNumber = "Phone number is required";
  } else if (parsedPhone.local.trim().length < 8) {
    pErrors.phoneNumber = "Phone number must be at least 8 digits";
  }

  if (!p.emergencyContactName.trim()) {
    pErrors.emergencyContactName = "Emergency contact name is required";
  }

  const parsedEmergency = parsePhone(p.emergencyContactNumber);
  if (!parsedEmergency.local.trim()) {
    pErrors.emergencyContactNumber = "Emergency contact number is required";
  } else if (parsedEmergency.local.trim().length < 8) {
    pErrors.emergencyContactNumber = "Emergency number must be at least 8 digits";
  }

  if (!p.emergencyRelationship.trim()) {
    pErrors.emergencyRelationship = "Relationship is required";
  }
}

function validateLocationDetails(p: ParticipantDetails, pickupPoints: string[], dropPoints?: string[]) {
  const pErrors: Record<string, string> = {};
  if (pickupPoints && pickupPoints.length > 0 && !p.pickupPoint.trim()) {
    pErrors.pickupPoint = "Pickup location is required";
  }
  if (dropPoints && dropPoints.length > 0 && !p.dropPoint.trim()) {
    pErrors.dropPoint = "Drop-off location is required";
  }
  return pErrors;
}

function validateParticipant(p: ParticipantDetails, pickupPoints: string[], dropPoints?: string[]): Record<string, string> {
  const pErrors: Record<string, string> = {};
  validateBasicDetails(p, pErrors);
  validateContactDetails(p, pErrors);
  const locErrors = validateLocationDetails(p, pickupPoints, dropPoints);
  return { ...pErrors, ...locErrors };
}

function resizeParticipants(
  arr: ParticipantDetails[],
  count: number,
  includeMyself: boolean,
  createFn: (isPrimary: boolean) => ParticipantDetails,
) {
  if (arr.length === count) return;
  if (arr.length < count) {
    const toAdd = count - arr.length;
    for (let i = 0; i < toAdd; i++) {
      arr.push(createFn(arr.length === 0 && includeMyself));
    }
  } else {
    arr.splice(count);
  }
}

function updatePrimaryParticipant(
  arr: ParticipantDetails[],
  includeMyself: boolean,
  createFn: (isPrimary: boolean) => ParticipantDetails,
) {
  if (arr.length === 0) return;
  const primary = arr[0];
  if (includeMyself && primary.isPrimary === false) {
    const userData = createFn(true);
    arr[0] = { ...primary, ...userData, isPrimary: true };
  } else if (includeMyself === false && primary.isPrimary === true) {
    arr[0] = {
      ...primary,
      isPrimary: false,
      name: "",
      email: "",
      phoneNumber: "",
      gender: "",
      dateOfBirth: "",
      bloodGroup: "",
      emergencyContactName: "",
      emergencyContactNumber: "",
      emergencyRelationship: "",
    };
  }
}

function adjustParticipants(
  prev: ParticipantDetails[],
  count: number,
  includeMyself: boolean,
  createFn: (isPrimary: boolean) => ParticipantDetails,
): ParticipantDetails[] {
  const newArr = [...prev];
  resizeParticipants(newArr, count, includeMyself, createFn);
  updatePrimaryParticipant(newArr, includeMyself, createFn);
  return newArr;
}

interface ParticipantCardProps {
  p: ParticipantDetails;
  index: number;
  isOpen: boolean;
  onToggle: (isOpen: boolean) => void;
  validationErrors: Record<string, string> | undefined;
  clearFieldError: (field: keyof ParticipantDetails) => void;
  includeMyself: boolean;
  setIncludeMyself: (val: boolean) => void;
  updatePart: (index: number, field: keyof ParticipantDetails, value: string) => void;
  pickupPoints: string[];
  dropPoints: string[];
  copyEmergencyFromPrimary: (index: number) => void;
  extraAmenitiesConfig: ExtraAmenityGroup[];
  updatePartAmenities: (params: UpdateAmenityParams) => void;
}

interface ParticipantCardHeaderProps {
  p: ParticipantDetails;
  index: number;
  validationErrors: Record<string, string> | undefined;
  includeMyself: boolean;
  setIncludeMyself: (val: boolean) => void;
}

function ParticipantCardHeader({
  p,
  index,
  validationErrors,
  includeMyself,
  setIncludeMyself,
}: Readonly<ParticipantCardHeaderProps>) {
  const { user } = useAuth();
  return (
    <summary className="flex items-center justify-between p-5 cursor-pointer select-none bg-card hover:bg-foreground/5 transition-colors list-none [&::-webkit-details-marker]:hidden">
      <div className="flex items-center gap-4">
        <User className="w-5 h-5 text-primary shrink-0" />
        <div className="text-left">
          <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
            Participant {index + 1}{" "}
            {p.isPrimary && (
              <span className="text-xs font-semibold text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded uppercase">
                Primary
              </span>
            )}
          </h4>
          <div className="mt-1 text-xs text-foreground/60 flex flex-wrap gap-x-3 gap-y-1 items-center">
            {p.name ? (
              <span className="font-bold text-foreground">{p.name}</span>
            ) : (
              <span className="text-red-500 font-semibold italic">
                Details Incomplete
              </span>
            )}
            {p.email && <span>• {p.email}</span>}
            {p.phoneNumber && <span>• {p.phoneNumber}</span>}
            {validationErrors && Object.keys(validationErrors).length > 0 && (
              <span className="text-red-500 font-semibold flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Fill in the Details
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {index === 0 && user && (
          <button
            type="button"
            className="flex items-center gap-2 cursor-pointer group/cb bg-primary/5 px-3 py-1.5 rounded-xl border border-primary/10 hover:border-primary/30 transition-all focus:outline-none focus:ring-1 focus:ring-primary/50"
            onClick={(e) => {
              e.stopPropagation();
              setIncludeMyself(!includeMyself);
            }}
          >
            <div
              className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${
                includeMyself
                  ? "bg-primary border-primary"
                  : "border-foreground/20 bg-card"
              }`}
            >
              {includeMyself && (
                <CheckCircle2 className="w-3 h-3 text-primary-foreground" />
              )}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-primary/70 group-hover/cb:text-primary transition-colors select-none">
              Include Myself
            </span>
          </button>
        )}
        <ChevronDown className="w-5 h-5 text-foreground/40 group-open:rotate-180 transition-transform shrink-0" />
      </div>
    </summary>
  );
}

interface PersonalFieldsProps {
  p: ParticipantDetails;
  index: number;
  validationErrors: Record<string, string> | undefined;
  clearFieldError: (field: keyof ParticipantDetails) => void;
  updatePart: (index: number, field: keyof ParticipantDetails, value: string) => void;
}

function PersonalFields({
  p,
  index,
  validationErrors,
  clearFieldError,
  updatePart,
}: Readonly<PersonalFieldsProps>) {
  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor={`name-${index}`}
          className="block text-xs font-bold text-foreground/60 mb-1"
        >
          Full Name *
        </label>
        <input
          id={`name-${index}`}
          type="text"
          value={p.name}
          onChange={(e) => {
            updatePart(index, "name", e.target.value);
            clearFieldError("name");
          }}
          className={`w-full px-3 py-2 bg-card border rounded-lg focus:ring-1 focus:ring-primary outline-none transition-colors ${
            validationErrors?.name
              ? "border-red-500 focus:ring-red-500"
              : "border-border"
          }`}
          placeholder="John Doe"
        />
        {validationErrors?.name && (
          <p className="text-red-500 text-[11px] mt-1 font-medium">
            {validationErrors.name}
          </p>
        )}
      </div>
      <div>
        <label
          htmlFor={`phone-${index}`}
          className="block text-xs font-bold text-foreground/60 mb-1"
        >
          Phone Number *
        </label>
        <div
          className={`flex gap-0 border rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-primary bg-card transition-colors ${
            validationErrors?.phoneNumber
              ? "border-red-500 focus-within:ring-red-500"
              : "border-border"
          }`}
        >
          <select
            value={parsePhone(p.phoneNumber).code}
            onChange={(e) => {
              const parsed = parsePhone(p.phoneNumber);
              updatePart(
                index,
                "phoneNumber",
                e.target.value + parsed.local,
              );
            }}
            className="px-2 py-2 bg-muted/20 border-r border-border text-foreground font-bold outline-none text-xs cursor-pointer hover:bg-muted/40 transition-colors"
          >
            {countryCodes.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            id={`phone-${index}`}
            type="tel"
            value={parsePhone(p.phoneNumber).local}
            onChange={(e) => {
              const localVal = e.target.value.replace(/\D/g, "");
              const parsed = parsePhone(p.phoneNumber);
              updatePart(index, "phoneNumber", parsed.code + localVal);
              clearFieldError("phoneNumber");
            }}
            className="flex-1 min-w-0 py-2 px-3 bg-transparent outline-none text-sm"
            placeholder="99999 99999"
          />
        </div>
        {validationErrors?.phoneNumber && (
          <p className="text-red-500 text-[11px] mt-1 font-medium">
            {validationErrors.phoneNumber}
          </p>
        )}
      </div>
      <div>
        <label
          htmlFor={`email-${index}`}
          className="block text-xs font-bold text-foreground/60 mb-1"
        >
          Email ID *
        </label>
        <input
          id={`email-${index}`}
          type="email"
          value={p.email}
          onChange={(e) => {
            updatePart(index, "email", e.target.value);
            clearFieldError("email");
          }}
          className={`w-full px-3 py-2 bg-card border rounded-lg focus:ring-1 focus:ring-primary outline-none transition-colors ${
            validationErrors?.email
              ? "border-red-500 focus:ring-red-500"
              : "border-border"
          }`}
          placeholder="john@example.com"
        />
        {validationErrors?.email && (
          <p className="text-red-500 text-[11px] mt-1 font-medium">
            {validationErrors.email}
          </p>
        )}
      </div>
    </div>
  );
}

interface HealthLocationFieldsProps {
  p: ParticipantDetails;
  index: number;
  validationErrors: Record<string, string> | undefined;
  clearFieldError: (field: keyof ParticipantDetails) => void;
  updatePart: (index: number, field: keyof ParticipantDetails, value: string) => void;
  pickupPoints: string[];
  dropPoints: string[];
}

function HealthLocationFields({
  p,
  index,
  validationErrors,
  clearFieldError,
  updatePart,
  pickupPoints,
  dropPoints,
}: Readonly<HealthLocationFieldsProps>) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label
            htmlFor={`gender-${index}`}
            className="block text-xs font-bold text-foreground/60 mb-1"
          >
            Gender *
          </label>
          <select
            id={`gender-${index}`}
            value={p.gender}
            onChange={(e) => {
              updatePart(index, "gender", e.target.value);
              clearFieldError("gender");
            }}
            className={`w-full px-2 py-2 bg-card border rounded-lg outline-none appearance-none cursor-pointer transition-colors ${
              validationErrors?.gender ? "border-red-500" : "border-border"
            }`}
          >
            <option value="">Select</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
          {validationErrors?.gender && (
            <p className="text-red-500 text-[11px] mt-1 font-medium">
              {validationErrors.gender}
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor={`dob-${index}`}
            className="block text-xs font-bold text-foreground/60 mb-1"
          >
            Date of Birth *
          </label>
          <input
            id={`dob-${index}`}
            type="date"
            value={p.dateOfBirth}
            onChange={(e) => {
              const val = e.target.value;
              if (val) {
                const parts = val.split("-");
                if (parts[0] && parts[0].length > 4) {
                  parts[0] = parts[0].slice(0, 4);
                  const newVal = parts.join("-");
                  updatePart(index, "dateOfBirth", newVal);
                  return;
                }
              }
              updatePart(index, "dateOfBirth", val);
              clearFieldError("dateOfBirth");
            }}
            className={`w-full px-2 py-2 bg-card border rounded-lg outline-none transition-colors ${
              validationErrors?.dateOfBirth ? "border-red-500 focus:ring-red-500" : "border-border"
            }`}
          />
          {p.dateOfBirth && (() => {
            const birthDate = new Date(p.dateOfBirth);
            if (!Number.isNaN(birthDate.getTime())) {
              const day = String(birthDate.getDate()).padStart(2, "0");
              const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
              const month = months[birthDate.getMonth()];
              const year = birthDate.getFullYear();
              const formattedDob = `${day}/${month}/${year}`;
              
              const today = new Date();
              let calculatedAge = today.getFullYear() - birthDate.getFullYear();
              const m = today.getMonth() - birthDate.getMonth();
              if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                calculatedAge--;
              }
              return (
                <div className="text-[11px] text-foreground/50 mt-1 font-medium space-y-0.5">
                  <p>Format: <span className="text-foreground font-bold">{formattedDob}</span></p>
                  {!Number.isNaN(calculatedAge) && calculatedAge >= 0 && (
                    <p>Calculated Age: <span className="text-primary font-bold">{calculatedAge} years</span></p>
                  )}
                </div>
              );
            }
            return null;
          })()}
          {validationErrors?.dateOfBirth && (
            <p className="text-red-500 text-[11px] mt-1 font-medium">
              {validationErrors.dateOfBirth}
            </p>
          )}
        </div>
      </div>
      <div>
        <label
          htmlFor={`bloodgroup-${index}`}
          className="block text-xs font-bold text-foreground/60 mb-1"
        >
          Blood Group *
        </label>
        <select
          id={`bloodgroup-${index}`}
          value={p.bloodGroup}
          onChange={(e) => {
            updatePart(index, "bloodGroup", e.target.value);
            clearFieldError("bloodGroup");
          }}
          className={`w-full px-3 py-2 bg-card border rounded-lg outline-none appearance-none cursor-pointer transition-colors ${
            validationErrors?.bloodGroup ? "border-red-500" : "border-border"
          }`}
        >
          <option value="">Select Blood Group</option>
          <option value="A+">A+</option>
          <option value="A-">A-</option>
          <option value="B+">B+</option>
          <option value="B-">B-</option>
          <option value="O+">O+</option>
          <option value="O-">O-</option>
          <option value="AB+">AB+</option>
          <option value="AB-">AB-</option>
        </select>
        {validationErrors?.bloodGroup && (
          <p className="text-red-500 text-[11px] mt-1 font-medium">
            {validationErrors.bloodGroup}
          </p>
        )}
      </div>

      {dropPoints && dropPoints.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor={`pickup-${index}`}
              className="block text-xs font-bold text-foreground/60 mb-1"
            >
              Pickup Location *
            </label>
            <select
              id={`pickup-${index}`}
              value={p.pickupPoint}
              onChange={(e) => {
                updatePart(index, "pickupPoint", e.target.value);
                clearFieldError("pickupPoint");
              }}
              className={`w-full px-3 py-2 bg-card border rounded-lg outline-none appearance-none text-sm cursor-pointer transition-colors ${
                validationErrors?.pickupPoint ? "border-red-500" : "border-border"
              }`}
            >
              <option value="">Select Pickup</option>
              {pickupPoints.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
            {validationErrors?.pickupPoint && (
              <p className="text-red-500 text-[11px] mt-1 font-medium">
                {validationErrors.pickupPoint}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor={`drop-${index}`}
              className="block text-xs font-bold text-foreground/60 mb-1"
            >
              Drop-off Location *
            </label>
            <select
              id={`drop-${index}`}
              value={p.dropPoint}
              onChange={(e) => {
                updatePart(index, "dropPoint", e.target.value);
                clearFieldError("dropPoint");
              }}
              className={`w-full px-3 py-2 bg-card border rounded-lg outline-none appearance-none text-sm cursor-pointer transition-colors ${
                validationErrors?.dropPoint ? "border-red-500" : "border-border"
              }`}
            >
              <option value="">Select Drop-off</option>
              {dropPoints.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
            {validationErrors?.dropPoint && (
              <p className="text-red-500 text-[11px] mt-1 font-medium">
                {validationErrors.dropPoint}
              </p>
            )}
          </div>
        </div>
      ) : (
        pickupPoints &&
        pickupPoints.length > 0 && (
          <div>
            <label
              htmlFor={`pickup-${index}`}
              className="block text-xs font-bold text-foreground/60 mb-1"
            >
              Pickup & Drop Point *
            </label>
            <select
              id={`pickup-${index}`}
              value={p.pickupPoint}
              onChange={(e) => {
                updatePart(index, "pickupPoint", e.target.value);
                updatePart(index, "dropPoint", e.target.value);
                clearFieldError("pickupPoint");
              }}
              className={`w-full px-3 py-2 bg-card border rounded-lg outline-none appearance-none text-sm cursor-pointer transition-colors ${
                validationErrors?.pickupPoint ? "border-red-500" : "border-border"
              }`}
            >
              <option value="">Select Location</option>
              {pickupPoints.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
            {validationErrors?.pickupPoint && (
              <p className="text-red-500 text-[11px] mt-1 font-medium">
                {validationErrors.pickupPoint}
              </p>
            )}
          </div>
        )
      )}
    </div>
  );
}

interface EmergencyFieldsProps {
  p: ParticipantDetails;
  index: number;
  validationErrors: Record<string, string> | undefined;
  clearFieldError: (field: keyof ParticipantDetails) => void;
  updatePart: (index: number, field: keyof ParticipantDetails, value: string) => void;
  copyEmergencyFromPrimary: (index: number) => void;
}

function EmergencyFields({
  p,
  index,
  validationErrors,
  clearFieldError,
  updatePart,
  copyEmergencyFromPrimary,
}: Readonly<EmergencyFieldsProps>) {
  return (
    <div className="md:col-span-2 space-y-4 mt-2 pt-4 border-t border-border/50">
      <div className="flex items-center justify-between">
        <h5 className="text-xs font-black text-foreground/40 uppercase tracking-widest flex items-center gap-2">
          Emergency Information
        </h5>
        {index > 0 && (
          <button
            type="button"
            onClick={() => copyEmergencyFromPrimary(index)}
            className="text-[10px] font-black uppercase tracking-tight text-primary hover:text-primary/80 bg-primary/5 px-2 py-1 rounded-md border border-primary/20 transition-all hover:scale-105 active:scale-95"
          >
            Same as Primary
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor={`ecname-${index}`}
            className="block text-xs font-bold text-foreground/60 mb-1"
          >
            Emergency Name *
          </label>
          <input
            id={`ecname-${index}`}
            type="text"
            value={p.emergencyContactName}
            onChange={(e) => {
              updatePart(index, "emergencyContactName", e.target.value);
              clearFieldError("emergencyContactName");
            }}
            className={`w-full px-3 py-2 bg-card border rounded-lg outline-none focus:ring-1 focus:ring-primary transition-colors ${
              validationErrors?.emergencyContactName
                ? "border-red-500 focus:ring-red-500"
                : "border-border"
            }`}
          />
          {validationErrors?.emergencyContactName && (
            <p className="text-red-500 text-[11px] mt-1 font-medium">
              {validationErrors.emergencyContactName}
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor={`ecphone-${index}`}
            className="block text-xs font-bold text-foreground/60 mb-1"
          >
            Emergency Number *
          </label>
          <div
            className={`flex gap-0 border rounded-lg overflow-hidden bg-card focus-within:ring-1 focus-within:ring-primary transition-colors ${
              validationErrors?.emergencyContactNumber
                ? "border-red-500 focus-within:ring-red-500"
                : "border-border"
            }`}
          >
            <select
              value={parsePhone(p.emergencyContactNumber).code}
              onChange={(e) => {
                const parsed = parsePhone(p.emergencyContactNumber);
                updatePart(
                  index,
                  "emergencyContactNumber",
                  e.target.value + parsed.local,
                );
              }}
              className="px-2 py-2 bg-muted/20 border-r border-border text-foreground font-bold outline-none text-xs cursor-pointer hover:bg-muted/40 transition-colors"
            >
              {countryCodes.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
            <input
              id={`ecphone-${index}`}
              type="tel"
              value={parsePhone(p.emergencyContactNumber).local}
              onChange={(e) => {
                const localVal = e.target.value.replace(/\D/g, "");
                const parsed = parsePhone(p.emergencyContactNumber);
                updatePart(index, "emergencyContactNumber", parsed.code + localVal);
                clearFieldError("emergencyContactNumber");
              }}
              className="flex-1 min-w-0 py-2 px-3 bg-transparent outline-none text-sm"
              placeholder="88888 88888"
            />
          </div>
          {validationErrors?.emergencyContactNumber && (
            <p className="text-red-500 text-[11px] mt-1 font-medium">
              {validationErrors.emergencyContactNumber}
            </p>
          )}
        </div>
        <div className="md:col-span-2">
          <label
            htmlFor={`ecrel-${index}`}
            className="block text-xs font-bold text-foreground/60 mb-1"
          >
            Relationship *
          </label>
          <input
            id={`ecrel-${index}`}
            type="text"
            value={p.emergencyRelationship}
            onChange={(e) => {
              updatePart(index, "emergencyRelationship", e.target.value);
              clearFieldError("emergencyRelationship");
            }}
            className={`w-full px-3 py-2 bg-card border rounded-lg outline-none focus:ring-1 focus:ring-primary transition-colors ${
              validationErrors?.emergencyRelationship
                ? "border-red-500 focus:ring-red-500"
                : "border-border"
            }`}
          />
          {validationErrors?.emergencyRelationship && (
            <p className="text-red-500 text-[11px] mt-1 font-medium">
              {validationErrors.emergencyRelationship}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

interface AmenitiesFieldsProps {
  p: ParticipantDetails;
  index: number;
  extraAmenitiesConfig: ExtraAmenityGroup[];
  updatePartAmenities: (params: UpdateAmenityParams) => void;
}

function AmenitiesFields({
  p,
  index,
  extraAmenitiesConfig,
  updatePartAmenities,
}: Readonly<AmenitiesFieldsProps>) {
  if (!extraAmenitiesConfig || extraAmenitiesConfig.length === 0) return null;

  return (
    <div className="md:col-span-2 space-y-4 mt-2 pt-4 border-t border-border/50 text-left">
      <h5 className="text-xs font-black text-foreground/45 uppercase tracking-widest">
        Custom Options & Amenities
      </h5>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {extraAmenitiesConfig.map((group) => {
          return (
            <div key={group.id} className="space-y-2 bg-foreground/[0.02] p-4 rounded-xl border border-border/40">
              <span className="block text-xs font-bold text-foreground/75 uppercase tracking-wider">
                {group.name} {group.type === "SINGLE" ? "(Choose One)" : "(Select Multiple)"}
              </span>
              <div className="space-y-2 mt-1">
                {group.options.map((option: ExtraAmenityOption) => {
                  const isSelected = p.selectedAmenities?.some((a) => a.optionId === option.id) || false;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        const newSelected = !isSelected;
                        updatePartAmenities({
                          index,
                          groupId: group.id,
                          groupName: group.name,
                          optionId: option.id,
                          optionName: option.name,
                          price: Number(option.price),
                          type: group.type,
                          selected: group.type === "SINGLE" ? !isSelected : newSelected,
                        });
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-lg border border-border/40 bg-card hover:bg-foreground/[0.04] cursor-pointer transition-colors text-left focus:outline-none focus:ring-1 focus:ring-primary/45"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-4 h-4 flex items-center justify-center border transition-all ${
                            group.type === "SINGLE" ? "rounded-full" : "rounded"
                          } ${
                            isSelected
                              ? "bg-primary border-primary text-primary-foreground animate-in zoom-in-50 duration-75"
                              : "border-foreground/20 bg-background"
                          }`}
                        >
                          {isSelected && (
                            <div
                              className={`w-1.5 h-1.5 bg-current ${
                                group.type === "SINGLE" ? "rounded-full" : ""
                              }`}
                            />
                          )}
                        </div>
                        <span className="text-xs font-semibold text-foreground/80">{option.name}</span>
                      </div>
                      <span className="text-xs font-bold text-primary">
                        {option.price > 0 ? `+ ₹${option.price}` : "Free"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ParticipantCard({
  p,
  index,
  isOpen,
  onToggle,
  validationErrors,
  clearFieldError,
  includeMyself,
  setIncludeMyself,
  updatePart,
  pickupPoints,
  dropPoints,
  copyEmergencyFromPrimary,
  extraAmenitiesConfig,
  updatePartAmenities,
}: Readonly<ParticipantCardProps>) {
  return (
    <details
      id={`participant-details-${index}`}
      open={isOpen}
      onToggle={(e) => {
        const openVal = (e.target as HTMLDetailsElement).open;
        onToggle(openVal);
      }}
      className="bg-background rounded-xl border border-border overflow-hidden group shadow-sm scroll-mt-20"
    >
      <ParticipantCardHeader
        p={p}
        index={index}
        validationErrors={validationErrors}
        includeMyself={includeMyself}
        setIncludeMyself={setIncludeMyself}
      />
      <div className="p-5 border-t border-border/50 bg-background">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PersonalFields
            p={p}
            index={index}
            validationErrors={validationErrors}
            clearFieldError={clearFieldError}
            updatePart={updatePart}
          />
          <HealthLocationFields
            p={p}
            index={index}
            validationErrors={validationErrors}
            clearFieldError={clearFieldError}
            updatePart={updatePart}
            pickupPoints={pickupPoints}
            dropPoints={dropPoints}
          />
          <AmenitiesFields
            p={p}
            index={index}
            extraAmenitiesConfig={extraAmenitiesConfig}
            updatePartAmenities={updatePartAmenities}
          />
          <EmergencyFields
            p={p}
            index={index}
            validationErrors={validationErrors}
            clearFieldError={clearFieldError}
            updatePart={updatePart}
            copyEmergencyFromPrimary={copyEmergencyFromPrimary}
          />
        </div>
      </div>
    </details>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function BookingModal({
  experienceId,
  experienceTitle,
  experienceSlug,
  basePrice,
  maxCapacity,
  pickupPoints,
  dropPoints = [],
  initialSelectedSlotId,
  onClose,
}: Readonly<BookingModalProps>) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const router = useRouter();

  const { user } = useAuth();

  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("All");

  // Extract unique months chronologically from slots
  const months = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const uniqueMonths = new Map<string, { label: string; key: string }>();

    const sortedSlots = [...slots].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    sortedSlots.forEach((slot) => {
      const d = new Date(slot.date);
      const m = d.getMonth();
      const y = d.getFullYear();
      const key = `${m}-${y}`;
      if (!uniqueMonths.has(key)) {
        uniqueMonths.set(key, {
          label: `${monthNames[m]} ${y}`,
          key,
        });
      }
    });

    return Array.from(uniqueMonths.values());
  }, [slots]);

  // Filter slots by selected month
  const filteredSlots = useMemo(() => {
    if (selectedMonth === "All") {
      return slots;
    }
    return slots.filter((slot) => {
      const d = new Date(slot.date);
      const key = `${d.getMonth()}-${d.getFullYear()}`;
      return key === selectedMonth;
    });
  }, [slots, selectedMonth]);

  const [participants, setParticipants] = useState(1);
  const [step, setStep] = useState<Step>("slots");
  const [errorMsg, setErrorMsg] = useState("");
  const [partInfo, setPartInfo] = useState<ParticipantDetails[]>([]);
  const [includeMyself, setIncludeMyself] = useState(!!user);
  const [taxes, setTaxes] = useState<
    { id: string; name: string; percentage: number }[]
  >([]);
  const [validationErrors, setValidationErrors] = useState<
    Record<number, Record<string, string>>
  >({});
  const [openDetails, setOpenDetails] = useState<Record<number, boolean>>({
    0: true,
  });

  const [experienceDetail, setExperienceDetail] = useState<ExperienceDetail | null>(null);
  const [paymentType, setPaymentType] = useState<"FULL" | "ADVANCE">("FULL");
  const [appliedCoupons, setAppliedCoupons] = useState<{ id: string; code: string; balance: number }[]>([]);
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  useEffect(() => {
    if (paymentType === "ADVANCE") {
      setAppliedCoupons([]);
      setCouponInput("");
      setCouponError(null);
    }
  }, [paymentType]);

  const extraAmenitiesConfig = useMemo(() => {
    if (!experienceDetail?.extraAmenities) return [];
    if (typeof experienceDetail.extraAmenities === "string") {
      try {
        return JSON.parse(experienceDetail.extraAmenities);
      } catch {
        return [];
      }
    }
    return experienceDetail.extraAmenities;
  }, [experienceDetail]);

  const updatePartAmenities = useCallback(({
    index,
    groupId,
    groupName,
    optionId,
    optionName,
    price,
    type,
    selected,
  }: UpdateAmenityParams) => {
    setPartInfo((prev) => {
      const updated = [...prev];
      const p = updated[index];
      const currentAmenities = p.selectedAmenities || [];
      
      let nextAmenities: SelectedAmenity[] = [];
      
      if (type === "SINGLE") {
        const filtered = currentAmenities.filter((a) => a.groupId !== groupId);
        if (selected) {
          filtered.push({ groupId, groupName, optionId, optionName, price });
        }
        nextAmenities = filtered;
      } else if (selected) {
        if (currentAmenities.some((a) => a.optionId === optionId)) {
          nextAmenities = currentAmenities;
        } else {
          nextAmenities = [...currentAmenities, { groupId, groupName, optionId, optionName, price }];
        }
      } else {
        nextAmenities = currentAmenities.filter((a) => a.optionId !== optionId);
      }
      
      updated[index] = { ...p, selectedAmenities: nextAmenities };
      return updated;
    });
  }, []);

  const fetchExperience = useCallback(async () => {
    try {
      const res = await fetch(`/api/experiences/${experienceSlug}`);
      const data = await res.json();
      if (res.ok) {
        setExperienceDetail(data);
      }
    } catch (err) {
      console.error("Failed to load experience details:", err);
    }
  }, [experienceSlug]);

  useEffect(() => {
    fetchExperience();
  }, [fetchExperience]);

  const createParticipant = useCallback(
    (isPrimary: boolean): ParticipantDetails => {
      const base: ParticipantDetails = {
        id: crypto.randomUUID(),
        isPrimary,
        name: "",
        email: "",
        phoneNumber: "",
        gender: "",
        dateOfBirth: "",
        bloodGroup: "",
        emergencyContactName: "",
        emergencyContactNumber: "",
        emergencyRelationship: "",
        pickupPoint: "",
        dropPoint: "",
      };

      if (!isPrimary || !user) return base;

      return {
        ...base,
        name: user.name ?? "",
        email: user.email ?? "",
        phoneNumber: user.phoneNumber ?? "",
        gender: user.gender ?? "",
        dateOfBirth: user.dateOfBirth ?? "",
        bloodGroup: user.bloodGroup ?? "",
        emergencyContactName: user.emergencyContactName ?? "",
        emergencyContactNumber: user.emergencyContactNumber ?? "",
        emergencyRelationship: user.emergencyRelationship ?? "",
      };
    },
    [user],
  );

  const fetchSlots = useCallback(async () => {
    setSlotsLoading(true);
    try {
      const res = await fetch(`/api/experiences/${experienceSlug}/slots`);
      const data = await res.json();
      setSlots(data.slots || []);
    } catch {
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [experienceSlug]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  useEffect(() => {
    if (initialSelectedSlotId && slots.length > 0) {
      const matched = slots.find((s) => s.id === initialSelectedSlotId);
      if (matched) {
        setSelectedSlot(matched);
      }
    }
  }, [initialSelectedSlotId, slots]);

  useEffect(() => {
    const fetchTaxes = async () => {
      try {
        const res = await fetch("/api/settings/public");
        const data = await res.json();
        if (data.taxConfig) {
          const parsed = JSON.parse(data.taxConfig);
          if (Array.isArray(parsed)) {
            setTaxes(parsed);
          }
        }
      } catch (err) {
        console.error("Failed to load taxes config:", err);
      }
    };
    fetchTaxes();
  }, []);

  useEffect(() => {
    setPartInfo((prev) =>
      adjustParticipants(prev, participants, includeMyself, createParticipant),
    );
  }, [participants, createParticipant, includeMyself]);

  const updatePart = (
    index: number,
    field: keyof ParticipantDetails,
    value: string,
  ) => {
    setPartInfo((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const clearFieldError = useCallback(
    (index: number, field: keyof ParticipantDetails) => {
      if (validationErrors[index]?.[field]) {
        setValidationErrors((prev) => ({
          ...prev,
          [index]: { ...prev[index], [field]: "" },
        }));
      }
    },
    [validationErrors],
  );

  const copyEmergencyFromPrimary = (index: number) => {
    if (index === 0 || partInfo.length < 1) return;
    const primary = partInfo[0];
    const updated = [...partInfo];
    updated[index] = {
      ...updated[index],
      emergencyContactName: primary.emergencyContactName,
      emergencyContactNumber: primary.emergencyContactNumber,
      emergencyRelationship: primary.emergencyRelationship,
    };
    setPartInfo(updated);

    // Clear validation errors for emergency fields
    if (validationErrors[index]) {
      setValidationErrors((prev) => {
        const nextErrors = { ...prev };
        if (nextErrors[index]) {
          const pErrors = { ...nextErrors[index] };
          delete pErrors.emergencyContactName;
          delete pErrors.emergencyContactNumber;
          delete pErrors.emergencyRelationship;
          nextErrors[index] = pErrors;
        }
        return nextErrors;
      });
    }
  };

  const validateForm = () => {
    const errors: Record<number, Record<string, string>> = {};
    let isValid = true;

    partInfo.forEach((p, index) => {
      const pErrors = validateParticipant(p, pickupPoints, dropPoints);
      if (Object.keys(pErrors).length > 0) {
        errors[index] = pErrors;
        isValid = false;
      }
    });

    setValidationErrors(errors);
    return { isValid, errors };
  };

  const handleDetailsSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { isValid, errors } = validateForm();
    if (!isValid) {
      // Find first participant with errors and expand their details
      const firstErrorIndex = partInfo.findIndex((_, idx) => errors[idx]);
      if (firstErrorIndex !== -1) {
        setOpenDetails((prev) => ({ ...prev, [firstErrorIndex]: true }));

        // Scroll to that participant container
        setTimeout(() => {
          const el = document.getElementById(
            `participant-details-${firstErrorIndex}`,
          );
          if (el && typeof el.scrollIntoView === "function") {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 50);
      }
      setErrorMsg("Please fill in all compulsory fields for all participants.");
      return;
    }
    setErrorMsg("");
    setStep("summary");
  };

  const baseFare = useMemo(() => {
    let fare = basePrice * participants;
    partInfo.forEach((p) => {
      if (p.selectedAmenities && Array.isArray(p.selectedAmenities)) {
        p.selectedAmenities.forEach((a) => {
          fare += a.price;
        });
      }
    });
    return fare;
  }, [basePrice, participants, partInfo]);

  const taxAmount = useMemo(() => {
    return taxes.reduce(
      (acc, tax) => acc + (baseFare * tax.percentage) / 100,
      0,
    );
  }, [baseFare, taxes]);

  const totalPrice = baseFare + taxAmount;

  const couponDiscount = useMemo(() => {
    return appliedCoupons.reduce((sum, c) => sum + c.balance, 0);
  }, [appliedCoupons]);

  const finalPriceToPay = Math.max(0, totalPrice - couponDiscount);
  const payableAmount = paymentType === "ADVANCE" ? (Number(experienceDetail?.advancePaymentAmount ?? 0) * participants) : finalPriceToPay;

  async function handleProceedToPay() {
    setStep("processing");
    setErrorMsg("");

    const isFullyPaidByCoupon = paymentType === "FULL" && payableAmount <= 0.01;
    
    if (!isFullyPaidByCoupon) {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setErrorMsg(
          "Failed to load payment gateway. Please check your internet connection.",
        );
        setStep("error");
        return;
      }
    }

    try {
      if (!selectedSlot) throw new Error("No slot selected.");

      const bookRes = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experienceId,
          slotId: selectedSlot.id,
          participantCount: participants,
          participants: partInfo.map((p) => ({
            ...p,
            selectedAmenities: p.selectedAmenities || [],
          })),
          paymentType,
          appliedCoupons: appliedCoupons.map((c) => c.code),
        }),
      });
      const bookData = await bookRes.json();
      if (!bookRes.ok)
        throw new Error(bookData.error || "Failed to create booking.");

      const { bookingId: bId, orderId, amount, currency, keyId, fullyPaidByCoupon } = bookData;

      if (fullyPaidByCoupon) {
        router.push(`/bookings/${bId}/success`);
        return;
      }

      const rzp = new globalThis.window.Razorpay({
        key: keyId,
        amount,
        currency,
        order_id: orderId,
        name: "Param Adventures",
        description: experienceTitle,
        theme: { color: "#D4AF37" },
        handler: async (response: Record<string, string>) => {
          try {
            const verifyRes = await fetch("/api/bookings/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                bookingId: bId,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error);
            router.push(`/bookings/${bId}/success`);
          } catch (err: unknown) {
            setErrorMsg(
              err instanceof Error
                ? err.message
                : "Payment verification failed.",
            );
            setStep("error");
          }
        },
        modal: {
          ondismiss: () => setStep("summary"),
        },
      });
      rzp.open();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      setStep("error");
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border sticky top-0 bg-card z-10">
          <div>
            <h2 className="text-lg font-heading font-bold text-foreground">
              Book Experience
            </h2>
            <p className="text-xs text-foreground/50 mt-0.5 truncate max-w-70">
              {experienceTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-foreground/10 rounded-lg transition-colors text-foreground/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step: Slot Selection */}
        {step === "slots" && (
          <div className="p-6">
            <h3 className="text-sm font-semibold text-foreground/60 uppercase tracking-wider mb-4">
              Choose a Date
            </h3>

            {slotsLoading && (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}

            {!slotsLoading && slots.length === 0 && (
              <div className="text-center py-12">
                <CalendarDays className="w-12 h-12 mx-auto mb-3 text-foreground/20" />
                <p className="text-foreground/50 font-medium">
                  No available dates
                </p>
                <p className="text-foreground/40 text-sm mt-1">
                  Check back soon for upcoming slots.
                </p>
              </div>
            )}

            {!slotsLoading && slots.length > 0 && (
              <div className="space-y-6">
                {/* Month filter buttons */}
                {months.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pb-1">
                    <button
                      type="button"
                      onClick={() => setSelectedMonth("All")}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border whitespace-nowrap ${
                        selectedMonth === "All"
                          ? "bg-primary border-primary text-primary-foreground"
                          : "bg-background border-border text-foreground/75 hover:bg-foreground/5"
                      }`}
                    >
                      All Months
                    </button>
                    {months.map((m: { label: string; key: string }) => (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setSelectedMonth(m.key)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border whitespace-nowrap ${
                          selectedMonth === m.key
                            ? "bg-primary border-primary text-primary-foreground"
                            : "bg-background border-border text-foreground/75 hover:bg-foreground/5"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Slots Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                  {filteredSlots.map((slot: Slot) => {
                    const isSelected = selectedSlot?.id === slot.id;
                    const isSoldOut = slot.remainingCapacity <= 0;

                    const getCardClasses = () => {
                      if (isSelected) {
                        return "bg-primary/5 border-primary shadow-sm ring-1 ring-primary";
                      }
                      if (isSoldOut) {
                        return "bg-foreground/[0.01] border-border/40 opacity-45 cursor-not-allowed";
                      }
                      return "bg-background border-border hover:border-foreground/20 hover:bg-foreground/[0.01]";
                    };

                    const getBadgeClasses = () => {
                      if (isSoldOut) {
                        return "bg-red-500/10 text-red-500";
                      }
                      if (isSelected) {
                        return "bg-primary/10 text-primary";
                      }
                      return "bg-foreground/5 text-foreground/50";
                    };

                    return (
                      <button
                        key={slot.id}
                        type="button"
                        disabled={isSoldOut}
                        onClick={() => setSelectedSlot(isSelected ? null : slot)}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-center relative group select-none ${getCardClasses()}`}
                      >
                        <span className={`text-[10px] font-black uppercase tracking-wider ${
                          isSelected ? "text-primary" : "text-foreground/45"
                        }`}>
                          {new Date(slot.date).toLocaleDateString("en-IN", { weekday: "short" })}
                        </span>
                        <span className="text-sm font-black text-foreground mt-0.5">
                          {new Date(slot.date).toLocaleDateString("en-IN", { day: "numeric" })}{" "}
                          {new Date(slot.date).toLocaleDateString("en-IN", { month: "short" })}
                        </span>
                        <span className={`text-[9px] font-bold mt-1 px-1.5 py-0.5 rounded-full ${getBadgeClasses()}`}>
                          {isSoldOut ? "Sold Out" : `${slot.remainingCapacity} left`}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {selectedSlot && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between bg-foreground/3 rounded-2xl p-4 border border-border/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">
                            Participants
                          </p>
                          <p className="text-xs text-foreground/50">
                            How many people are joining?
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() =>
                            setParticipants((p) => Math.max(1, p - 1))
                          }
                          className="w-10 h-10 rounded-xl border border-border flex items-center justify-center hover:bg-foreground/5 font-bold text-foreground transition-colors disabled:opacity-20"
                          disabled={participants === 1}
                        >
                          -
                        </button>
                        <span className="w-6 text-center text-lg font-black text-foreground">
                          {participants}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setParticipants((p) =>
                              Math.min(
                                maxCapacity,
                                selectedSlot.remainingCapacity,
                                p + 1,
                              ),
                            )
                          }
                          className="w-10 h-10 rounded-xl border border-border flex items-center justify-center hover:bg-foreground/5 font-bold text-foreground transition-colors disabled:opacity-20"
                          disabled={
                            participants >= maxCapacity ||
                            participants >= selectedSlot.remainingCapacity
                          }
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-4 px-1">
                        <div>
                          <p className="text-xs font-bold text-foreground/40 uppercase tracking-widest">
                            Total Price (Incl. Taxes)
                          </p>
                          <p className="text-sm text-foreground/60 mt-0.5">
                            ₹{basePrice.toLocaleString("en-IN")} ×{" "}
                            {participants}
                          </p>
                          {taxAmount > 0 && (
                            <p className="text-[10px] text-foreground/40 mt-0.5">
                              Base: ₹{baseFare.toLocaleString("en-IN")}
                              {taxes.map((tax) => {
                                const amount = (baseFare * tax.percentage) / 100;
                                return ` + ${tax.name} (${tax.percentage}%): ₹${amount.toLocaleString("en-IN")}`;
                              })}
                            </p>
                          )}
                        </div>
                        <span className="text-2xl font-black text-primary">
                          ₹{totalPrice.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <button
                        onClick={() => setStep("participants")}
                        className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black text-lg shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                      >
                        Continue to Details
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step: Participants Form */}
        {step === "participants" && (
          <form onSubmit={handleDetailsSubmit} className="p-6 space-y-8">
            <h3 className="text-sm font-semibold text-foreground/60 uppercase tracking-wider mb-2">
              Participant Details
            </h3>

            {errorMsg && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm font-semibold flex items-center gap-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {partInfo.map((p, index) => (
              <ParticipantCard
                key={p.id}
                p={p}
                index={index}
                isOpen={openDetails[index] || false}
                onToggle={(isOpen) => {
                  setOpenDetails((prev) => ({ ...prev, [index]: isOpen }));
                }}
                validationErrors={validationErrors[index]}
                clearFieldError={(field) => clearFieldError(index, field)}
                includeMyself={includeMyself}
                setIncludeMyself={setIncludeMyself}
                updatePart={updatePart}
                pickupPoints={pickupPoints}
                dropPoints={dropPoints}
                copyEmergencyFromPrimary={copyEmergencyFromPrimary}
                extraAmenitiesConfig={extraAmenitiesConfig}
                updatePartAmenities={updatePartAmenities}
              />
            ))}

            <div className="flex gap-3 sticky bottom-0 bg-card py-4 border-t border-border z-10 w-full mt-0 -mx-6 px-6 -mb-6">
              <button
                type="button"
                onClick={() => setStep("slots")}
                className="w-1/3 py-3 border border-border rounded-xl text-foreground hover:bg-foreground/5 transition-colors font-bold"
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors"
              >
                Review Booking
              </button>
            </div>
          </form>
        )}

        {/* Step: Summary */}
        {step === "summary" && selectedSlot && (
          <div className="p-6 space-y-5">
            <h3 className="text-sm font-semibold text-foreground/60 uppercase tracking-wider">
              Booking Summary
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div className="flex items-center gap-2 text-foreground/60">
                  <CalendarDays className="w-4 h-4" />
                  <span className="text-sm">Date</span>
                </div>
                <span className="font-semibold text-foreground text-sm">
                  {formatDate(selectedSlot.date)}
                </span>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-border">
                <div className="flex items-center gap-2 text-foreground/60">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">Participants</span>
                </div>
                <span className="font-semibold text-foreground text-sm">
                  {participants} person{participants === 1 ? "" : "s"}
                </span>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-border">
                <div className="flex items-center gap-2 text-foreground/60">
                  <IndianRupee className="w-4 h-4" />
                  <span className="text-sm">Base Fare</span>
                </div>
                <span className="font-semibold text-foreground text-sm">
                  ₹{baseFare.toLocaleString("en-IN")}
                </span>
              </div>

              {taxes.map((tax, idx) => {
                const amount = (baseFare * tax.percentage) / 100;
                return (
                  <div
                    key={`${tax.name}-${idx}`}
                    className="flex items-center justify-between py-3 border-b border-border"
                  >
                    <div className="flex items-center gap-2 text-foreground/60 pl-6">
                      <span className="text-sm">
                        {tax.name} ({tax.percentage}%)
                      </span>
                    </div>
                    <span className="font-semibold text-foreground text-sm">
                      ₹{amount.toLocaleString("en-IN")}
                    </span>
                  </div>
                );
              })}

              {appliedCoupons.length > 0 && (
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div className="flex items-center gap-2 text-primary font-medium pl-6">
                    <span className="text-sm">Coupon Discount</span>
                  </div>
                  <span className="font-semibold text-primary text-sm">
                    - ₹{couponDiscount.toLocaleString("en-IN")}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between py-3 border-b border-border last:border-none">
                <div className="flex items-center gap-2 text-foreground/60">
                  <IndianRupee className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold">{appliedCoupons.length > 0 ? "Net Payable" : "Total Amount"}</span>
                </div>
                <span className="font-bold text-primary text-base">
                  ₹{payableAmount.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {paymentType === "FULL" && (
              <div className="border-t border-border/50 pt-4 space-y-3">
                <span className="block text-xs font-black uppercase tracking-wider text-foreground/50 text-left">
                  Travel Vouchers & Coupons
                </span>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => {
                      setCouponInput(e.target.value);
                      setCouponError(null);
                    }}
                    placeholder="Enter coupon code (e.g. PARAM-XXXXXX)"
                    className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-foreground/30 uppercase"
                  />
                  <button
                    type="button"
                    disabled={couponLoading || !couponInput.trim()}
                    onClick={async () => {
                      setCouponLoading(true);
                      setCouponError(null);
                      try {
                        const remainingToDiscount = totalPrice - appliedCoupons.reduce((sum, c) => sum + c.balance, 0);
                        
                        const res = await fetch("/api/coupons/validate", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            code: couponInput,
                            paymentAmount: remainingToDiscount
                          }),
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || "Failed to validate coupon.");
                        
                        if (appliedCoupons.some(c => c.code.toUpperCase() === couponInput.toUpperCase().trim())) {
                          throw new Error("Coupon already applied.");
                        }
                        
                        setAppliedCoupons(prev => [...prev, data.coupon]);
                        setCouponInput("");
                      } catch (err: unknown) {
                        setCouponError(err instanceof Error ? err.message : "Invalid coupon.");
                      } finally {
                        setCouponLoading(false);
                      }
                    }}
                    className="px-4 py-2 bg-foreground text-background dark:bg-foreground dark:text-background rounded-xl font-bold text-xs hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center min-w-[70px]"
                  >
                    {couponLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Apply"}
                  </button>
                </div>

                {couponError && (
                  <p className="text-xs text-red-500 text-left font-semibold">{couponError}</p>
                )}

                {appliedCoupons.length > 0 && (
                  <div className="space-y-1.5 mt-2">
                    {appliedCoupons.map((coupon) => (
                      <div key={coupon.id} className="flex justify-between items-center bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 text-xs">
                        <span className="font-bold text-primary flex items-center gap-1.5">
                          🎟️ {coupon.code}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">- ₹{coupon.balance.toLocaleString("en-IN")}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setAppliedCoupons(prev => prev.filter(c => c.id !== coupon.id));
                            }}
                            className="text-red-500 hover:text-red-700 transition-colors text-[10px] font-bold uppercase tracking-wider"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="bg-foreground/3 border border-border rounded-xl p-3 text-xs text-foreground/50 text-center">
              Secure payment powered by Razorpay • 100% Safe
            </div>

            {experienceDetail?.allowAdvancePayment && experienceDetail?.advancePaymentAmount && (
              <div className="bg-primary/5 rounded-2xl p-5 border border-primary/20 space-y-4 my-2 text-left">
                <span className="block text-xs font-black uppercase tracking-wider text-primary">
                  Payment Mode Selection
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentType("FULL")}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      paymentType === "FULL"
                        ? "border-primary bg-primary/10 font-bold text-foreground"
                        : "border-border bg-card hover:bg-foreground/5 text-foreground/80"
                    }`}
                  >
                    <span className="block text-[10px] font-semibold opacity-70">Pay Full Amount</span>
                    <span className="block text-sm font-black mt-1">₹{totalPrice.toLocaleString("en-IN")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentType("ADVANCE")}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      paymentType === "ADVANCE"
                        ? "border-primary bg-primary/10 font-bold text-foreground"
                        : "border-border bg-card hover:bg-foreground/5 text-foreground/80"
                    }`}
                  >
                    <span className="block text-[10px] font-semibold opacity-70">Pay Advance Booking</span>
                    <span className="block text-sm font-black mt-1">₹{(Number(experienceDetail?.advancePaymentAmount ?? 0) * participants).toLocaleString("en-IN")}</span>
                  </button>
                </div>
                <div className="text-[11px] text-foreground/60 leading-relaxed text-left">
                  {paymentType === "ADVANCE" ? (
                    <p>
                      You pay <strong className="text-primary font-bold">₹{(Number(experienceDetail?.advancePaymentAmount ?? 0) * participants).toLocaleString("en-IN")}</strong> now. The remaining balance of <strong className="text-foreground font-bold">₹{(totalPrice - Number(experienceDetail?.advancePaymentAmount ?? 0) * participants).toLocaleString("en-IN")}</strong> can be paid closer to the trek date.
                    </p>
                  ) : (
                    <p>You pay the full booking amount of <strong className="text-foreground font-bold">₹{totalPrice.toLocaleString("en-IN")}</strong> now.</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep("participants")}
                className="flex-1 py-3 border border-border rounded-xl text-foreground hover:bg-foreground/5 font-bold"
              >
                ← Edit Details
              </button>
              <button
                onClick={handleProceedToPay}
                className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors"
              >
                Pay {paymentType === "ADVANCE"
                   ? `₹${(Number(experienceDetail?.advancePaymentAmount ?? 0) * participants).toLocaleString("en-IN")}`
                   : `₹${payableAmount.toLocaleString("en-IN")}`
                 }
              </button>
            </div>
          </div>
        )}

        {/* Processing State */}
        {step === "processing" && (
          <div className="p-12 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="font-semibold text-foreground">Preparing payment…</p>
            <p className="text-sm text-foreground/50 mt-1">
              Please do not close this window.
            </p>
          </div>
        )}

        {/* Success State */}
        {step === "success" && (
          <div className="p-10 text-center">
            <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Booking Confirmed!</h3>
            <p className="text-sm mb-6 text-foreground/70">
              Check your dashboard for details.
            </p>
            <a
              href="/dashboard"
              className="block w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold text-center"
            >
              View Dashboard
            </a>
          </div>
        )}

        {/* Error State */}
        {step === "error" && (
          <div className="p-10 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2 text-red-500">Error</h3>
            <p className="text-sm mb-6 text-foreground/70">
              {errorMsg || "Payment failed."}
            </p>
            <button
              onClick={() => setStep("summary")}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
