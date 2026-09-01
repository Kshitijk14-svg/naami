import { SaveControl } from "./shared";
import { ContentField, ContentGroup } from "./contentFields";

interface Props {
  settings: Record<string, string>;
  update: (key: string, value: string) => void;
  checkoutError: string | null;
  checkoutSaving: boolean;
  checkoutSaved: boolean;
  onSave: () => void;
}

export function CheckoutFlowSection({ settings, update, checkoutError, checkoutSaving, checkoutSaved, onSave }: Props) {
  const f = (fieldKey: string, label: string, multiline?: boolean) => (
    <ContentField settings={settings} update={update} fieldKey={fieldKey} label={label} multiline={multiline} />
  );

  return (
    <section>
      <h2 className="font-serif font-light uppercase mb-6" style={{ fontSize: "1.2rem", color: "#111" }}>Checkout Flow</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
        <ContentGroup title="Cart — Empty">
          {f("cart_empty_kicker", "Kicker")}
          {f("cart_empty_title", "Title")}
          {f("cart_empty_tagline", "Tagline")}
          {f("cart_empty_body", "Body")}
          {f("cart_empty_cta_label", "Button Label")}
        </ContentGroup>

        <ContentGroup title="Cart">
          {f("cart_kicker", "Kicker")}
          {f("cart_title", "Title")}
          {f("cart_tagline", "Tagline")}
          {f("cart_order_summary_label", "Order Summary Label")}
        </ContentGroup>

        <ContentGroup title="Checkout">
          {f("checkout_kicker", "Kicker")}
          {f("checkout_title", "Title")}
          {f("checkout_shipping_label", "Shipping Details Label")}
          {f("checkout_order_summary_label", "Order Summary Label")}
          {f("checkout_secure_note", "Secure Payment Note")}
        </ContentGroup>

        <ContentGroup title="Profile">
          {f("profile_kicker", "Kicker")}
          {f("profile_tab_profile", "Tab: Profile")}
          {f("profile_tab_orders", "Tab: Order History")}
          {f("profile_tab_wishlist", "Tab: Wishlist")}
          {f("profile_empty_orders", "Empty Orders Message")}
          {f("profile_empty_wishlist", "Empty Wishlist Message")}
        </ContentGroup>

        <ContentGroup title="Order Confirmation">
          {f("order_confirmed_kicker", "Kicker")}
          {f("order_confirmed_thankyou", "Thank-You Heading (name appended automatically)")}
          {f("order_confirmed_tagline", "Tagline")}
          {f("order_confirmed_body", "Body (email appended automatically)")}
          {f("order_ref_label", "\"Order Reference\" Label")}
          {f("order_journey_label", "\"Order Journey\" Label")}
          {f("order_tracking_label", "\"Shipment Tracking\" Label")}
          {f("order_items_label", "\"Items Ordered\" Label")}
          {f("order_shipping_to_label", "\"Shipping To\" Label")}
          {f("order_status_pending", "Status: pending")}
          {f("order_status_confirmed", "Status: confirmed")}
          {f("order_status_shipped", "Status: shipped")}
          {f("order_status_delivered", "Status: delivered")}
          {f("order_status_cancelled", "Status: cancelled")}
        </ContentGroup>

        <SaveControl saving={checkoutSaving} saved={checkoutSaved} error={checkoutError} onSave={onSave} label="Save Checkout Flow" />
      </div>
    </section>
  );
}
