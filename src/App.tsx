import { useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import Nav from "./components/Nav";
import logo from "./assets/logo.png";

const tabs = ["Dashboard", "Clients", "Inventory"];

type UserSession = {
  name: string;
  email: string;
};

function Content({ tab }: { tab: string }) {
  if (tab === "Dashboard") {
    return (
      <div>
        <div className="hero">
          <h2>Community warmth at a glance</h2>
          <p>Ops metrics and scheduling will live here.</p>
        </div>
        <div className="two-up">
          <div className="card">
            <h3>Upcoming deliveries</h3>
            <p>Delivery/Workday calendar will show here.</p>
          </div>
          <div className="card">
            <h3>Low inventory</h3>
            <p>Threshold alerts will appear here.</p>
          </div>
        </div>
      </div>
    );
  }
  if (tab === "Clients") {
    return <p>Client list and onboarding form will live here.</p>;
  }
  if (tab === "Inventory") {
    return <p>Inventory overview will live here.</p>;
  }
  return null;
}

function LoginCard({
  onLogin,
}: {
  onLogin: (session: UserSession) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    // Placeholder auth: accept any email/password and create a session.
    setTimeout(() => {
      onLogin({ name: "Firewood Staff", email });
      setSubmitting(false);
    }, 300);
  };

  return (
    <section className="card login-card">
      <div className="badge">Login</div>
      <h3>Welcome back</h3>
      <p className="subtitle">
        Access the Firewood Bank console to manage clients, orders, and
        inventory.
      </p>
      <form onSubmit={handleSubmit} className="two-up">
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="login-actions" style={{ gridColumn: "1 / -1" }}>
          <button className="ping" type="submit" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </button>
          <button
            className="ghost"
            type="button"
            onClick={() => {
              setEmail("");
              setPassword("");
            }}
          >
            Clear
          </button>
        </div>
      </form>
    </section>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState<string>("Dashboard");
  const [pingResult, setPingResult] = useState<string | null>(null);
  const [pinging, setPinging] = useState(false);
  const [session, setSession] = useState<UserSession | null>(null);

  const handlePing = async () => {
    try {
      setPinging(true);
      const response = await invoke<string>("ping");
      setPingResult(response);
    } catch (error) {
      setPingResult("Ping failed");
      console.error(error);
    } finally {
      setPinging(false);
    }
  };

  const initials = useMemo(() => {
    if (!session?.name) return "FB";
    const parts = session.name.split(" ").filter(Boolean);
    return parts
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase();
  }, [session]);

  return (
    <div className="app">
      <header className="header">
        <div className="brand-lockup">
          <div className="brand-mark">
            <img
              src={logo}
              alt="Community Firewood Bank"
              style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
            />
          </div>
          <div className="brand-text">
            <h1>Community Firewood Bank</h1>
            <p className="subtitle">Keeping Eachother Warm</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="ping" onClick={handlePing} disabled={pinging}>
            {pinging ? "Pinging..." : "Ping Tauri"}
          </button>
          {session && (
            <button className="ghost" onClick={() => setSession(null)}>
              Sign out
            </button>
          )}
        </div>
      </header>

      {session ? (
        <>
          <Nav tabs={tabs} activeTab={activeTab} onSelect={setActiveTab} />

          <main className="main">
            <section className="card">
              <h2>{activeTab}</h2>
              <Content tab={activeTab} />
            </section>

            <section className="card">
              <h3>Bridge Test</h3>
              <p>Click “Ping Tauri” to call the Rust command.</p>
              <div className="ping-result">
                Result: {pingResult ?? "not called yet"}
              </div>
            </section>
          </main>
        </>
      ) : (
        <main className="main">
          <section className="card">
            <div className="hero">
              <h2>Welcome to Firewood Bank</h2>
              <p>
                Sign in to manage clients, work orders, inventory, and invoices.
              </p>
            </div>
            <div className="two-up">
              <div className="card" style={{ background: "#fdf7ed" }}>
                <h3>Mission</h3>
                <p className="subtitle">
                  Community-powered warmth, honoring the brand feel from
                  NM-ERA.
                </p>
              </div>
              <div className="card" style={{ background: "#f9f2e5" }}>
                <h3>What you’ll see</h3>
                <p className="subtitle">
                  Dashboard, Clients, Inventory, plus a Rust↔React bridge test.
                </p>
              </div>
            </div>
          </section>
          <LoginCard onLogin={setSession} />
        </main>
      )}
    </div>
  );
}

export default App;

