type NavProps = {
  tabs: string[];
  activeTab: string;
  onSelect: (tab: string) => void;
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

