"use client";

import { useState, useEffect, useCallback } from "react";
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
  ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  onClose: () => void;
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
              updatePart(index, "dateOfBirth", e.target.value);
              clearFieldError("dateOfBirth");
            }}
            className={`w-full px-2 py-2 bg-card border rounded-lg outline-none transition-colors ${
              validationErrors?.dateOfBirth ? "border-red-500 focus:ring-red-500" : "border-border"
            }`}
          />
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
  onClose,
}: Readonly<BookingModalProps>) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const router = useRouter();

  const { user } = useAuth();

  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [participants, setParticipants] = useState(1);
  const [step, setStep] = useState<Step>("slots");
  const [errorMsg, setErrorMsg] = useState("");
  const [partInfo, setPartInfo] = useState<ParticipantDetails[]>([]);
  const [includeMyself, setIncludeMyself] = useState(!!user);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [taxes, setTaxes] = useState<
    { id: string; name: string; percentage: number }[]
  >([]);
  const [validationErrors, setValidationErrors] = useState<
    Record<number, Record<string, string>>
  >({});
  const [openDetails, setOpenDetails] = useState<Record<number, boolean>>({
    0: true,
  });

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

  const baseFare = basePrice * participants;
  const taxAmount = taxes.reduce(
    (acc, tax) => acc + (baseFare * tax.percentage) / 100,
    0,
  );
  const totalPrice = baseFare + taxAmount;

  async function handleProceedToPay() {
    setStep("processing");
    setErrorMsg("");

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      setErrorMsg(
        "Failed to load payment gateway. Please check your internet connection.",
      );
      setStep("error");
      return;
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
          participants: partInfo,
        }),
      });
      const bookData = await bookRes.json();
      if (!bookRes.ok)
        throw new Error(bookData.error || "Failed to create booking.");

      const { bookingId: bId, orderId, amount, currency, keyId } = bookData;

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
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full flex items-center justify-between pl-4 pr-4 py-4 bg-card border border-border rounded-2xl outline-none focus:border-primary/50 transition-all font-bold text-left shadow-sm hover:bg-foreground/2"
                  >
                    <div className="flex items-center gap-3">
                      <CalendarDays className="h-5 w-5 text-primary" />
                      <span
                        className={
                          selectedSlot
                            ? "text-foreground"
                            : "text-foreground/40"
                        }
                      >
                        {selectedSlot
                          ? formatDate(selectedSlot.date)
                          : "Select an upcoming date"}
                      </span>
                    </div>
                    {isDropdownOpen ? (
                      <ChevronUp className="h-5 w-5 text-foreground/40" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-foreground/40" />
                    )}
                  </button>

                  <AnimatePresence>
                    {isDropdownOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden bg-card border border-border rounded-2xl mt-2 shadow-sm"
                      >
                        <div className="max-h-75 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                          {slots.map((slot) => (
                            <button
                              key={slot.id}
                              type="button"
                              onClick={() => {
                                setSelectedSlot(slot);
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-left ${
                                selectedSlot?.id === slot.id
                                  ? "bg-primary/10 border border-primary/20"
                                  : "hover:bg-foreground/3 border border-transparent"
                              }`}
                            >
                              <div>
                                <p
                                  className={`font-bold text-sm ${
                                    selectedSlot?.id === slot.id
                                      ? "text-primary"
                                      : "text-foreground"
                                  }`}
                                >
                                  {formatDate(slot.date)}
                                </p>
                                <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mt-0.5">
                                  {slot.remainingCapacity} spots remaining
                                </p>
                              </div>
                              {selectedSlot?.id === slot.id && (
                                <CheckCircle2 className="h-4 w-4 text-primary" />
                              )}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
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
                              Base: ₹{baseFare.toLocaleString("en-IN")} + Taxes:
                              ₹{taxAmount.toLocaleString("en-IN")}
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

              <div className="flex items-center justify-between py-3 border-b border-border last:border-none">
                <div className="flex items-center gap-2 text-foreground/60">
                  <IndianRupee className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold">Total Amount</span>
                </div>
                <span className="font-bold text-primary text-base">
                  ₹{totalPrice.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <div className="bg-foreground/3 border border-border rounded-xl p-3 text-xs text-foreground/50 text-center">
              Secure payment powered by Razorpay • 100% Safe
            </div>

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
                Pay ₹{totalPrice.toLocaleString("en-IN")}
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
