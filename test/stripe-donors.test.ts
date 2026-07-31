import { describe, expect, it } from "vitest";
import { aggregateStripeDonorsForThankYou } from "@/lib/server/thank";

describe("Stripe donor aggregation", () => {
  it("uses charge billing details and captured amounts for lifetime donor totals", () => {
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
        billing_details: { email: "Donor@Example.test", name: "Donor One" }
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
        billing_details: { email: "donor@example.test", name: "Donor One" }
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
      }
    ]);

    expect(donors).toEqual([
      {
        stripe_customer_id: "cus_one",
        name: "Donor One",
        email: "donor@example.test",
        currency: "cad",
        amount_cents: 27501,
        charge_count: 2,
        last_donation_at: new Date(1785426288 * 1000).toISOString()
      }
    ]);
  });
});
