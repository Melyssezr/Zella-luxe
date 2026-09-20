"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { Minus, Plus, Trash2, Copy, Check } from "lucide-react";
import { InstagramIcon } from "@/components/InstagramIcon";
import { CheckoutForm, type CheckoutFormData } from "@/components/CheckoutForm";
import { OrderSummary } from "@/components/OrderSummary";
import { useCart } from "@/context/CartContext";
import { useLanguage } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";
import { buildInstagramOrderMessage, normalizeInstagramHandle } from "@/lib/instagram";
import type { CheckoutShippingData } from "@/lib/shipping-server";
import {
  getShippingCost,
  type DeliveryMethod,
} from "@/lib/shipping";
import { formatPrice } from "@/lib/utils";

type PanierClientProps = CheckoutShippingData;

export default function PanierClient({ wilayas, officesByWilaya }: PanierClientProps) {
  const {
    items,
    removeItem,
    updateQuantity,
    total,
    clearCart,
  } = useCart();
  const { lang } = useLanguage();
  const tr = t(lang);

  const [wilayaCode, setWilayaCode] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod | "">("");
  const [loading, setLoading] = useState(false);
  const [orderResult, setOrderResult] = useState<{
    orderNumber: string;
    message: string;
    instagramUrl: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleShippingChange = useCallback((code: string, method: DeliveryMethod | "") => {
    setWilayaCode(code);
    setDeliveryMethod(method);
  }, []);

  const shippingCost = useMemo(
    () => getShippingCost(wilayas, wilayaCode, deliveryMethod),
    [wilayas, wilayaCode, deliveryMethod]
  );

  const grandTotal = total + shippingCost;

  const handleSubmit = async (form: CheckoutFormData) => {
    if (items.length === 0) return;
    setLoading(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          instagramHandle: form.instagram.trim()
            ? normalizeInstagramHandle(form.instagram)
            : null,
          wilayaCode: form.wilaya,
          deliveryMethod: form.deliveryMethod,
          commune: form.commune,
          deliveryAddress: form.deliveryMethod === "HOME" ? form.address : null,
          deliveryOfficeId: form.deliveryMethod === "OFFICE" ? form.deliveryOffice : null,
          notes: form.notes,
          items,
          subtotal: total,
          shippingCost,
          total: grandTotal,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const customerName = `${form.firstName} ${form.lastName}`;
      const message = buildInstagramOrderMessage({
        orderNumber: data.orderNumber,
        customerName,
        phone: form.phone,
        instagramHandle: form.instagram.trim()
          ? normalizeInstagramHandle(form.instagram)
          : undefined,
        address: data.address ?? "",
        items: items.map((i) => ({
          name: lang === "fr" ? i.nameFr : i.nameAr,
          quantity: i.quantity,
          price: i.price,
          size: i.size,
          color: i.color,
        })),
        subtotal: total,
        shippingCost: data.shippingCost ?? shippingCost,
        total: data.total ?? grandTotal,
      });

      setOrderResult({
        orderNumber: data.orderNumber,
        message,
        instagramUrl: data.instagramUrl ?? "",
      });
      clearCart();
    } catch (err) {
      alert(err instanceof Error ? err.message : tr.checkout.error);
    } finally {
      setLoading(false);
    }
  };

  const copyMessage = async () => {
    if (!orderResult) return;
    await navigator.clipboard.writeText(orderResult.message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (orderResult) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center md:px-6">
        <div className="luxe-neon-frame rounded-2xl bg-[#fffaf2]/75 p-8 text-center backdrop-blur-xl">
          <Check className="mx-auto mb-4 text-green-600" size={48} />
          <h1 className="font-display text-2xl font-medium">{tr.checkout.success}</h1>
          <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm font-medium leading-relaxed text-emerald-800">
            {lang === "ar"
              ? "✅ تم تسجيل طلبك بنجاح. طلبك في انتظار التأكيد وسنتواصل معك قريبًا."
              : "✅ Votre commande a été enregistrée avec succès. Elle est en attente de confirmation. Nous vous contacterons prochainement."}
          </p>
          <p className="mt-2 text-[#806f60]">#{orderResult.orderNumber}</p>
          <pre className="mt-6 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl border border-[#a07d3e]/15 bg-white/55 p-4 text-left text-sm text-[#6f5a49]">
            {orderResult.message}
          </pre>
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={copyMessage}
              className="flex items-center justify-center gap-2 rounded-full border border-[#a07d3e]/25 py-3 text-sm text-[#4d3525]"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {tr.checkout.copyMessage}
            </button>
            {orderResult.instagramUrl ? (
              <a
                href={orderResult.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-full bg-[#b8956a] py-3 text-sm text-white"
              >
                <InstagramIcon size={16} />
                {tr.checkout.openInstagram}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
      <h1 className="font-display mb-10 text-3xl font-medium sm:text-4xl">
        <span className="italic text-[#8b6914]">{tr.cart.title}</span>
      </h1>

      {items.length === 0 ? (
        <div className="py-20 text-center">
          <p className="font-light tracking-wide text-[#806f60]">{tr.cart.empty}</p>
          <Link
            href="/catalogue"
            className="btn-neon mt-6 inline-block rounded-full px-8 py-3 text-sm"
          >
            {tr.cart.continueShopping}
          </Link>
        </div>
      ) : (
        <div className="grid gap-10 lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_420px]">
          <div className="order-2 space-y-8 lg:order-1">
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={`${item.productId}-${item.size}-${item.color ?? ""}`}
                  className="luxe-neon-frame flex gap-4 rounded-2xl bg-[#fffaf2]/72 p-4 backdrop-blur-sm"
                >
                  <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-[#f5f0e8]">
                    <Image src={item.image} alt="" fill className="object-cover" sizes="80px" />
                  </div>
                  <div className="min-w-0 flex flex-1 flex-col">
                    <Link href={`/produit/${item.slug}`} className="line-clamp-2 font-medium hover:text-[#b8956a]">
                      {lang === "fr" ? item.nameFr : item.nameAr}
                    </Link>
                    <p className="text-sm text-[#888]">
                      {tr.catalogue.size}: {item.size}
                      {item.color && ` · ${tr.catalogue.color}: ${item.color}`}
                    </p>
                    <p className="font-display text-[#b8956a]">{formatPrice(item.price, lang)}</p>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.productId, item.size, item.quantity - 1, item.color)
                          }
                          className="rounded-full border p-1"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.productId, item.size, item.quantity + 1, item.color)
                          }
                          className="rounded-full border p-1"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.productId, item.size, item.color)}
                        className="text-red-500"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <CheckoutForm
              wilayas={wilayas}
              officesByWilaya={officesByWilaya}
              loading={loading}
              onSubmit={handleSubmit}
              onShippingChange={handleShippingChange}
            />
          </div>

          <div className="order-1 lg:sticky lg:top-24 lg:order-2 lg:self-start">
            <OrderSummary
              subtotal={total}
              shippingCost={shippingCost}
              showShippingPlaceholder
            />
          </div>
        </div>
      )}
    </div>
  );
}
