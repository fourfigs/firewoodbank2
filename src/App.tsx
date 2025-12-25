import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import Nav from "./components/Nav";

const tabs = ["Dashboard", "Clients", "Inventory"];

function Content({ tab }: { tab: string }) {
  if (tab === "Dashboard") {
    return <p>Welcome to the Firewood Bank dashboard.</p>;
  }
  if (tab === "Clients") {
    return <p>Client list will live here.</p>;
  }
  if (tab === "Inventory") {
    return <p>Inventory overview will live here.</p>;
  }
  return null;
}

function App() {
  const [activeTab, setActiveTab] = useState<string>("Dashboard");
  const [pingResult, setPingResult] = useState<string | null>(null);
  const [pinging, setPinging] = useState(false);

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

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Firewood Bank</h1>
          <p className="subtitle">Stage 1: Tauri + React skeleton</p>
        </div>
        <button className="ping" onClick={handlePing} disabled={pinging}>
          {pinging ? "Pinging..." : "Ping Tauri"}
        </button>
      </header>

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
    </div>
  );
}

export default App;

