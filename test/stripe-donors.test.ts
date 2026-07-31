import { describe, expect, it } from "vitest";
import { aggregateStripeDonorsForThankYou } from "@/lib/server/thank";

describe("Stripe donor aggregation", () => {
  it("uses shipping name, email, and currency for lifetime donor totals", () => {
    const donors = aggregateStripeDonorsForThankYou([
      {
        id: "ch_one",
        amount: 10000,
        amount_captured: 10000,
        currency: "cad",
        created: 1785425288,
        paid: true,
        refunded: false,
        status: "succeeded",
        customer: "cus_one",
        billing_details: { email: "Donor@Example.test", name: "Billing Name" },
        shipping: { name: "Shipping Donor" }
      },
      {
        id: "ch_two",
        amount: 17501,
        amount_captured: 17501,
        currency: "cad",
        created: 1785426288,
        paid: true,
        refunded: false,
        status: "succeeded",
        customer: "cus_one",
        billing_details: { email: "donor@example.test", name: "Billing Name" },
        shipping: { name: "Shipping Donor" }
      },
      {
        id: "ch_same_email_different_shipping_name",
        amount: 30000,
        amount_captured: 30000,
        currency: "cad",
        created: 1785429288,
        paid: true,
        refunded: false,
        status: "succeeded",
        customer: "cus_two",
        billing_details: { email: "donor@example.test", name: "Billing Name" },
        shipping: { name: "Different Shipping Donor" }
      },
      {
        id: "ch_refunded",
        amount: 50000,
        currency: "cad",
        created: 1785427288,
        paid: true,
        refunded: true,
        status: "succeeded",
        billing_details: { email: "donor@example.test", name: "Donor One" }
      },
      {
        id: "ch_no_shipping_name",
        amount: 50000,
        currency: "cad",
        created: 1785428288,
        paid: true,
        refunded: false,
        status: "succeeded",
        billing_details: { email: "billing-only@example.test", name: "Billing Only" }
      }
    ]);

    expect(donors).toEqual([
      {
        stripe_customer_id: "cus_one",
        name: "Shipping Donor",
        email: "donor@example.test",
        currency: "cad",
        amount_cents: 27501,
        charge_count: 2,
        last_donation_at: new Date(1785426288 * 1000).toISOString()
      },
      {
        stripe_customer_id: "cus_two",
        name: "Different Shipping Donor",
        email: "donor@example.test",
        currency: "cad",
        amount_cents: 30000,
        charge_count: 1,
        last_donation_at: new Date(1785429288 * 1000).toISOString()
      }
    ]);
  });
});
