import PanierClient from "@/app/panier/PanierClient";
import { getCheckoutShippingData } from "@/lib/shipping-server";

export default async function PanierPage() {
  const shipping = await getCheckoutShippingData();
  return <PanierClient {...shipping} />;
}
