import React from 'react'
import NotificationBell from './NotificationBell'

export default function Header({ title, searchValue, onSearch, children }) {
  return (
    <header className="top-header">
      <div className="header-left">
        <h1 className="page-title">{title}</h1>
      </div>
      <div className="header-center">
        {onSearch !== undefined && (
          <div className="search-box">
            <span className="search-icon">⌕</span>
            <input
              type="text"
              placeholder="Search projects, themes…"
              value={searchValue || ''}
              onChange={e => onSearch(e.target.value)}
            />
          </div>
        )}
      </div>
      <div className="header-right">
        {children}
        <NotificationBell />
      </div>
    </header>
  )
}
