import type { TabId } from "../App";

type NavProps = {
  tabs: TabId[];
  activeTab: TabId;
  onSelect: (tab: TabId) => void;
};

export function Nav({ tabs, activeTab, onSelect }: NavProps) {
  return (
    <nav className="nav">
      {tabs.map((tab) => (
        <button
          key={tab}
          className={`nav-button ${activeTab === tab ? "active" : ""}`}
          onClick={() => onSelect(tab)}
          type="button"
        >
          {tab}
        </button>
      ))}
    </nav>
  );
}

export default Nav;
