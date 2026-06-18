"use client";

import React from "react";
import {
  Mail,
  Phone,
  Users,
  MapPin,
  Shield,
  Activity,
  Tag
} from "lucide-react";

export interface BookingParticipant {
  id: string;
  isPrimary: boolean;
  name: string;
  email: string | null;
  phoneNumber: string | null;
  gender: string | null;
  age: number | null;
  bloodGroup: string | null;
  emergencyContactName: string | null;
  emergencyContactNumber: string | null;
  emergencyRelationship: string | null;
  pickupPoint: string | null;
  dropPoint: string | null;
  attended?: boolean;
}

export interface BookingDetails {
  id: string;
  participantCount: number;
  totalPrice?: number | string | object;
  bookingStatus?: string;
  createdAt?: string;
  user: {
    id: string;
    name: string;
    email: string;
    phoneNumber: string | null;
  };
  participants: BookingParticipant[];
}

interface BookingDetailsCollapseProps {
  readonly booking: BookingDetails;
}

export default function BookingDetailsCollapse({ booking }: BookingDetailsCollapseProps) {
  return (
    <div className="space-y-6">
      {/* Lead Booker Info */}
      <div className="bg-foreground/[0.02] border border-border/85 rounded-xl p-5 shadow-inner">
        <h4 className="text-xs font-bold text-foreground/40 uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-primary" /> Lead Booker / Account Info
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-foreground/50 font-medium">Name</p>
            <p className="font-bold text-foreground mt-0.5">{booking.user.name}</p>
          </div>
          <div>
            <p className="text-xs text-foreground/50 font-medium">Email</p>
            <p className="font-semibold text-foreground/80 mt-0.5 flex items-center gap-1.5 truncate">
              <Mail className="w-3.5 h-3.5 shrink-0 text-foreground/30" /> {booking.user.email}
            </p>
          </div>
          <div>
            <p className="text-xs text-foreground/50 font-medium">Phone Number</p>
            <p className="font-semibold text-foreground/80 mt-0.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 shrink-0 text-foreground/30" /> {booking.user.phoneNumber ?? "—"}
            </p>
          </div>
          <div className="flex gap-4">
            {booking.bookingStatus && (
              <div>
                <p className="text-xs text-foreground/50 font-medium">Booking Status</p>
                <span className="inline-block px-2.5 py-0.5 text-xs font-bold bg-green-500/10 text-green-500 border border-green-500/20 rounded-full mt-1">
                  {booking.bookingStatus}
                </span>
              </div>
            )}
            {booking.totalPrice && (
              <div>
                <p className="text-xs text-foreground/50 font-medium">Total Price Paid</p>
                <p className="font-bold text-foreground mt-0.5">₹{Number(booking.totalPrice).toLocaleString("en-IN")}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Guest Details */}
      <div className="space-y-4">
        <h4 className="text-xs font-bold text-foreground/40 uppercase tracking-widest flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-primary" /> Guest Details ({booking.participantCount})
        </h4>

        {(!booking.participants || booking.participants.length === 0) ? (
          <div className="text-center py-6 border border-dashed border-border rounded-xl text-foreground/40 text-sm">
            No individual guest profiles submitted. Lead booker is the sole participant.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {booking.participants.map((p, index) => (
              <div
                key={p.id}
                className="border border-border rounded-xl overflow-hidden bg-card/60 shadow-xs"
              >
                {/* Header of Guest Card */}
                <div className="px-4 py-2 bg-foreground/[0.01] border-b border-border flex items-center justify-between">
                  <span className="font-bold text-sm text-foreground flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                      {index + 1}
                    </span>
                    {" Guest Profile"}
                  </span>
                  {p.isPrimary && (
                    <span className="text-[10px] font-black uppercase text-primary border border-primary/20 bg-primary/10 px-1.5 py-0.5 rounded-md">
                      Primary Booker
                    </span>
                  )}
                </div>

                {/* Guest Information */}
                <div className="p-4 space-y-4">
                  {/* Grid 1: Basic Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <p className="text-[10px] text-foreground/50 uppercase font-bold tracking-wider">Full Name</p>
                      <p className="font-bold text-sm text-foreground mt-0.5">{p.name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-foreground/50 uppercase font-bold tracking-wider">Email</p>
                      <p className="text-xs text-foreground/80 font-medium mt-0.5 truncate flex items-center gap-1">
                        <Mail className="w-3 h-3 text-foreground/30 shrink-0" /> {p.email ?? "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-foreground/50 uppercase font-bold tracking-wider">Phone</p>
                      <p className="text-xs text-foreground/80 font-medium mt-0.5 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-foreground/30 shrink-0" /> {p.phoneNumber ?? "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-foreground/50 uppercase font-bold tracking-wider">Age / Gender</p>
                      <p className="font-semibold text-xs text-foreground/80 mt-0.5">
                        {p.age !== null && p.age !== undefined ? `${p.age} yrs` : "—"} / {p.gender ?? "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-foreground/50 uppercase font-bold tracking-wider">Blood Group</p>
                      <p className="font-semibold text-xs text-foreground/80 mt-0.5 flex items-center gap-1.5">
                        <Activity className="w-3 h-3 text-red-500 shrink-0" /> {p.bloodGroup ?? "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-foreground/50 uppercase font-bold tracking-wider">Attended Trip?</p>
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border mt-1 ${
                        p.attended 
                          ? "bg-green-500/10 text-green-500 border-green-500/20" 
                          : "bg-foreground/5 text-foreground/40 border-border"
                      }`}>
                        {p.attended ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>

                  {/* Grid 2: Logistics / Pickup Points */}
                  {(p.pickupPoint || p.dropPoint) && (
                    <div className="border-t border-border/60 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-foreground/[0.005] -mx-4 px-4 pb-1">
                      {p.pickupPoint && (
                        <div>
                          <p className="text-[10px] text-foreground/50 uppercase font-bold tracking-wider flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-primary" /> Pickup Location
                          </p>
                          <p className="text-xs font-semibold text-foreground/80 mt-0.5">{p.pickupPoint}</p>
                        </div>
                      )}
                      {p.dropPoint && (
                        <div>
                          <p className="text-[10px] text-foreground/50 uppercase font-bold tracking-wider flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-foreground/40" /> Drop Location
                          </p>
                          <p className="text-xs font-semibold text-foreground/80 mt-0.5">{p.dropPoint}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Grid 3: Emergency Contacts */}
                  {(p.emergencyContactName || p.emergencyContactNumber) && (
                    <div className="border-t border-border/60 pt-3 bg-red-500/[0.02] border-red-500/5 -mx-4 px-4 pb-2">
                      <p className="text-[10px] text-red-500/70 uppercase font-black tracking-wider flex items-center gap-1 mb-2">
                        <Shield className="w-3.5 h-3.5" /> Emergency Contact Details
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <p className="text-[9px] text-foreground/40 uppercase font-bold">Contact Person</p>
                          <p className="font-bold text-xs text-foreground/90 mt-0.5">{p.emergencyContactName ?? "—"}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-foreground/40 uppercase font-bold">Relationship</p>
                          <p className="font-semibold text-xs text-foreground/70 mt-0.5">{p.emergencyRelationship ?? "—"}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-foreground/40 uppercase font-bold">Emergency Phone</p>
                          <p className="font-bold text-xs text-foreground/90 mt-0.5 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-red-400 shrink-0" /> {p.emergencyContactNumber ?? "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
