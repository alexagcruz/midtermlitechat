"use client";

import Link from "next/link";

export function ChatApp() {
  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Conversation navigation">
        <Link className="brand" href="/" aria-label="LiteChat home">
          <span className="brand-mark" aria-hidden="true">
            L
          </span>
          <span>litechat</span>
        </Link>
        <p className="sidebar-kicker">MODEL ACCESS, MADE SIMPLE</p>
      </aside>
      <section className="chat-panel" aria-label="Chat">
        <div className="chat-header">
          <div>
            <p className="eyebrow">TEXT CHAT / TOKEN METERED</p>
            <h1>Your AI workbench</h1>
          </div>
          <span className="status-pill">PROTOTYPE</span>
        </div>
        <div className="empty-state">
          <span className="empty-index">01</span>
          <h2>One conversation. Three proxy routes.</h2>
          <p>
            Start with a question, choose a route, and keep your history in this
            browser.
          </p>
        </div>
      </section>
    </main>
  );
}
