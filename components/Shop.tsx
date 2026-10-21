"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";

type Product = {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  notes: string;
  shade: string;
  tag?: string;
};

type Line = {
  product: Product;
  qty: number;
};

const products: Product[] = [
  {
    id: "vel-001",
    name: "Amber Veil",
    brand: "VELOURA SIGNATURE",
    category: "Unisex",
    price: 1890,
    notes: "Amber · Vanilla · Sandalwood",
    shade: "amber",
    tag: "BESTSELLER",
  },
  {
    id: "vel-002",
    name: "Petal No. 5",
    brand: "VELOURA FLORA",
    category: "Women",
    price: 1590,
    notes: "Rose · Peony · White Musk",
    shade: "rose",
    tag: "NEW",
  },
  {
    id: "vel-003",
    name: "Santal Dusk",
    brand: "VELOURA ATELIER",
    category: "Men",
    price: 2190,
    notes: "Sandalwood · Cedar · Vetiver",
    shade: "santal",
  },
  {
    id: "vel-004",
    name: "Sunday Linen",
    brand: "VELOURA EVERYDAY",
    category: "Unisex",
    price: 1290,
    notes: "Bergamot · Cotton · Musk",
    shade: "linen",
  },
  {
    id: "vel-005",
    name: "Golden Hour",
    brand: "VELOURA SIGNATURE",
    category: "Women",
    price: 1790,
    notes: "Neroli · Jasmine · Warm Woods",
    shade: "gold",
  },
  {
    id: "vel-006",
    name: "Midnight Cedar",
    brand: "VELOURA ATELIER",
    category: "Men",
    price: 1990,
    notes: "Black Pepper · Cedar · Tonka",
    shade: "night",
  },
];

const categories = ["All", "Women", "Men", "Unisex"] as const;

type Category = (typeof categories)[number];

const money = (amount: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(amount);

export default function Shop() {
  const [category, setCategory] = useState<Category>("All");
  const [cart, setCart] = useState<Line[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [checkout, setCheckout] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    payment: "cod",
  });

  // Filter products by the selected category.
  const visible = useMemo(() => {
    if (category === "All") return products;

    return products.filter(
      (product) => product.category === category
    );
  }, [category]);

  const count = cart.reduce((sum, line) => sum + line.qty, 0);

  const total = cart.reduce(
    (sum, line) => sum + line.product.price * line.qty,
    0
  );

  function selectCategory(nextCategory: Category) {
    setCategory(nextCategory);

    // Move the collection into view when a category is selected.
    document.getElementById("collection")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function add(product: Product) {
    setCart((current) => {
      const existing = current.find(
        (line) => line.product.id === product.id
      );

      if (existing) {
        return current.map((line) =>
          line.product.id === product.id
            ? { ...line, qty: line.qty + 1 }
            : line
        );
      }

      return [...current, { product, qty: 1 }];
    });

    setNotice(`${product.name} added to your bag.`);
    setCartOpen(true);
  }

  function changeQty(id: string, difference: number) {
    setCart((current) =>
      current
        .map((line) =>
          line.product.id === id
            ? { ...line, qty: line.qty + difference }
            : line
        )
        .filter((line) => line.qty > 0)
    );
  }

  async function placeOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (cart.length === 0) {
      setNotice("Your bag is empty. Please select a fragrance first.");
      setCheckout(false);
      return;
    }

    setBusy(true);
    setNotice("");

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer: form,
          items: cart.map((line) => ({
            product_id: line.product.id,
            quantity: line.qty,
          })),
          payment_method: form.payment,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to place your order.");
      }

      if (form.payment === "online") {
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
          return;
        }

        throw new Error(
          data.message ||
            "Online payments are not configured yet. Please choose COD."
        );
      }

      setCart([]);
      setCheckout(false);
      setCartOpen(false);

      setNotice(
        `Thank you, ${form.name}! Order ${
          data.orderNumber || ""
        } received. We will contact you to confirm.`
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <div className="announcement">
        ✦ COMPLIMENTARY DELIVERY ON ORDERS OVER ₱2,500 ✦
      </div>

      <header className="nav wrap">
        <a className="logo" href="#">
          VELOURA
          <span>FRAGRANCE HOUSE</span>
        </a>

        <nav>
          <a href="#collection">The Collection</a>
          <a href="#story">Our Philosophy</a>
        </nav>

        <button
          type="button"
          className="bag"
          onClick={() => setCartOpen(true)}
          aria-label={`Open shopping bag with ${count} items`}
        >
          Bag <b>{count}</b>
        </button>
      </header>

      <section className="hero wrap">
        <div className="hero-copy">
          <p className="eyebrow">SCENT IS A PERSONAL SIGNATURE</p>

          <h1>
            Find the scent
            <br />
            <em>that feels like you.</em>
          </h1>

          <p className="intro">
            Considered fragrances for the everyday extraordinary.
            Thoughtfully chosen, unforgettable by nature.
          </p>

          <a className="button" href="#collection">
            Explore the collection <span>↗</span>
          </a>

          <div className="hero-foot">
            01 / SIGNATURE SCENTS
            <span>MADE TO BE REMEMBERED</span>
          </div>
        </div>

        <div className="hero-art" aria-label="Veloura signature perfume">
          <div className="sun" />
          <div className="stone s1" />
          <div className="stone s2" />

          <div className="hero-bottle">
            <div className="cap" />
            <div className="neck" />
            <div className="bottle">
              <b>VELOURA</b>
              <small>EAU DE PARFUM</small>
            </div>
          </div>

          <span className="art-caption">EAU DE PARFUM · 50 ML</span>
        </div>
      </section>

      <section className="values wrap" id="story">
        <div>
          <i>01</i> Quietly distinctive
        </div>
        <div>
          <i>02</i> Made for your moments
        </div>
        <div>
          <i>03</i> Luxury, made personal
        </div>
      </section>

      <section className="collection wrap" id="collection">
        <div className="section-head">
          <div>
            <p className="eyebrow">THE VELOURA EDIT</p>
            <h2>
              Everyday, <em>elevated.</em>
            </h2>
          </div>

          <p>
            Six considered scents.
            <br />
            One unmistakable you.
          </p>
        </div>

        <div className="filters" aria-label="Filter fragrances by category">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              className={category === item ? "active" : ""}
              aria-pressed={category === item}
              onClick={() => selectCategory(item)}
            >
              {item}
              {item !== "All" && (
                <span className="filter-count">
                  {products.filter((product) => product.category === item).length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="collection-status" aria-live="polite">
          Showing {visible.length}{" "}
          {visible.length === 1 ? "fragrance" : "fragrances"}
          {category !== "All" ? ` for ${category}` : ""}
        </div>

        {visible.length > 0 ? (
          <div className="grid">
            {visible.map((product, index) => (
              <article className="product" key={product.id}>
                <div
                  className={`product-art ${product.shade} product-art-clickable`}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedProduct(product)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedProduct(product);
                    }
                  }}
                  aria-label={`View details for ${product.name}`}
                  title={`View details for ${product.name}`}
                >
                  {product.tag && (
                    <span className="tag">{product.tag}</span>
                  )}

                  <div className="glow" />

                  <div className="product-bottle">
                    <div className="pcap" />
                    <div className="pneck" />

                    <div className="pbottle">
                      <b>VELOURA</b>
                      <small>{product.name.toUpperCase()}</small>
                      <i>EAU DE PARFUM</i>
                    </div>
                  </div>

                  <span className="index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <div className="product-info">
                  <div>
                    <small>{product.brand}</small>
                    <h3>{product.name}</h3>
                    <p>{product.notes}</p>
                    <span className="product-category">
                      {product.category}
                    </span>
                  </div>

                  <strong>{money(product.price)}</strong>
                </div>

                <div className="product-actions product-actions-single">
                  <button
                    type="button"
                    className="add"
                    onClick={() => add(product)}
                    aria-label={`Add ${product.name} to your bag`}
                  >
                    Add to bag <span aria-hidden="true">＋</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-results">
            No fragrances found in this category.
          </p>
        )}
      </section>

      <section className="quote">
        <p className="eyebrow">A NOTE TO YOURSELF</p>

        <blockquote>
          “A fragrance is not just what you wear.
          <br />
          <em>It is what you leave behind.</em>”
        </blockquote>

        <small>THE VELOURA PHILOSOPHY</small>
      </section>

      <footer className="footer wrap">
        <a className="logo" href="#">
          VELOURA
          <span>FRAGRANCE HOUSE</span>
        </a>

        <i>Wear your own story.</i>
        <small>© 2026 VELOURA · FRAGRANCE HOUSE</small>
      </footer>

      {notice && (
        <div className="toast" role="status">
          {notice}
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            ×
          </button>
        </div>
      )}

      {selectedProduct && (
        <div
          className="overlay product-modal-overlay"
          onClick={() => setSelectedProduct(null)}
        >
          <section
            className={`product-modal ${selectedProduct.shade}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="close product-modal-close"
              onClick={() => setSelectedProduct(null)}
              aria-label="Close product details"
            >
              ×
            </button>

            <div className={`product-modal-art product-art ${selectedProduct.shade}`} aria-hidden="true">
              {selectedProduct.tag && <span className="tag">{selectedProduct.tag}</span>}
              <div className="glow" />
              <div className="product-bottle">
                <div className="pcap" />
                <div className="pneck" />
                <div className="pbottle">
                  <b>VELOURA</b>
                  <small>{selectedProduct.name.toUpperCase()}</small>
                  <i>EAU DE PARFUM</i>
                </div>
              </div>
              <span className="index">50 ML · EAU DE PARFUM</span>
            </div>

            <div className="product-modal-copy">
              <p className="eyebrow">{selectedProduct.tag || "THE VELOURA EDIT"}</p>
              <small className="modal-brand">{selectedProduct.brand}</small>
              <h2 id="product-modal-title">{selectedProduct.name}</h2>
              <p className="modal-price">{money(selectedProduct.price)}</p>
              <p className="modal-description">
                A thoughtfully composed fragrance with a distinctive character,
                designed to become part of your personal signature.
              </p>

              <div className="scent-profile">
                <span className="profile-heading">SCENT PROFILE</span>
                <p>{selectedProduct.notes}</p>
                <div className="scent-tags">
                  {selectedProduct.notes.split(" · ").map((note) => (
                    <span key={note}>{note}</span>
                  ))}
                </div>
              </div>

              <div className="modal-meta">
                <span>Category</span>
                <strong>{selectedProduct.category}</strong>
              </div>
              <div className="modal-meta">
                <span>Collection</span>
                <strong>{selectedProduct.brand}</strong>
              </div>

              <button
                type="button"
                className="button modal-add-button"
                onClick={() => {
                  add(selectedProduct);
                  setSelectedProduct(null);
                }}
              >
                Add to bag · {money(selectedProduct.price)} <span>＋</span>
              </button>
              <p className="modal-help">Easy checkout · Cash on Delivery available</p>
            </div>
          </section>
        </div>
      )}

      {cartOpen && (
        <div className="overlay" onClick={() => setCartOpen(false)}>
          <aside
            className="drawer"
            onClick={(event) => event.stopPropagation()}
            aria-label="Shopping bag"
          >
            <div className="drawer-head">
              <div>
                <p className="eyebrow">YOUR SELECTION</p>
                <h2>
                  Your bag <small>({count})</small>
                </h2>
              </div>

              <button
                type="button"
                className="close"
                onClick={() => setCartOpen(false)}
                aria-label="Close shopping bag"
              >
                ×
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="empty">
                Your bag is waiting for something beautiful.
                <button
                  type="button"
                  className="button"
                  onClick={() => setCartOpen(false)}
                >
                  Continue shopping
                </button>
              </div>
            ) : (
              <>
                <div className="lines">
                  {cart.map((line) => (
                    <div className="line" key={line.product.id}>
                      <div className={`mini ${line.product.shade}`}>
                        <span>V</span>
                      </div>

                      <div className="line-detail">
                        <b>{line.product.name}</b>
                        <span>{money(line.product.price)}</span>

                        <div className="qty">
                          <button
                            type="button"
                            aria-label={`Remove one ${line.product.name}`}
                            onClick={() =>
                              changeQty(line.product.id, -1)
                            }
                          >
                            −
                          </button>

                          {line.qty}

                          <button
                            type="button"
                            aria-label={`Add one ${line.product.name}`}
                            onClick={() =>
                              changeQty(line.product.id, 1)
                            }
                          >
                            ＋
                          </button>
                        </div>
                      </div>

                      <strong>
                        {money(line.product.price * line.qty)}
                      </strong>
                    </div>
                  ))}
                </div>

                <div className="subtotal">
                  <span>Subtotal</span>
                  <b>{money(total)}</b>
                </div>

                <p className="shipping">
                  Shipping calculated at checkout. Free delivery over ₱2,500.
                </p>

                <button
                  type="button"
                  className="button full"
                  onClick={() => {
                    setCartOpen(false);
                    setCheckout(true);
                  }}
                >
                  Continue to checkout <span>→</span>
                </button>
              </>
            )}
          </aside>
        </div>
      )}

      {checkout && (
        <div
          className="overlay"
          onClick={() => !busy && setCheckout(false)}
        >
          <section
            className="checkout"
            onClick={(event) => event.stopPropagation()}
            aria-label="Checkout form"
          >
            <div className="drawer-head">
              <div>
                <p className="eyebrow">ALMOST YOURS</p>
                <h2>Checkout</h2>
              </div>

              <button
                type="button"
                className="close"
                onClick={() => !busy && setCheckout(false)}
                aria-label="Close checkout"
              >
                ×
              </button>
            </div>

            <div className="summary">
              {cart.map((line) => (
                <div key={line.product.id}>
                  <span>
                    {line.product.name} × {line.qty}
                  </span>
                  <b>{money(line.product.price * line.qty)}</b>
                </div>
              ))}

              <div className="total">
                <span>Total</span>
                <b>{money(total)}</b>
              </div>
            </div>

            <form onSubmit={placeOrder}>
              <label>
                Full name
                <input
                  required
                  autoComplete="name"
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="Your full name"
                />
              </label>

              <div className="two">
                <label>
                  Email address
                  <input
                    required
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm({ ...form, email: event.target.value })
                    }
                    placeholder="you@email.com"
                  />
                </label>

                <label>
                  Mobile number
                  <input
                    required
                    type="tel"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={(event) =>
                      setForm({ ...form, phone: event.target.value })
                    }
                    placeholder="09XX XXX XXXX"
                  />
                </label>
              </div>

              <label>
                Delivery address
                <textarea
                  required
                  autoComplete="street-address"
                  rows={2}
                  value={form.address}
                  onChange={(event) =>
                    setForm({ ...form, address: event.target.value })
                  }
                  placeholder="House number, street, barangay"
                />
              </label>

              <label>
                City / Province
                <input
                  required
                  autoComplete="address-level2"
                  value={form.city}
                  onChange={(event) =>
                    setForm({ ...form, city: event.target.value })
                  }
                  placeholder="City, province"
                />
              </label>

              <fieldset>
                <legend>Payment method</legend>

                <label className="choice">
                  <input
                    type="radio"
                    name="payment"
                    value="cod"
                    checked={form.payment === "cod"}
                    onChange={() =>
                      setForm({ ...form, payment: "cod" })
                    }
                  />
                  Cash on Delivery
                  <small>Pay when it arrives</small>
                </label>

                <label className="choice">
                  <input
                    type="radio"
                    name="payment"
                    value="online"
                    checked={form.payment === "online"}
                    onChange={() =>
                      setForm({ ...form, payment: "online" })
                    }
                  />
                  Online payment
                  <small>GCash / cards / QR Ph when enabled</small>
                </label>
              </fieldset>

              <button
                type="submit"
                className="button full"
                disabled={busy || cart.length === 0}
              >
                {busy ? "Processing…" : `Place order · ${money(total)}`}
              </button>

              <p className="secure">
                Online payments require PayMongo setup and verification.
              </p>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
