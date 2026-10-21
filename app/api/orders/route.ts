
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const catalog: Record<string, { name: string; price: number }> = {
  "vel-001": { name: "Amber Veil", price: 1890 },
  "vel-002": { name: "Petal No. 5", price: 1590 },
  "vel-003": { name: "Santal Dusk", price: 2190 },
  "vel-004": { name: "Sunday Linen", price: 1290 },
  "vel-005": { name: "Golden Hour", price: 1790 },
  "vel-006": { name: "Midnight Cedar", price: 1990 },
};

async function sendMessengerNotification(
  orderNumber: string,
  customerName: string,
  items: { name: string; quantity: number }[],
  total: number
) {
  const pageToken = process.env.MESSENGER_PAGE_ACCESS_TOKEN;
  const ownerPsid = process.env.MESSENGER_OWNER_PSID;
  const graphVersion =
    process.env.MESSENGER_GRAPH_API_VERSION || "v25.0";

  if (!pageToken || !ownerPsid) {
    console.warn(
      "Messenger notification skipped: missing Page token or owner PSID."
    );
    return;
  }

  const itemSummary = items
    .map((item) => `${item.name} x${item.quantity}`)
    .join(", ");

  const message = [
    "🛍️ NEW VELOURA COD ORDER",
    "",
    `Order: ${orderNumber}`,
    `Customer: ${customerName}`,
    `Items: ${itemSummary}`,
    `Total: PHP ${total.toLocaleString("en-PH")}`,
    "Payment: Cash on Delivery",
    "Status: Pending",
  ].join("\n");

  try {
    const response = await fetch(
      `https://graph.facebook.com/${graphVersion}/me/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${pageToken}`,
        },
        body: JSON.stringify({
          recipient: { id: ownerPsid },
          messaging_type: "RESPONSE",
          message: { text: message },
        }),
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        "Messenger notification failed:",
        response.status,
        errorBody.slice(0, 500)
      );
      return;
    }

    console.log("Messenger order notification sent:", orderNumber);
  } catch (error) {
    console.error(
      "Messenger notification request failed:",
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const c = body.customer;
    const items = body.items;

    if (
      !c?.name ||
      !c?.email ||
      !c?.phone ||
      !c?.address ||
      !c?.city
    ) {
      return NextResponse.json(
        { error: "Complete all delivery details." },
        { status: 400 }
      );
    }

    if (
      !Array.isArray(items) ||
      !items.length ||
      items.length > 20
    ) {
      return NextResponse.json(
        { error: "Your bag is empty or invalid." },
        { status: 400 }
      );
    }

    const checked = items.map(
      (x: { product_id: string; quantity: number }) => {
        const product = catalog[x.product_id];
        const quantity = Number(x.quantity);

        if (
          !product ||
          !Number.isInteger(quantity) ||
          quantity < 1 ||
          quantity > 20
        ) {
          throw new Error("Invalid product or quantity.");
        }

        return {
          product_id: x.product_id,
          name: product.name,
          unit_price: product.price,
          quantity,
          line_total: product.price * quantity,
        };
      }
    );

    const total = checked.reduce(
      (sum, item) => sum + item.line_total,
      0
    );

    if (total <= 0 || total > 1000000) {
      return NextResponse.json(
        { error: "Invalid total." },
        { status: 400 }
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return NextResponse.json(
        {
          error:
            "Database not configured. Set Supabase environment variables and run supabase/schema.sql.",
        },
        { status: 503 }
      );
    }

    const db = createClient(url, key, {
      auth: { persistSession: false },
    });

    const orderNumber =
      "VL-" + Date.now().toString().slice(-8);

    const paymentMethod =
      body.payment_method === "online" ? "online" : "cod";

    const { data: order, error } = await db
      .from("orders")
      .insert({
        order_number: orderNumber,
        customer_name: String(c.name).slice(0, 120),
        email: String(c.email).slice(0, 200),
        phone: String(c.phone).slice(0, 40),
        delivery_address: String(c.address).slice(0, 500),
        city: String(c.city).slice(0, 120),
        payment_method: paymentMethod,
        payment_status: "pending",
        order_status: "pending",
        total_amount: total,
        items: checked,
      })
      .select("id,order_number")
      .single();

    if (error || !order) {
      console.error("Order save failed:", error?.message);
      return NextResponse.json(
        { error: "Could not save order. Try again later." },
        { status: 500 }
      );
    }

    // Online payment: retain the existing PayMongo checkout flow.
    if (paymentMethod === "online") {
      const secret = process.env.PAYMONGO_SECRET_KEY;

      if (!secret || secret.includes("replace_me")) {
        return NextResponse.json({
          orderNumber: order.order_number,
          message:
            "Order saved but online payment is not configured. Add your PayMongo test secret key.",
        });
      }

      const site =
        process.env.NEXT_PUBLIC_SITE_URL ||
        new URL(req.url).origin;

      const payload = {
        data: {
          attributes: {
            line_items: checked.map((item) => ({
              currency: "PHP",
              amount: item.unit_price * 100,
              name: item.name,
              quantity: item.quantity,
              description: "Veloura fragrance",
            })),
            payment_method_types: ["gcash", "qrph", "card"],
            description: `Veloura order ${order.order_number}`,
            success_url: `${site}/?payment=success&order=${order.order_number}`,
            cancel_url: `${site}/?payment=cancelled&order=${order.order_number}`,
          },
        },
      };

      const response = await fetch(
        "https://api.paymongo.com/v2/checkout_sessions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization:
              "Basic " +
              Buffer.from(`${secret}:`).toString("base64"),
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();
      const checkoutUrl = data?.data?.attributes?.checkout_url;

      if (!response.ok || !checkoutUrl) {
        console.error("PayMongo checkout failed:", response.status);
        return NextResponse.json(
          {
            error:
              "Order saved but checkout could not start. Choose COD or contact the shop.",
          },
          { status: 502 }
        );
      }

      await db
        .from("orders")
        .update({ payment_reference: data.data.id })
        .eq("id", order.id);

      return NextResponse.json({
        orderNumber: order.order_number,
        checkoutUrl,
      });
    }

    // COD: notify the shop owner through the Facebook Page.
    await sendMessengerNotification(
      order.order_number,
      String(c.name).slice(0, 120),
      checked.map((item) => ({
        name: item.name,
        quantity: item.quantity,
      })),
      total
    );

    return NextResponse.json({
      orderNumber: order.order_number,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error.",
      },
      { status: 400 }
    );
  }
}
