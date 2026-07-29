import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Modal } from "@/components/ui/Modal";

describe("components/ui/Modal", () => {
  it("renders its children when open", () => {
    render(
      <Modal open onClose={vi.fn()}>
        <p>Modal content</p>
      </Modal>,
    );

    expect(screen.getByText("Modal content")).toBeInTheDocument();
  });

  it("renders nothing when closed", () => {
    render(
      <Modal open={false} onClose={vi.fn()}>
        <p>Modal content</p>
      </Modal>,
    );

    expect(screen.queryByText("Modal content")).not.toBeInTheDocument();
  });

  it("calls onClose when the Escape key is pressed", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose}>
        <p>Modal content</p>
      </Modal>,
    );

    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });

    expect(onClose).toHaveBeenCalled();
  });

  it("moves initial focus into the dialog rather than leaving it on the page body", async () => {
    render(
      <Modal open onClose={vi.fn()}>
        <button type="button">First</button>
        <button type="button">Second</button>
      </Modal>,
    );

    const dialog = screen.getByRole("dialog");
    await waitFor(() => {
      expect(document.activeElement).not.toBe(document.body);
      expect(dialog.contains(document.activeElement)).toBe(true);
    });
  });
});
