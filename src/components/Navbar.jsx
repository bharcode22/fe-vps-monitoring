import React, { useState } from 'react';
import { RefreshCw, Menu, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { PRIMARY_NAV_ITEMS, NAV_DROPDOWN_GROUPS } from './navbar/navConfig';
import NavbarBrand from './navbar/NavbarBrand';
import NavbarNavDropdown from './navbar/NavbarNavDropdown';
import NavbarAddMenu from './navbar/NavbarAddMenu';
import NavbarUtilities from './navbar/NavbarUtilities';
import NavbarUserProfile from './navbar/NavbarUserProfile';
import NavbarMobileDrawer from './navbar/NavbarMobileDrawer';

export default function Navbar({
  onOpenAddModal,
  onOpenAddServiceModal,
  totalServers,
  isConnected,
  onRefresh,
  isTvMode,
  onToggleTvMode,
  onOpenUserModal,
  currentView = 'dashboard',
  onNavigateView
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [activeDropdownGroup, setActiveDropdownGroup] = useState(null); // 'db-sync' | 'storage-media' | 'monitoring-tools' | null
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();

  const handleToggleGroup = (groupId) => {
    setActiveDropdownGroup(prev => (prev === groupId ? null : groupId));
    setIsAddMenuOpen(false);
    setIsUserMenuOpen(false);
  };

  const handleToggleAddMenu = () => {
    setIsAddMenuOpen(prev => !prev);
    setActiveDropdownGroup(null);
    setIsUserMenuOpen(false);
  };

  const handleToggleUserMenu = () => {
    setIsUserMenuOpen(prev => !prev);
    setActiveDropdownGroup(null);
    setIsAddMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 rounded-b-2xl px-3 sm:px-5 lg:px-6 py-3 mb-6 backdrop-blur-xl bg-slate-900/90 border-b border-cyan-500/20 shadow-2xl transition-all duration-300">
      <div className="flex items-center justify-between gap-2 md:gap-4">

        {/* ========================================================================= */}
        {/* LEFT: Brand Logo & Title */}
        {/* ========================================================================= */}
        <NavbarBrand
          isConnected={isConnected}
          onNavigateHome={() => onNavigateView && onNavigateView('dashboard')}
        />

        {/* ========================================================================= */}
        {/* CENTER: Grouped Navigation Menus & Dropdowns (Desktop & Tablet) */}
        {/* ========================================================================= */}
        {onNavigateView && (
          <div className="hidden lg:flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800 shadow-inner">
            {/* 1. Primary Direct Navigation Buttons */}
            {PRIMARY_NAV_ITEMS.map((item) => {
              if (item.authRequired && !isAuthenticated) return null;
              const ItemIcon = item.icon;
              const isActive =
                currentView === item.id ||
                (item.aliases && item.aliases.includes(currentView));

              return (
                <button
                  key={item.id}
                  onClick={() => onNavigateView(item.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${isActive
                    ? 'bg-gradient-to-r from-cyan-500/25 to-blue-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                    }`}
                >
                  <ItemIcon
                    size={14}
                    className={isActive ? 'text-cyan-400' : 'text-slate-500'}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}

            {/* 2. Categorized Dropdown Groups */}
            {isAuthenticated &&
              NAV_DROPDOWN_GROUPS.map((group) => (
                <NavbarNavDropdown
                  key={group.groupId}
                  group={group}
                  currentView={currentView}
                  onNavigateView={onNavigateView}
                  isOpen={activeDropdownGroup === group.groupId}
                  onToggle={() => handleToggleGroup(group.groupId)}
                  onClose={() => setActiveDropdownGroup(null)}
                />
              ))}
          </div>
        )}

        {/* ========================================================================= */}
        {/* RIGHT: Actions, Utilities & User Profile Menu */}
        {/* ========================================================================= */}
        <div className="hidden md:flex items-center gap-2 lg:gap-2.5 shrink-0">
          {/* "+ Tambah" Dropdown Button */}
          {isAuthenticated && (
            <NavbarAddMenu
              isOpen={isAddMenuOpen}
              onToggle={handleToggleAddMenu}
              onClose={() => setIsAddMenuOpen(false)}
              onOpenAddServer={onOpenAddModal}
              onOpenAddService={onOpenAddServiceModal}
            />
          )}

          {/* Utilities: TV Mode, Refresh & Language Switcher */}
          <NavbarUtilities
            isTvMode={isTvMode}
            onToggleTvMode={onToggleTvMode}
            onRefresh={onRefresh}
            isAuthenticated={isAuthenticated}
          />

          {/* User Account / Profile Dropdown */}
          <NavbarUserProfile
            isOpen={isUserMenuOpen}
            onToggle={handleToggleUserMenu}
            onClose={() => setIsUserMenuOpen(false)}
            onOpenUserModal={onOpenUserModal}
            onNavigateHome={() => onNavigateView && onNavigateView('dashboard')}
          />
        </div>

        {/* ========================================================================= */}
        {/* MOBILE MENU TOGGLE BUTTON (Screens < lg) */}
        {/* ========================================================================= */}
        <div className="flex lg:hidden items-center gap-1.5">
          {isAuthenticated && (
            <button
              onClick={onRefresh}
              className="p-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-700 cursor-pointer"
              title={t('refresh')}
            >
              <RefreshCw size={15} />
            </button>
          )}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 rounded-xl border border-cyan-500/40 cursor-pointer hover:bg-cyan-500/30 transition-all"
            aria-label="Toggle Navigation Menu"
          >
            {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* MOBILE DRAWER: View Switcher & Action List */}
      {/* ========================================================================= */}
      <NavbarMobileDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        currentView={currentView}
        onNavigateView={onNavigateView}
        onOpenAddModal={onOpenAddModal}
        onOpenAddServiceModal={onOpenAddServiceModal}
        onOpenUserModal={onOpenUserModal}
        isTvMode={isTvMode}
        onToggleTvMode={onToggleTvMode}
      />
    </header>
  );
}
