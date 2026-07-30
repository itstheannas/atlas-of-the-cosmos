"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  navigationItems,
  sectionHref,
  type AppSection,
  type UiCopy,
} from "../../lib/i18n";

interface NavigationProps {
  readonly copy: UiCopy;
  readonly currentSection: AppSection;
  readonly navigationOpen: boolean;
  readonly online: boolean;
  readonly onNavigationOpenChange: (open: boolean) => void;
  readonly onNavigate: (section: AppSection) => void;
  readonly onSearchOpen: () => void;
}

const navigationGroups = [
  { id: "explore", copyKey: "menuExplore" },
  { id: "discover", copyKey: "menuDiscover" },
  { id: "reference", copyKey: "menuReference" },
] as const;

export function Navigation({
  copy,
  currentSection,
  navigationOpen,
  online,
  onNavigationOpenChange,
  onNavigate,
  onSearchOpen,
}: NavigationProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const wasOpenRef = useRef(false);
  const restoreFocusOnCloseRef = useRef(true);

  useEffect(() => {
    const background = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".topbar, .desktop-rail, .mobile-tabs, #main-content",
      ),
    );
    background.forEach((element) => {
      element.inert = navigationOpen;
    });

    const animationFrame = window.requestAnimationFrame(() => {
      if (navigationOpen) {
        closeButtonRef.current?.focus();
      } else if (wasOpenRef.current && restoreFocusOnCloseRef.current) {
        triggerRef.current?.focus();
      }
      if (!navigationOpen) restoreFocusOnCloseRef.current = true;
      wasOpenRef.current = navigationOpen;
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [navigationOpen]);

  useEffect(
    () => () => {
      document
        .querySelectorAll<HTMLElement>(
          ".topbar, .desktop-rail, .mobile-tabs, #main-content",
        )
        .forEach((element) => {
          element.inert = false;
        });
    },
    [],
  );

  function handleDrawerKeyDown(event: ReactKeyboardEvent<HTMLElement>): void {
    if (event.key === "Escape") {
      event.preventDefault();
      onNavigationOpenChange(false);
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = Array.from(
      drawerRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    ).filter((element) => !element.inert);
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;
    if (!drawerRef.current?.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <>
      <header className="topbar">
        <button
          ref={triggerRef}
          className="icon-button navigation-trigger"
          type="button"
          aria-label={copy.openNavigation}
          aria-expanded={navigationOpen}
          onClick={() => {
            restoreFocusOnCloseRef.current = true;
            onNavigationOpenChange(!navigationOpen);
          }}
        >
          <span aria-hidden="true">☰</span>
        </button>
        <Link
          className="wordmark"
          href="/"
          onClick={(event) => {
            event.preventDefault();
            onNavigate("explorer");
          }}
        >
          <span className="wordmark-mark" aria-hidden="true">
            A
          </span>
          <span>
            <strong>{copy.brandShort}</strong>
            <small>{copy.edition}</small>
          </span>
        </Link>
        <button
          type="button"
          className="global-search-trigger"
          onClick={onSearchOpen}
          aria-haspopup="dialog"
        >
          <span aria-hidden="true">⌕</span>
          <span>{copy.commandSearch}</span>
          <kbd>/</kbd>
        </button>
        <div
          className={`network-status ${online ? "is-online" : "is-offline"}`}
          role="status"
        >
          <span aria-hidden="true" />
          {online ? copy.networkStatusOnline : copy.networkStatusOffline}
        </div>
      </header>

      <aside className="desktop-rail" aria-label={copy.navigation.primary}>
        {navigationItems.slice(0, 12).map((item) => {
          const itemCopy = copy.navigation[item.id];
          return (
            <a
              key={item.id}
              className={currentSection === item.id ? "is-active" : undefined}
              href={sectionHref(item.id)}
              aria-current={currentSection === item.id ? "page" : undefined}
              title={itemCopy.label}
              onClick={(event) => {
                event.preventDefault();
                onNavigate(item.id);
              }}
            >
              <span aria-hidden="true">{item.symbol}</span>
              <small>{itemCopy.shortLabel}</small>
            </a>
          );
        })}
      </aside>

      {navigationOpen ? (
        <div
          className="navigation-scrim is-visible"
          aria-hidden="true"
          onClick={() => onNavigationOpenChange(false)}
        />
      ) : null}
      <aside
        ref={drawerRef}
        className={`navigation-drawer ${navigationOpen ? "is-open" : ""}`}
        role="dialog"
        aria-modal={navigationOpen ? "true" : undefined}
        aria-labelledby="navigation-drawer-title"
        aria-hidden={!navigationOpen}
        inert={!navigationOpen}
        onKeyDown={handleDrawerKeyDown}
      >
        <div className="drawer-heading">
          <div>
            <p className="eyebrow">{copy.edition}</p>
            <h2 id="navigation-drawer-title">{copy.brand}</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="icon-button"
            aria-label={copy.closeNavigation}
            onClick={() => onNavigationOpenChange(false)}
          >
            ×
          </button>
        </div>
        <nav>
          {navigationGroups.map((group) => (
            <section key={group.id} className="navigation-group">
              <h3>{copy[group.copyKey]}</h3>
              <div className="navigation-grid">
                {navigationItems
                  .filter((item) => item.group === group.id)
                  .map((item) => {
                    const itemCopy = copy.navigation[item.id];
                    return (
                      <a
                        key={item.id}
                        className={
                          currentSection === item.id ? "is-active" : undefined
                        }
                        href={sectionHref(item.id)}
                        aria-current={
                          currentSection === item.id ? "page" : undefined
                        }
                        onClick={(event) => {
                          event.preventDefault();
                          restoreFocusOnCloseRef.current = false;
                          onNavigate(item.id);
                          onNavigationOpenChange(false);
                        }}
                      >
                        <span aria-hidden="true">{item.symbol}</span>
                        <span>{itemCopy.label}</span>
                      </a>
                    );
                  })}
              </div>
            </section>
          ))}
        </nav>
        <footer className="drawer-project-credit">
          <strong>{copy.edition}</strong>
          <small>{copy.navigation.copyright}</small>
        </footer>
      </aside>

      <nav className="mobile-tabs" aria-label={copy.navigation.primary}>
        {navigationItems.slice(0, 5).map((item) => {
          const itemCopy = copy.navigation[item.id];
          return (
            <a
              key={item.id}
              className={currentSection === item.id ? "is-active" : undefined}
              href={sectionHref(item.id)}
              aria-current={currentSection === item.id ? "page" : undefined}
              onClick={(event) => {
                event.preventDefault();
                onNavigate(item.id);
              }}
            >
              <span aria-hidden="true">{item.symbol}</span>
              <small>{itemCopy.shortLabel}</small>
            </a>
          );
        })}
      </nav>
    </>
  );
}
