import { describe, expect, it } from "vitest";
import { aggregateStripeDonorsForThankYou } from "@/lib/server/thank";

describe("Stripe donor aggregation", () => {
  it("uses shipping name and address for lifetime donor totals", () => {
    const result = aggregateStripeDonorsForThankYou([
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
        shipping: {
          name: "Shipping Donor",
          address: {
            line1: "123 Main St",
            line2: "",
            city: "Calgary",
            state: "AB",
            postal_code: "T2P 1A1",
            country: "CA"
          }
        }
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
        billing_details: { email: "new-email@example.test", name: "Billing Name" },
        shipping: {
          name: "Shipping Donor",
          address: {
            line1: "123 Main St",
            city: "Calgary",
            state: "AB",
            postal_code: "T2P 1A1",
            country: "CA"
          }
        }
      },
      {
        id: "ch_same_email_different_shipping_address",
        amount: 25000,
        amount_captured: 25000,
        currency: "cad",
        created: 1785429288,
        paid: true,
        refunded: false,
        status: "succeeded",
        customer: "cus_two",
        billing_details: { email: "donor@example.test", name: "Billing Name" },
        shipping: {
          name: "Shipping Donor",
          address: {
            line1: "999 Other Ave",
            postal_code: "T2P 1A1"
          }
        }
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

    expect(result.skippedMissingIdentity).toBe(1);
    expect(result.donors).toEqual([
      {
        donor_key: "shipping donor|123 main st||calgary|ab|t2p 1a1|ca",
        stripe_customer_id: "cus_one",
        name: "Shipping Donor",
        email: "new-email@example.test",
        currency: "cad",
        amount_cents: 27501,
        charge_count: 2,
        last_donation_at: new Date(1785426288 * 1000).toISOString()
      },
      {
        donor_key: "shipping donor|999 other ave||||t2p 1a1|",
        stripe_customer_id: "cus_two",
        name: "Shipping Donor",
        email: "donor@example.test",
        currency: "cad",
        amount_cents: 25000,
        charge_count: 1,
        last_donation_at: new Date(1785429288 * 1000).toISOString()
      }
    ]);
  });
});
