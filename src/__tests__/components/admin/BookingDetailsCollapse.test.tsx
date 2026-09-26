import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import BookingDetailsCollapse, { BookingDetails } from "@/components/admin/BookingDetailsCollapse";

describe("BookingDetailsCollapse", () => {
  const mockBooking: BookingDetails = {
    id: "booking-1",
    participantCount: 2,
    totalPrice: 15000,
    paidAmount: 15000,
    remainingBalance: 0,
    paymentType: "FULL",
    paymentStatus: "SUCCESS",
    bookingStatus: "CONFIRMED",
    user: {
      id: "user-1",
      name: "John Doe",
      email: "john@example.com",
      phoneNumber: "9876543210",
    },
    participants: [
      {
        id: "p-1",
        isPrimary: true,
        name: "John Doe",
        email: "john@example.com",
        phoneNumber: "9876543210",
        gender: "MALE",
        age: 28,
        bloodGroup: "O+",
        emergencyContactName: "Jane Doe",
        emergencyContactNumber: "9123456789",
        emergencyRelationship: "Spouse",
        pickupPoint: "Location A",
        dropPoint: "Location B",
        selectedAmenities: [
          {
            groupId: "g-1",
            groupName: "Stay",
            optionId: "opt-1",
            optionName: "VIP Tent Stay",
            price: 1500,
          },
          {
            groupId: "g-2",
            groupName: "Gear",
            optionId: "opt-2",
            optionName: "Sleeping Bag",
            price: 300,
          },
        ],
      },
      {
        id: "p-2",
        isPrimary: false,
        name: "Jane Doe",
        email: "jane@example.com",
        phoneNumber: "9876543211",
        gender: "FEMALE",
        age: 27,
        bloodGroup: "A+",
        emergencyContactName: "John Doe",
        emergencyContactNumber: "9876543210",
        emergencyRelationship: "Spouse",
        pickupPoint: "Location A",
        dropPoint: "Location B",
        selectedAmenities: [],
      },
    ],
  };

  it("renders participant info and primary booker badge correctly", () => {
    render(<BookingDetailsCollapse booking={mockBooking} />);
    expect(screen.getAllByText("John Doe").length).toBeGreaterThan(0);
    expect(screen.getByText("Primary Booker")).toBeInTheDocument();
  });

  it("renders selected amenities / add-ons box when participant has selected amenities", () => {
    render(<BookingDetailsCollapse booking={mockBooking} />);
    
    // Header for selected amenities
    expect(screen.getByText(/Selected Stays \/ Custom Add-ons/i)).toBeInTheDocument();
    expect(screen.getByText("2 selected")).toBeInTheDocument();

    // Option names and prices
    expect(screen.getByText("VIP Tent Stay")).toBeInTheDocument();
    expect(screen.getByText("+₹1,500")).toBeInTheDocument();

    expect(screen.getByText("Sleeping Bag")).toBeInTheDocument();
    expect(screen.getByText("+₹300")).toBeInTheDocument();
  });
});
