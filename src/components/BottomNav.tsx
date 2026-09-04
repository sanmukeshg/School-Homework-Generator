import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/', label: 'Home', tour: 'nav-home' },
  { to: '/history', label: 'History', tour: 'nav-history' },
  { to: '/settings', label: 'Settings', tour: 'nav-settings' }
]

/** Floating pill navigation. Text only — no icons, no emoji. */
export function BottomNav() {
  return (
    <nav className="nav-dock">
      <div className="nav-pill-bar">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            data-tour={tab.tour}
            end={tab.to === '/'}
            className={({ isActive }) =>
              ['nav-item', isActive ? 'nav-item-active' : ''].join(' ')
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
