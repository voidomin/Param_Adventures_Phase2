"use client";

import { useAuth } from "@/lib/AuthContext";
import { useState, useEffect } from "react";
import {
  User,
  Lock,
  Save,
  AlertCircle,
  CheckCircle2,
  Stethoscope,
  HeartPulse,
} from "lucide-react";

export default function SettingsPage() {
  const { user, mutateUser } = useAuth();

  // Profile Identity State
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState<string>("");
  const [bloodGroup, setBloodGroup] = useState("");

  // Emergency Contact State
  const [ecName, setEcName] = useState("");
  const [ecCountryCode, setEcCountryCode] = useState("+91");
  const [ecPhone, setEcPhone] = useState("");
  const [ecRelationship, setEcRelationship] = useState("");

  const countryCodes = [
    { code: "+91", name: "India" },
    { code: "+1", name: "USA" },
    { code: "+44", name: "UK" },
    { code: "+971", name: "UAE" },
    { code: "+61", name: "Australia" },
    { code: "+65", name: "Singapore" },
  ];

  const parsePhoneNumber = (fullPhone: string) => {
    if (!fullPhone) return { code: "+91", number: "" };
    const matchedCode = countryCodes.find((c) => fullPhone.startsWith(c.code));
    if (matchedCode) {
      return {
        code: matchedCode.code,
        number: fullPhone.slice(matchedCode.code.length).trim(),
      };
    }
    return { code: "+91", number: fullPhone };
  };

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: "", text: "" });

  // Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState({ type: "", text: "" });

  // Initialize state from user object
  useEffect(() => {
    if (user) {
      setName(user.name || "");

      const { code, number } = parsePhoneNumber(user.phoneNumber || "");
      setCountryCode(code);
      setPhone(number);

      setGender(user.gender || "");
      setAge(user.age?.toString() || "");
      setBloodGroup(user.bloodGroup || "");
      setEcName(user.emergencyContactName || "");

      const { code: ecc, number: ecn } = parsePhoneNumber(
        user.emergencyContactNumber || "",
      );
      setEcCountryCode(ecc);
      setEcPhone(ecn);

      setEcRelationship(user.emergencyRelationship || "");
    }
  }, [user]);

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
          age: age ? Number.parseInt(age, 10) : null,
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
    } catch (err: any) {
      setProfileMsg({ type: "error", text: err.message });
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
    } catch (err: any) {
      setPasswordMsg({ type: "error", text: err.message });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pt-24 pb-12 px-4">
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
            <div className="bg-card rounded-[1.5rem] border border-border p-8 shadow-sm">
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
                    <div className="pl-4 pr-0.5 text-foreground/40 font-black select-none">
                      +
                    </div>
                    <input
                      type="text"
                      id="countryCode"
                      value={countryCode.replace("+", "")}
                      onChange={(e) =>
                        setCountryCode(`+${e.target.value.replace(/\D/g, "")}`)
                      }
                      className="w-12 py-3 bg-transparent font-bold text-foreground focus:outline-none"
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
                      className="flex-1 py-3 bg-transparent focus:outline-none"
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
            <div className="bg-card rounded-[1.5rem] border border-border p-8 shadow-sm">
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
                    htmlFor="age"
                    className="block text-sm font-bold text-foreground mb-2"
                  >
                    Age
                  </label>
                  <input
                    id="age"
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="e.g. 25"
                    min="1"
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
                  />
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
            <div className="bg-card rounded-[1.5rem] border border-border p-8 shadow-sm">
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
                    <div className="pl-4 pr-0.5 text-foreground/40 font-black select-none">
                      +
                    </div>
                    <input
                      type="text"
                      id="ecCountryCode"
                      value={ecCountryCode.replace("+", "")}
                      onChange={(e) =>
                        setEcCountryCode(
                          `+${e.target.value.replace(/\D/g, "")}`,
                        )
                      }
                      className="w-12 py-3 bg-transparent font-bold text-foreground focus:outline-none"
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
                      className="flex-1 py-3 bg-transparent focus:outline-none"
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
          <div className="bg-card rounded-[2rem] border border-border p-8 shadow-sm">
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
        </div>
      </div>
    </div>
  );
}
