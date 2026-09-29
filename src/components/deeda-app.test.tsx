import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DeedaApp } from "./deeda-app";

describe("Deeda demo entry", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("enters the workbench without requiring credentials", async () => {
    const user = userEvent.setup();
    render(<DeedaApp />);

    expect(screen.getByRole("heading", { name: "Welcome to Deeda" })).toBeInTheDocument();
    expect(screen.getByLabelText("Username or email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /continue with google/i }),
    ).toBeDisabled();
    expect(screen.getByText(/Google sign-in is not connected/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByRole("heading", { name: "Your AI workbench" })).toBeInTheDocument();
  });

  it("does not persist a password entered in the local demo form", async () => {
    const user = userEvent.setup();
    render(<DeedaApp />);

    await user.type(screen.getByLabelText("Username or email"), "demo@example.com");
    await user.type(screen.getByLabelText("Password"), "temporary-demo-password");
    await user.click(screen.getByRole("button", { name: "Log in" }));
    await screen.findByRole("heading", { name: "Your AI workbench" });

    expect(window.localStorage.length).toBe(0);
    expect(window.localStorage.getItem("litechat.conversations.v1")).toBeNull();
  });
});
