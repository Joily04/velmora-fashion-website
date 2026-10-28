import { useEffect, useMemo, useState } from "react";
import "./App.css";

const currency = (value) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(
    Number(value) || 0
  );

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("default");
  const [selectedSizes, setSelectedSizes] = useState({});
  const [cart, setCart] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("velmora-cart") || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [activeProductId, setActiveProductId] = useState(null);
  const [occasion, setOccasion] = useState("winter wedding");
  const [budget, setBudget] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");

  useEffect(() => {
    fetch("/products.json")
      .then((response) => {
        if (!response.ok) throw new Error("Could not load products.json");
        return response.json();
      })
      .then((data) => {
        if (!Array.isArray(data)) throw new Error("products.json must be an array");
        setProducts(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    localStorage.setItem("velmora-cart", JSON.stringify(cart));
  }, [cart]);

  const categories = useMemo(
    () => [...new Set(products.map((product) => product.category).filter(Boolean))],
    [products]
  );

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matching = products.filter((product) => {
      const matchesCategory = category === "all" || product.category === category;
      const searchableText = [
        product.name,
        product.category,
        product.description,
        product.fabric,
        product.fit,
        ...(product.occasions || []),
        ...(product.colours || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesCategory && searchableText.includes(query);
    });

    if (sort === "price-low") matching.sort((a, b) => a.price_gbp - b.price_gbp);
    if (sort === "price-high") matching.sort((a, b) => b.price_gbp - a.price_gbp);
    if (sort === "name") matching.sort((a, b) => a.name.localeCompare(b.name));
    return matching;
  }, [products, search, category, sort]);

  const activeProduct = products.find((p) => p.id === activeProductId);

  const recommendations = useMemo(() => {
    const maximum = budget.trim() === "" ? Infinity : Number(budget);
    if (!Number.isFinite(maximum) || maximum < 0) return [];
    return products
      .filter((p) => (p.occasions || []).some((o) => o.toLowerCase() === occasion))
      .filter((p) => Number(p.price_gbp) <= maximum)
      .sort((a, b) => Number(a.price_gbp) - Number(b.price_gbp))
      .slice(0, 3);
  }, [products, occasion, budget]);

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cart.reduce(
    (total, item) => total + Number(item.price_gbp) * item.quantity,
    0
  );

  function addToCart(product) {
    const size = selectedSizes[product.id];
    if (!size) {
      alert("Please select a size first.");
      return;
    }

    const cartKey = `${product.id}::${size}`;
    setCart((previous) => {
      const existing = previous.find((item) => item.cartKey === cartKey);
      if (existing) {
        return previous.map((item) =>
          item.cartKey === cartKey ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...previous, { ...product, selectedSize: size, cartKey, quantity: 1 }];
    });
  }

  function updateQuantity(cartKey, change) {
    setCart((previous) =>
      previous
        .map((item) =>
          item.cartKey === cartKey
            ? { ...item, quantity: Math.max(0, item.quantity + change) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function removeFromCart(cartKey) {
    setCart((previous) => previous.filter((item) => item.cartKey !== cartKey));
  }

  function imageFallback(event, productId) {
    const image = event.currentTarget;
    const current = image.getAttribute("src") || "";
    if (current.endsWith(".jpg") || current.endsWith(".jpeg")) {
      image.src = `/images/${productId}.png`;
    } else if (current.endsWith(".png")) {
      image.src = "/images/image-unavailable.svg";
    } else {
      image.onerror = null;
      image.style.visibility = "hidden";
    }
  }

  // A shareable product URL without needing a routing package.
  function showProduct(productId) {
    setActiveProductId(productId);
    window.history.pushState({}, "", `#product-${productId}`);
  }

  function closeProduct() {
    setActiveProductId(null);
    window.history.pushState({}, "", "#collections");
  }

  useEffect(() => {
    const readHash = () => {
      const matched = window.location.hash.match(/^#product-(VLM-\d+)$/);
      setActiveProductId(matched ? matched[1] : null);
    };
    readHash();
    window.addEventListener("popstate", readHash);
    window.addEventListener("hashchange", readHash);
    return () => {
      window.removeEventListener("popstate", readHash);
      window.removeEventListener("hashchange", readHash);
    };
  }, []);

  return (
    <div className="site-wrapper">
      <header className="navbar">
        <a href="#home" className="brand">VELMORA</a>
        <nav aria-label="Main navigation">
          <a href="#home">Home</a>
          <a href="#collections">Collections</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
          <a href="#cart" className="cart-link" aria-label={`Shopping cart with ${cartCount} items`}>Bag ({cartCount})</a>
        </nav>
      </header>

      <main>
        <section id="home" className="hero">
          <p className="eyebrow">LONDON EVENINGWEAR · 2026</p>
          <h1>Discover Your Style</h1>
          <p>Dresses and occasionwear, made with care.</p>
          <a href="#collections" className="shop-btn">Explore the Collection</a>
        </section>

        <section id="collections" className="collections">
          <p className="eyebrow">FIND YOUR OCCASION</p>
          <h2>Our Latest Collection</h2>

          <div className="shop-controls">
            <input
              type="search"
              placeholder="Search dresses, colours, styles..."
              aria-label="Search products"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              aria-label="Filter by category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </option>
              ))}
            </select>
            <select
              aria-label="Sort products"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="default">Featured</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="name">Name: A to Z</option>
            </select>
          </div>

          {loading && <p>Loading the collection...</p>}
          {error && <p role="alert">{error}</p>}
          {!loading && !error && (
            <>
              <p className="result-count">Showing {visibleProducts.length} products</p>
              <div className="product-grid">
                {visibleProducts.map((product) => (
                  <article className="product-card" key={product.id}>
                    <img
                      src={product.image || `/images/${product.id}.jpg`}
                      alt={product.name}
                      loading="lazy"
                      onError={(event) => imageFallback(event, product.id)}
                    />
                    <div className="product-details">
                      <p className="product-category">{product.category}</p>
                      <h3><a className="product-name-link" href={`#product-${product.id}`} onClick={(event) => { event.preventDefault(); showProduct(product.id); }}>{product.name}</a></h3>
                      <p className="product-price">{currency(product.price_gbp)}</p>
                      <p className="product-description">{product.description}</p>
                      <p className="product-meta">{product.fabric} · {product.fit || "One size"}</p>
                      <p className="product-delivery">{product.made_to_order ? `Made to order · ${product.lead_time_days} days to make` : product.in_stock ? "In stock · ready to dispatch" : "Availability to confirm"}</p>
                      <p className="size-help">Available sizes: {(product.sizes || []).join(", ")}</p>
                      <label htmlFor={`size-${product.id}`}>Choose size</label>
                      <select
                        id={`size-${product.id}`}
                        value={selectedSizes[product.id] || ""}
                        onChange={(event) =>
                          setSelectedSizes((previous) => ({
                            ...previous,
                            [product.id]: event.target.value,
                          }))
                        }
                      >
                        <option value="">Select size</option>
                        {(product.sizes || []).map((size) => (
                          <option key={size} value={size}>{size}</option>
                        ))}
                      </select>
                      <button type="button" className="product-view-btn" onClick={() => showProduct(product.id)}>
                        View Details
                      </button>
                      <button type="button" onClick={() => addToCart(product)}>
                        Add to Cart
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              {visibleProducts.length === 0 && <p>No matching products found.</p>}
            </>
          )}
        </section>

        <section id="stylist" className="stylist-section" aria-labelledby="stylist-heading">
          <p className="eyebrow">FIND YOUR OCCASION</p>
          <h2 id="stylist-heading">Occasion & Fit Finder</h2>
          <p>Choose an occasion and budget. This catalogue-based assistant matches only actual VELMORA pieces; it does not use generative AI.</p>
          <div className="stylist-controls">
            <label>Occasion
              <select value={occasion} onChange={(e) => setOccasion(e.target.value)}>
                {[...new Set(products.flatMap((p) => p.occasions || []))].sort().map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>
            <label>Maximum budget (£, optional)
              <input type="number" min="0" value={budget} placeholder="Any budget" onChange={(e) => setBudget(e.target.value)} />
            </label>
            <label>When do you need it? (optional)
              <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
            </label>
          </div>
          <p className="stylist-disclaimer" role="status">{deliveryDate
            ? "A requested date does not guarantee arrival. We cannot confirm an arrival date without order and studio confirmation."
            : "Making time and shipping time are different. Delivery dates must be confirmed with the studio."}</p>
          {recommendations.length ? (
            <div className="stylist-results">
              {recommendations.map((p) => (
                <article key={p.id}>
                  <h3>{p.name} · {currency(p.price_gbp)}</h3>
                  <p>{p.fabric}; {p.fit || "fit information unavailable"}. {p.made_to_order ? `${p.lead_time_days} days to make before shipping.` : p.in_stock ? "Listed as in stock; shipping time varies." : "Availability unknown."}</p>
                  <button type="button" onClick={() => showProduct(p.id)}>View this piece</button>
                </article>
              ))}
            </div>
          ) : <p>No catalogue matches for these choices. Try a different occasion or budget.</p>}
        </section>

        <section id="cart" className="cart-section">
          <h2>Your Bag ({cartCount})</h2>
          {cart.length === 0 ? (
            <p>Your cart is empty.</p>
          ) : (
            <>
              <div className="cart-items">
                {cart.map((item) => (
                  <div className="cart-item" key={item.cartKey}>
                    <div>
                      <h3>{item.name}</h3>
                      <p>Size: {item.selectedSize}</p>
                      <p>Unit price: {currency(item.price_gbp)}</p>
                      <p>{item.made_to_order ? `Made to order · ${item.lead_time_days} days` : "Stock item"}</p>
                    </div>
                    <div className="quantity-controls">
                      <button type="button" onClick={() => updateQuantity(item.cartKey, -1)} aria-label={`Decrease ${item.name} quantity`}>−</button>
                      <span>{item.quantity}</span>
                      <button type="button" onClick={() => updateQuantity(item.cartKey, 1)} aria-label={`Increase ${item.name} quantity`}>+</button>
                    </div>
                    <strong>{currency(Number(item.price_gbp) * item.quantity)}</strong>
                    <button type="button" className="remove-btn" onClick={() => removeFromCart(item.cartKey)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <div className="cart-summary">
                <h3>Total: {currency(cartTotal)}</h3>
                <button type="button" onClick={() => setCheckoutOpen(true)}>
                  Review Order
                </button>
              </div>
            </>
          )}
        </section>

        <section id="about" className="info-section founder-section">
          <h2>Meet the Founder</h2>
          <img src="/images/my photo.png" alt="VELMORA founder" className="founder-image" />
          <h3>Paul Joily Pathikonda</h3>
          <p>
            VELMORA is a London eveningwear label for weddings, dinners and occasions.
            Explore the cut, fabric and making time before choosing your piece.
          </p>
        </section>

        <section id="contact" className="info-section">
          <h2>Contact Us</h2>
          <p>Questions about fit, fabric or delivery dates? Contact our London studio before ordering.</p>
          <p className="policy-note">Most pieces are made to order in 14–21 days. After making, UK delivery usually takes 3–5 days; EU delivery 5–8 days. Returns accepted within 14 days for eligible unworn items with tags. Non-standard made-to-order sizes cannot be returned.</p>
        </section>
      </main>

      <footer>
        <p>© 2026 VELMORA. All rights reserved.</p>
      </footer>

      {activeProduct && (
        <div className="detail-overlay" role="presentation" onClick={closeProduct}>
          <div className="detail-panel" role="dialog" aria-modal="true" aria-label={`${activeProduct.name} product details`} onClick={(e) => e.stopPropagation()}>
            <button className="detail-close" type="button" onClick={closeProduct} aria-label="Close product details">×</button>
            <div className="detail-layout">
              <img src={activeProduct.image || `/images/${activeProduct.id}.jpg`} alt={activeProduct.name} onError={(e) => imageFallback(e, activeProduct.id)} />
              <div>
                <p className="eyebrow">{activeProduct.category} · {activeProduct.id}</p>
                <h2>{activeProduct.name}</h2>
                <strong className="detail-price">{currency(activeProduct.price_gbp)}</strong>
                <p>{activeProduct.description}</p>
                <p><strong>Fabric:</strong> {activeProduct.fabric || "Not specified"}</p>
                <p><strong>Fit:</strong> {activeProduct.fit || "Not specified"}</p>
                <p><strong>Colours:</strong> {(activeProduct.colours || []).join(", ")}</p>
                <p><strong>Occasions:</strong> {(activeProduct.occasions || []).join(", ")}</p>
                <p><strong>Lead time:</strong> {activeProduct.made_to_order ? `${activeProduct.lead_time_days} days to make, plus delivery.` : activeProduct.in_stock ? "In stock; delivery must be confirmed." : "Availability not confirmed."}</p>
                <p className="delivery-warning">An exact arrival date cannot be guaranteed from catalogue data alone.</p>
                <label htmlFor="detail-size">Choose size</label>
                <select id="detail-size" value={selectedSizes[activeProduct.id] || ""} onChange={(e) => setSelectedSizes((prev) => ({ ...prev, [activeProduct.id]: e.target.value }))}>
                  <option value="">Select size</option>
                  {(activeProduct.sizes || []).map((s) => <option value={s} key={s}>{s}</option>)}
                </select>
                <button type="button" className="detail-add" onClick={() => addToCart(activeProduct)}>Add to Bag</button>
                <button type="button" className="detail-back" onClick={closeProduct}>Back to Collection</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {checkoutOpen && (
        <div className="checkout-overlay" role="presentation" onClick={() => setCheckoutOpen(false)}>
          <div className="checkout-panel" role="dialog" aria-modal="true" aria-label="Review your order" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="close-checkout" onClick={() => setCheckoutOpen(false)} aria-label="Close order review">×</button>
            <h2>Review Your Order</h2>
            {cart.map((item) => (
              <p key={item.cartKey}>
                {item.name} — {item.selectedSize} × {item.quantity}: {currency(Number(item.price_gbp) * item.quantity)}
              </p>
            ))}
            <h3>Total: {currency(cartTotal)}</h3>
            <p>Order preview only. No payment is taken. Production time and delivery are separate; confirm availability and final delivery date before placing an order.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
