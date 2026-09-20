"use client";

import { useEffect, useMemo, useState } from "react";
import { Home, MapPin, Building2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";
import {
  getOfficeLabel,
  getWilayaLabel,
  type DeliveryMethod,
  type ShippingOffice,
  type ShippingWilaya,
} from "@/lib/shipping";
import { isValidInstagramHandle } from "@/lib/instagram";

export type CheckoutFormData = {
  firstName: string;
  lastName: string;
  phone: string;
  instagram: string;
  wilaya: string;
  deliveryMethod: DeliveryMethod | "";
  commune: string;
  address: string;
  deliveryOffice: string;
  notes: string;
};

type CheckoutFormProps = {
  wilayas: ShippingWilaya[];
  officesByWilaya: Record<string, ShippingOffice[]>;
  loading: boolean;
  onSubmit: (data: CheckoutFormData) => void;
  onShippingChange?: (wilayaCode: string, deliveryMethod: DeliveryMethod | "") => void;
};

type FormErrors = Partial<Record<keyof CheckoutFormData, string>>;

const emptyForm: CheckoutFormData = {
  firstName: "",
  lastName: "",
  phone: "",
  instagram: "",
  wilaya: "",
  deliveryMethod: "",
  commune: "",
  address: "",
  deliveryOffice: "",
  notes: "",
};

function validatePhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  if (/^0[567]\d{8}$/.test(digits)) return true;
  if (/^213[567]\d{8}$/.test(digits)) return true;
  return false;
}

export function validateCheckoutForm(data: CheckoutFormData, lang: "fr" | "ar"): FormErrors {
  const tr = t(lang);
  const errors: FormErrors = {};

  if (data.firstName.trim().length < 2) errors.firstName = tr.checkout.errors.firstName;
  if (data.lastName.trim().length < 2) errors.lastName = tr.checkout.errors.lastName;
  if (!validatePhone(data.phone)) errors.phone = tr.checkout.errors.phone;
  if (!isValidInstagramHandle(data.instagram)) errors.instagram = tr.checkout.errors.instagram;
  if (!data.wilaya) errors.wilaya = tr.checkout.errors.wilaya;
  if (!data.deliveryMethod) errors.deliveryMethod = tr.checkout.errors.deliveryMethod;

  if (!data.commune.trim()) {
    errors.commune = tr.checkout.errors.commune;
  }
  if (data.deliveryMethod === "HOME" && data.address.trim().length < 5) {
    errors.address = tr.checkout.errors.address;
  }
  if (data.deliveryMethod === "OFFICE" && !data.deliveryOffice) {
    errors.deliveryOffice = tr.checkout.errors.office;
  }

  return errors;
}

export function CheckoutForm({
  wilayas,
  officesByWilaya,
  loading,
  onSubmit,
  onShippingChange,
}: CheckoutFormProps) {
  const { lang } = useLanguage();
  const tr = t(lang);
  const [form, setForm] = useState<CheckoutFormData>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof CheckoutFormData, boolean>>>({});
  const [communes, setCommunes] = useState<string[]>([]);
  const [communesLoading, setCommunesLoading] = useState(false);
  const [communesError, setCommunesError] = useState<string | null>(null);

  const offices = form.wilaya ? (officesByWilaya[form.wilaya] ?? []) : [];

  useEffect(() => {
    if (!form.wilaya) {
      setCommunes([]);
      setCommunesError(null);
      setCommunesLoading(false);
      return;
    }

    let cancelled = false;
    setCommunesLoading(true);
    setCommunesError(null);
    setCommunes([]);

    fetch(`/api/shipping/communes?wilaya=${encodeURIComponent(form.wilaya)}`)
      .then(async (res) => {
        const data = (await res.json()) as { communes?: string[]; error?: string };
        if (cancelled) return;
        if (!res.ok || !data.communes?.length) {
          setCommunes([]);
          setCommunesError(data.error || tr.checkout.communesError);
          return;
        }
        setCommunes(data.communes);
        setCommunesError(null);
      })
      .catch(() => {
        if (!cancelled) {
          setCommunes([]);
          setCommunesError(tr.checkout.communesError);
        }
      })
      .finally(() => {
        if (!cancelled) setCommunesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [form.wilaya, tr.checkout.communesError]);

  const validationErrors = useMemo(() => validateCheckoutForm(form, lang), [form, lang]);
  const isValid = Object.keys(validationErrors).length === 0;

  const update = (patch: Partial<CheckoutFormData>) => {
    setForm((prev) => {
      const next = { ...prev, ...patch };
      if (patch.wilaya !== undefined && patch.wilaya !== prev.wilaya) {
        next.deliveryOffice = "";
        next.commune = "";
      }
      if (patch.deliveryMethod !== undefined && patch.deliveryMethod !== prev.deliveryMethod) {
        next.address = "";
        next.deliveryOffice = "";
      }
      if (patch.wilaya !== undefined || patch.deliveryMethod !== undefined) {
        onShippingChange?.(next.wilaya, next.deliveryMethod);
      }
      return next;
    });
  };

  const blur = (field: keyof CheckoutFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors(validateCheckoutForm(form, lang));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validateCheckoutForm(form, lang);
    setErrors(nextErrors);
    setTouched({
      firstName: true,
      lastName: true,
      phone: true,
      instagram: true,
      wilaya: true,
      deliveryMethod: true,
      commune: true,
      address: true,
      deliveryOffice: true,
    });
    if (Object.keys(nextErrors).length === 0) onSubmit(form);
  };

  const fieldError = (field: keyof CheckoutFormData) =>
    touched[field] ? errors[field] ?? validationErrors[field] : undefined;

  const inputClass = (field: keyof CheckoutFormData) =>
    `w-full rounded-xl border bg-[#fffaf2]/70 px-4 py-2.5 text-[#3d2b1f] outline-none transition placeholder:text-[#a39486] focus:border-[#c9a86c] focus:shadow-[0_0_12px_rgba(201,168,108,0.15)] ${
      fieldError(field) ? "border-red-400/70" : "border-[#a07d3e]/20"
    }`;

  const selectedWilaya = wilayas.find((w) => w.code === form.wilaya);

  return (
    <form onSubmit={handleSubmit} className="luxe-neon-frame rounded-2xl bg-[#fffaf2]/72 p-6 backdrop-blur-xl">
      <h2 className="font-display mb-2 text-xl font-medium text-[#4d3525]">{tr.checkout.title}</h2>
      <p className="mb-6 text-sm font-light tracking-wide text-[#806f60]">{tr.checkout.subtitle}</p>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Field label={tr.checkout.firstName} error={fieldError("firstName")} required>
          <input
            value={form.firstName}
            onChange={(e) => update({ firstName: e.target.value })}
            onBlur={() => blur("firstName")}
            className={inputClass("firstName")}
            placeholder={tr.checkout.firstNamePlaceholder}
          />
        </Field>
        <Field label={tr.checkout.lastName} error={fieldError("lastName")} required>
          <input
            value={form.lastName}
            onChange={(e) => update({ lastName: e.target.value })}
            onBlur={() => blur("lastName")}
            className={inputClass("lastName")}
            placeholder={tr.checkout.lastNamePlaceholder}
          />
        </Field>
        <Field label={tr.checkout.phone} error={fieldError("phone")} required>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => update({ phone: e.target.value })}
            onBlur={() => blur("phone")}
            className={inputClass("phone")}
            placeholder="05XX XX XX XX"
            dir="ltr"
          />
        </Field>
        <Field label={tr.checkout.instagram} error={fieldError("instagram")}>
          <input
            type="text"
            value={form.instagram}
            onChange={(e) => update({ instagram: e.target.value })}
            onBlur={() => blur("instagram")}
            className={inputClass("instagram")}
            placeholder={tr.checkout.instagramPlaceholder}
            dir="ltr"
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label={tr.checkout.wilaya} error={fieldError("wilaya")} required>
            <select
              value={form.wilaya}
              onChange={(e) => update({ wilaya: e.target.value })}
              onBlur={() => blur("wilaya")}
              dir={lang === "ar" ? "rtl" : "ltr"}
              className={`${inputClass("wilaya")} checkout-select`}
            >
              <option value="">{tr.checkout.selectWilaya}</option>
              {wilayas.map((w) => (
                <option key={w.code} value={w.code} dir={lang === "ar" ? "rtl" : "ltr"}>
                  {getWilayaLabel(w, lang)}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <div className="mb-6">
        <p className="mb-3 text-sm font-semibold text-[#4d3525]">
          {tr.checkout.deliveryMethod}
          <span className="ml-1 text-[#c9a86c]">*</span>
        </p>
        {fieldError("deliveryMethod") && (
          <p className="mb-2 text-xs text-red-400">{fieldError("deliveryMethod")}</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <DeliveryOption
            active={form.deliveryMethod === "HOME"}
            icon={Home}
            title={tr.checkout.homeDelivery}
            description={tr.checkout.homeDeliveryDesc}
            price={
              selectedWilaya
                ? `${selectedWilaya.homeShippingPrice} DA`
                : undefined
            }
            onClick={() => update({ deliveryMethod: "HOME" })}
          />
          <DeliveryOption
            active={form.deliveryMethod === "OFFICE"}
            icon={Building2}
            title={tr.checkout.officePickup}
            description={tr.checkout.officePickupDesc}
            price={
              selectedWilaya
                ? `${selectedWilaya.officeShippingPrice} DA`
                : undefined
            }
            onClick={() => update({ deliveryMethod: "OFFICE" })}
          />
        </div>
      </div>

      {form.deliveryMethod && (
        <div className="mb-6">
          <Field label={tr.checkout.commune} error={fieldError("commune")} required>
            <select
              value={form.commune}
              onChange={(e) => update({ commune: e.target.value })}
              onBlur={() => blur("commune")}
              disabled={!form.wilaya || communesLoading || communes.length === 0}
              dir={lang === "ar" ? "rtl" : "ltr"}
              className={`${inputClass("commune")} checkout-select disabled:opacity-50`}
            >
              <option value="">
                {!form.wilaya
                  ? tr.checkout.selectWilayaFirst
                  : communesLoading
                    ? tr.checkout.communesLoading
                    : tr.checkout.selectCommune}
              </option>
              {communes.map((c) => (
                <option key={c} value={c} dir={lang === "ar" ? "rtl" : "ltr"}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          {communesError && (
            <p className="mt-2 text-xs text-red-400">{communesError}</p>
          )}
        </div>
      )}

      {form.deliveryMethod === "HOME" && (
        <div className="mb-6">
          <Field label={tr.checkout.fullAddress} error={fieldError("address")} required>
            <textarea
              rows={3}
              value={form.address}
              onChange={(e) => update({ address: e.target.value })}
              onBlur={() => blur("address")}
              className={`${inputClass("address")} resize-none`}
              placeholder={tr.checkout.addressPlaceholder}
            />
          </Field>
        </div>
      )}

      {form.deliveryMethod === "OFFICE" && (
        <div className="mb-6">
          <Field label={tr.checkout.pickupOffice} error={fieldError("deliveryOffice")} required>
            <select
              value={form.deliveryOffice}
              onChange={(e) => update({ deliveryOffice: e.target.value })}
              onBlur={() => blur("deliveryOffice")}
              disabled={!form.wilaya}
              className={`${inputClass("deliveryOffice")} checkout-select disabled:opacity-50`}
            >
              <option value="">
                {form.wilaya ? tr.checkout.selectOffice : tr.checkout.selectWilayaFirst}
              </option>
              {offices.map((office) => (
                <option key={office.id} value={office.id}>
                  {getOfficeLabel(office, lang)}
                </option>
              ))}
            </select>
          </Field>
          {form.wilaya && offices.length === 0 && (
            <p className="mt-2 flex items-center gap-1 text-xs text-[#806f60]">
              <MapPin size={12} />
              {tr.checkout.noOffices}
            </p>
          )}
        </div>
      )}

      <div className="mb-6">
        <Field label={tr.checkout.notes}>
          <textarea
            rows={2}
            value={form.notes}
            onChange={(e) => update({ notes: e.target.value })}
            className={`${inputClass("notes")} resize-none`}
            placeholder={tr.checkout.notesPlaceholder}
          />
        </Field>
      </div>

      <button
        type="submit"
        disabled={loading || !isValid}
        className="btn-neon flex w-full items-center justify-center gap-2 rounded-full py-4 text-sm disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? tr.checkout.processing : tr.checkout.submit}
      </button>
    </form>
  );
}

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[#4d3525]">
        {label}
        {required && <span className="ml-1 text-[#c9a86c]">*</span>}
      </label>
      {children}
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  );
}

function DeliveryOption({
  active,
  icon: Icon,
  title,
  description,
  price,
  onClick,
}: {
  active: boolean;
  icon: typeof Home;
  title: string;
  description: string;
  price?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition ${
        active
          ? "border-[#c9a86c] bg-[#c9a86c]/10 shadow-[0_0_20px_rgba(201,168,108,0.15)]"
          : "border-[#a07d3e]/20 bg-white/35 hover:border-[#c9a86c]/50"
      }`}
    >
      <Icon size={22} className={active ? "text-[#c9a86c]" : "text-[#806f60]"} />
      <p className="mt-2 font-semibold text-[#4d3525]">{title}</p>
      <p className="mt-1 text-xs text-[#806f60]">{description}</p>
      {price && <p className="mt-2 text-xs font-semibold text-[#c9a84c]">{price}</p>}
    </button>
  );
}
