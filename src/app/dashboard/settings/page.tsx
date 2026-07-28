"use client";

import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import TwoFactorSettings from "@/components/dashboard/TwoFactorSettings";
import {
  User,
  Lock,
  Save,
  AlertCircle,
  CheckCircle2,
  Stethoscope,
  HeartPulse,
  Download,
  Trash2,
  X,
} from "lucide-react";

const COUNTRY_CODES = [
  { code: "+91", name: "India" },
  { code: "+1", name: "USA" },
  { code: "+44", name: "UK" },
  { code: "+971", name: "UAE" },
  { code: "+61", name: "Australia" },
  { code: "+65", name: "Singapore" },
];

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong";
}

export default function SettingsPage() {
  const { user, mutateUser, logout } = useAuth();
  const router = useRouter();

  // Profile Identity State
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<string>("");
  const [bloodGroup, setBloodGroup] = useState("");

  // Emergency Contact State
  const [ecName, setEcName] = useState("");
  const [ecCountryCode, setEcCountryCode] = useState("+91");
  const [ecPhone, setEcPhone] = useState("");
  const [ecRelationship, setEcRelationship] = useState("");

  const parsePhoneNumber = useCallback((fullPhone: string) => {
    if (!fullPhone) return { code: "+91", number: "" };
    const matchedCode = COUNTRY_CODES.find((c) =>
      fullPhone.startsWith(c.code),
    );
    if (matchedCode) {
      return {
        code: matchedCode.code,
        number: fullPhone.slice(matchedCode.code.length).trim(),
      };
    }
    return { code: "+91", number: fullPhone };
  }, []);

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: "", text: "" });

  // Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState({ type: "", text: "" });

  // Danger Zone State
  const [isExportingData, setIsExportingData] = useState(false);
  const [exportMsg, setExportMsg] = useState({ type: "", text: "" });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState({ type: "", text: "" });

  // Initialize state from user object
  useEffect(() => {
    if (user) {
      setName(user.name || "");

      const { code, number } = parsePhoneNumber(user.phoneNumber || "");
      setCountryCode(code);
      setPhone(number);

      setGender(user.gender || "");
      setDateOfBirth(user.dateOfBirth || "");
      setBloodGroup(user.bloodGroup || "");
      setEcName(user.emergencyContactName || "");

      const { code: ecc, number: ecn } = parsePhoneNumber(
        user.emergencyContactNumber || "",
      );
      setEcCountryCode(ecc);
      setEcPhone(ecn);

      setEcRelationship(user.emergencyRelationship || "");
    }
  }, [user, parsePhoneNumber]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleProfileUpdate = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setProfileMsg({ type: "", text: "" });

    // Validation for compulsory fields
    if (!name.trim()) {
      setProfileMsg({ type: "error", text: "Full Name is required" });
      setIsUpdatingProfile(false);
      return;
    }
    if (!phone.trim()) {
      setProfileMsg({ type: "error", text: "Phone Number is required" });
      setIsUpdatingProfile(false);
      return;
    }
    if (!gender) {
      setProfileMsg({ type: "error", text: "Please select your gender" });
      setIsUpdatingProfile(false);
      return;
    }
    if (!dateOfBirth) {
      setProfileMsg({ type: "error", text: "Date of Birth is required" });
      setIsUpdatingProfile(false);
      return;
    }

    if (ecPhone?.trim() === phone.trim()) {
      setProfileMsg({
        type: "error",
        text: "Emergency contact number cannot be your own phone number.",
      });
      setIsUpdatingProfile(false);
      return;
    }

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phoneNumber: `${countryCode} ${phone.trim()}`,
          gender,
          dateOfBirth,
          bloodGroup,
          emergencyContactName: ecName,
          emergencyContactNumber: ecPhone
            ? `${ecCountryCode} ${ecPhone.trim()}`
            : null,
          emergencyRelationship: ecRelationship,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile");

      setProfileMsg({ type: "success", text: "Profile updated successfully!" });
      if (mutateUser) mutateUser(); // Refresh global auth context
    } catch (err: unknown) {
      setProfileMsg({ type: "error", text: getErrorMessage(err) });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handlePasswordUpdate = async (e: React.SyntheticEvent) => {
    // ... (logic remains same, just ensuring icons and classes match)
    e.preventDefault();
    setIsUpdatingPassword(true);
    setPasswordMsg({ type: "", text: "" });

    if (newPassword.length < 6) {
      setPasswordMsg({
        type: "error",
        text: "New password must be at least 6 characters",
      });
      setIsUpdatingPassword(false);
      return;
    }

    try {
      const res = await fetch("/api/user/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update password");

      setPasswordMsg({
        type: "success",
        text: "Password changed successfully!",
      });
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: unknown) {
      setPasswordMsg({ type: "error", text: getErrorMessage(err) });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleDataExport = async () => {
    setIsExportingData(true);
    setExportMsg({ type: "", text: "" });
    try {
      const res = await fetch("/api/user/data-export");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to export data");

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `param-adventures-my-data-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setExportMsg({ type: "error", text: getErrorMessage(err) });
    } finally {
      setIsExportingData(false);
    }
  };

  const handleDeleteAccount = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setIsDeletingAccount(true);
    setDeleteMsg({ type: "", text: "" });

    try {
      const res = await fetch("/api/user/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword, confirmation: deleteConfirmText }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete account");

      await logout();
      router.push("/");
    } catch (err: unknown) {
      setDeleteMsg({ type: "error", text: getErrorMessage(err) });
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pt-32 lg:pt-40 pb-12 px-4">
      <div className="mb-10">
        <h1 className="text-3xl font-heading font-black text-foreground">
          Account Settings
        </h1>
        <p className="text-foreground/60 mt-2">
          Keep your profile updated for a seamless adventure experience.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Profile Info Sections */}
        <div className="lg:col-span-2 space-y-8">
          <form onSubmit={handleProfileUpdate} className="space-y-8">
            {/* Identity & Contact Section */}
            <div className="bg-card rounded-3xl border border-border p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold font-heading">
                    Identity & Contact
                  </h2>
                  <p className="text-xs text-foreground/40 mt-0.5">
                    Essential details used for bookings and communication.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="fullName"
                    className="block text-sm font-bold text-foreground mb-2"
                  >
                    Full Name <span className="text-primary">*</span>
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="First and last name"
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor="phoneNumber"
                    className="block text-sm font-bold text-foreground mb-2"
                  >
                    Phone Number <span className="text-primary">*</span>
                  </label>
                  <div className="flex items-center gap-0 border border-border rounded-xl bg-background overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary shadow-sm transition-all">
                    <div className="pl-4 pr-1 text-foreground/40 font-black select-none">
                      +
                    </div>
                    <input
                      type="text"
                      id="countryCode"
                      value={countryCode.replace("+", "")}
                      onChange={(e) =>
                        setCountryCode(
                          `+${e.target.value.replaceAll(/\D/g, "")}`,
                        )
                      }
                      className="w-16 py-3 bg-transparent font-bold text-foreground focus:outline-none"
                      placeholder="91"
                      maxLength={4}
                    />
                    <div className="w-px h-6 bg-border mx-2" />
                    <input
                      id="phoneNumber"
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      placeholder="99999 99999"
                      className="flex-1 min-w-0 py-3 pr-4 bg-transparent focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="gender"
                    className="block text-sm font-bold text-foreground mb-2"
                  >
                    Gender <span className="text-primary">*</span>
                  </label>
                  <select
                    id="gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm appearance-none"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="emailAddress"
                    className="block text-sm font-bold text-foreground mb-2"
                  >
                    Email Address <span className="text-primary">*</span>
                  </label>
                  <input
                    id="emailAddress"
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full px-4 py-3 bg-foreground/5 text-foreground/40 border border-transparent rounded-xl cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Health & Safety Section */}
            <div className="bg-card rounded-3xl border border-border p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold font-heading">
                    Health & Safety
                  </h2>
                  <p className="text-xs text-foreground/40 mt-0.5">
                    Optional info for ensuring your safety during high-altitude
                    treks.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="dateOfBirth"
                    className="block text-sm font-bold text-foreground mb-2"
                  >
                    Date of Birth <span className="text-primary">*</span>
                  </label>
                  <input
                    id="dateOfBirth"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        const parts = val.split("-");
                        if (parts[0] && parts[0].length > 4) {
                          parts[0] = parts[0].slice(0, 4);
                          setDateOfBirth(parts.join("-"));
                          return;
                        }
                      }
                      setDateOfBirth(val);
                    }}
                    required
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
                  />
                  {dateOfBirth && (() => {
                    const birthDate = new Date(dateOfBirth);
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
                        <div className="text-xs text-foreground/50 mt-1.5 font-medium space-y-0.5">
                          <p>Format: <span className="text-foreground font-bold">{formattedDob}</span></p>
                          {!Number.isNaN(calculatedAge) && calculatedAge >= 0 && (
                            <p>Calculated Age: <span className="text-primary font-bold">{calculatedAge} years</span></p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
                <div>
                  <label
                    htmlFor="bloodGroup"
                    className="block text-sm font-bold text-foreground mb-2"
                  >
                    Blood Group
                  </label>
                  <select
                    id="bloodGroup"
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm appearance-none"
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
                </div>
              </div>
            </div>

            {/* Emergency Contact Section */}
            <div className="bg-card rounded-3xl border border-border p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                  <HeartPulse className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold font-heading">
                    Emergency Contact
                  </h2>
                  <p className="text-xs text-foreground/40 mt-0.5">
                    Who should we call in case of an emergency?
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
                <div className="md:col-span-2">
                  <label
                    htmlFor="ecName"
                    className="block text-sm font-bold text-foreground mb-2"
                  >
                    Contact Name
                  </label>
                  <input
                    id="ecName"
                    type="text"
                    value={ecName}
                    onChange={(e) => setEcName(e.target.value)}
                    placeholder="Guardian or friend's name"
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
                  />
                </div>
                <div className="md:col-span-1">
                  <label
                    htmlFor="ecPhone"
                    className="block text-sm font-bold text-foreground mb-2"
                  >
                    Contact Number
                  </label>
                  <div className="flex items-center gap-0 border border-border rounded-xl bg-background overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary shadow-sm transition-all">
                    <div className="pl-4 pr-1 text-foreground/40 font-black select-none">
                      +
                    </div>
                    <input
                      type="text"
                      id="ecCountryCode"
                      value={ecCountryCode.replace("+", "")}
                      onChange={(e) =>
                        setEcCountryCode(
                          `+${e.target.value.replaceAll(/\D/g, "")}`,
                        )
                      }
                      className="w-16 py-3 bg-transparent font-bold text-foreground focus:outline-none"
                      placeholder="91"
                      maxLength={4}
                    />
                    <div className="w-px h-6 bg-border mx-2" />
                    <input
                      id="ecPhone"
                      type="text"
                      value={ecPhone}
                      onChange={(e) => setEcPhone(e.target.value)}
                      placeholder="88888 88888"
                      className="flex-1 min-w-0 py-3 pr-4 bg-transparent focus:outline-none"
                    />
                  </div>
                </div>
                <div className="md:col-span-1">
                  <label
                    htmlFor="ecRelationship"
                    className="block text-sm font-bold text-foreground mb-2"
                  >
                    Relationship
                  </label>
                  <input
                    id="ecRelationship"
                    type="text"
                    value={ecRelationship}
                    onChange={(e) => setEcRelationship(e.target.value)}
                    placeholder="e.g. Father, Spouse"
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
                  />
                </div>
              </div>
            </div>

            {/* Messages & Actions */}
            <div className="flex flex-col gap-6">
              {profileMsg.text && (
                <div
                  className={`flex items-center gap-2 p-5 rounded-2xl text-sm font-semibold ${profileMsg.type === "error" ? "bg-red-500/10 text-red-600 border border-red-500/20" : "bg-green-500/10 text-green-600 border border-green-500/20"}`}
                >
                  {profileMsg.type === "error" ? (
                    <AlertCircle className="w-5 h-5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                  {profileMsg.text}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground font-black rounded-2xl hover:shadow-2xl hover:shadow-primary/30 active:scale-95 transition-all disabled:opacity-50"
                >
                  <Save className="w-5 h-5" />
                  {isUpdatingProfile ? "Saving Profile..." : "Save All Changes"}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Right Column: Security */}
        <div className="space-y-8">
          <div className="bg-card rounded-4xl border border-border p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                <Lock className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold font-heading">Security</h2>
            </div>

            <form onSubmit={handlePasswordUpdate} className="space-y-6">
              <div>
                <label
                  htmlFor="currentPassword"
                  className="block text-sm font-bold text-foreground mb-2"
                >
                  Current Password
                </label>
                <input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="newPassword"
                  className="block text-sm font-bold text-foreground mb-2"
                >
                  New Password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
                />
              </div>

              {passwordMsg.text && (
                <div
                  className={`flex items-center gap-2 p-4 rounded-xl text-sm font-medium ${passwordMsg.type === "error" ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"}`}
                >
                  {passwordMsg.type === "error" ? (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  )}
                  {passwordMsg.text}
                </div>
              )}

              <button
                type="submit"
                disabled={isUpdatingPassword}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-foreground text-background font-black rounded-2xl hover:shadow-xl active:scale-95 transition-all disabled:opacity-50"
              >
                {isUpdatingPassword
                  ? "Updating Password..."
                  : "Update Password"}
              </button>
            </form>
          </div>

          <TwoFactorSettings enabled={user.twoFactorEnabled} />

          {/* Danger Zone */}
          <div className="bg-card rounded-4xl border border-red-500/20 p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                <Trash2 className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold font-heading">Danger Zone</h2>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-foreground/60">
                Download a copy of your profile, bookings, reviews, and coupons.
              </p>
              <button
                type="button"
                onClick={handleDataExport}
                disabled={isExportingData}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-border rounded-xl font-bold hover:bg-foreground/5 transition-colors disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                {isExportingData ? "Preparing…" : "Download My Data"}
              </button>
              {exportMsg.text && (
                <p className="text-sm text-red-500">{exportMsg.text}</p>
              )}
            </div>

            <div className="border-t border-border pt-6 space-y-3">
              <p className="text-sm text-foreground/60">
                Permanently delete your account. This cannot be undone.
              </p>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-500/10 text-red-500 rounded-xl font-bold hover:bg-red-500/20 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete My Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">Delete Account</h3>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                aria-label="Close"
                className="min-w-10 min-h-10 flex items-center justify-center rounded-full hover:bg-foreground/5 text-foreground/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleDeleteAccount} className="p-6 space-y-4">
              <p className="text-sm text-foreground/70">
                This will permanently anonymize your profile and sign you out
                everywhere. This cannot be undone.
              </p>
              <div>
                <label htmlFor="deletePassword" className="block text-sm font-bold text-foreground mb-2">
                  Confirm your password
                </label>
                <input
                  id="deletePassword"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
                />
              </div>
              <div>
                <label htmlFor="deleteConfirmText" className="block text-sm font-bold text-foreground mb-2">
                  Type DELETE to confirm
                </label>
                <input
                  id="deleteConfirmText"
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
                />
              </div>

              {deleteMsg.text && (
                <p className="text-sm text-red-500">{deleteMsg.text}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 py-3 rounded-xl border border-border text-foreground/70 font-bold hover:bg-foreground/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeletingAccount || deleteConfirmText !== "DELETE"}
                  className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold hover:opacity-90 disabled:opacity-50"
                >
                  {isDeletingAccount ? "Deleting…" : "Delete Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
