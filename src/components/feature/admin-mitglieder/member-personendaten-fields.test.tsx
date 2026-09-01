import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  EMPTY_MEMBER_PERSONENDATEN_FORM,
  MemberPersonendatenFields,
  emailRequiredFor,
  personendatenFormCanSubmit,
} from "@/components/feature/admin-mitglieder/member-personendaten-fields";

afterEach(() => {
  cleanup();
});

const ADDRESS = {
  street: "Hauptstr. 1",
  postalCode: "52062",
  city: "Aachen",
};

describe("emailRequiredFor", () => {
  it("is false for a MiniMeeple birth date", () => {
    expect(emailRequiredFor("2019-01-01")).toBe(false);
  });

  it("is false for a JungMeeple birth date", () => {
    expect(emailRequiredFor("2015-01-01")).toBe(false);
  });

  it("is true for an adult birth date", () => {
    expect(emailRequiredFor("1990-01-01")).toBe(true);
  });

  it("is true without a birth date (safe default)", () => {
    expect(emailRequiredFor("")).toBe(true);
  });
});

describe("personendatenFormCanSubmit", () => {
  it("is false without an address, regardless of age", () => {
    expect(
      personendatenFormCanSubmit({
        ...EMPTY_MEMBER_PERSONENDATEN_FORM,
        email: "erika@example.com",
      }),
    ).toBe(false);
  });

  it("is false for an adult without an email", () => {
    expect(
      personendatenFormCanSubmit({
        ...EMPTY_MEMBER_PERSONENDATEN_FORM,
        ...ADDRESS,
      }),
    ).toBe(false);
  });

  it("is true for a MiniMeeple with an address but no email", () => {
    expect(
      personendatenFormCanSubmit({
        ...EMPTY_MEMBER_PERSONENDATEN_FORM,
        birthDate: "2019-01-01",
        ...ADDRESS,
      }),
    ).toBe(true);
  });

  it("is true for an adult with both address and email", () => {
    expect(
      personendatenFormCanSubmit({
        ...EMPTY_MEMBER_PERSONENDATEN_FORM,
        email: "erika@example.com",
        ...ADDRESS,
      }),
    ).toBe(true);
  });
});

describe("MemberPersonendatenFields", () => {
  it("shows a MiniMeeple hint for a birth date under 13", () => {
    render(
      <MemberPersonendatenFields
        idPrefix="test"
        form={{ ...EMPTY_MEMBER_PERSONENDATEN_FORM, birthDate: "2019-01-01" }}
        onChange={() => {}}
      />,
    );

    expect(screen.getByText(/MiniMeeple/)).toBeInTheDocument();
  });

  it("shows no age hint for an adult birth date", () => {
    render(
      <MemberPersonendatenFields
        idPrefix="test"
        form={{ ...EMPTY_MEMBER_PERSONENDATEN_FORM, birthDate: "1990-01-01" }}
        onChange={() => {}}
      />,
    );

    expect(screen.queryByText(/MiniMeeple|JungMeeple/)).not.toBeInTheDocument();
  });
});

describe("Demo-Adresse-Button (dev + admin:access only)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is hidden outside development, even for admin:access", () => {
    vi.stubEnv("NODE_ENV", "production");
    render(
      <MemberPersonendatenFields
        idPrefix="test"
        form={EMPTY_MEMBER_PERSONENDATEN_FORM}
        onChange={() => {}}
        isAdmin
      />,
    );

    expect(
      screen.queryByLabelText("Demo-Adresse eintragen"),
    ).not.toBeInTheDocument();
  });

  it("is hidden in development without admin:access", () => {
    vi.stubEnv("NODE_ENV", "development");
    render(
      <MemberPersonendatenFields
        idPrefix="test"
        form={EMPTY_MEMBER_PERSONENDATEN_FORM}
        onChange={() => {}}
        isAdmin={false}
      />,
    );

    expect(
      screen.queryByLabelText("Demo-Adresse eintragen"),
    ).not.toBeInTheDocument();
  });

  it("fills the address fields when clicked (development + admin:access)", () => {
    vi.stubEnv("NODE_ENV", "development");
    const onChange = vi.fn();
    render(
      <MemberPersonendatenFields
        idPrefix="test"
        form={EMPTY_MEMBER_PERSONENDATEN_FORM}
        onChange={onChange}
        isAdmin
      />,
    );

    fireEvent.click(screen.getByLabelText("Demo-Adresse eintragen"));

    expect(onChange).toHaveBeenCalledWith("street", expect.any(String));
    expect(onChange).toHaveBeenCalledWith("postalCode", expect.any(String));
    expect(onChange).toHaveBeenCalledWith("city", expect.any(String));
  });
});
