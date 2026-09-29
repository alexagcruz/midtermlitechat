"use client";

import type { FormEvent } from "react";
import Link from "next/link";

export function DeedaEntry({ onEnter }: { onEnter: () => void }) {
  function enterWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onEnter();
  }

  return (
    <main className="entry-screen">
      <section className="entry-brand-panel" aria-label="About Deeda">
        <Link className="entry-brand" href="/" aria-label="Deeda home">
          <span className="entry-brand-mark" aria-hidden="true">d</span>
          <span>deeda</span>
        </Link>
        <div className="entry-brand-copy">
          <p className="entry-overline">A LITTLE MORE CLARITY</p>
          <h1>Make room for your next good idea.</h1>
          <p>
            One calm workspace for curious questions, thoughtful answers, and
            the conversations worth coming back to.
          </p>
        </div>
        <div className="entry-orbit" aria-hidden="true">
          <span className="orbit-core" />
          <span className="orbit-ring orbit-ring-one" />
          <span className="orbit-ring orbit-ring-two" />
          <span className="orbit-spark orbit-spark-one" />
          <span className="orbit-spark orbit-spark-two" />
        </div>
        <p className="entry-brand-footer">Conversations are saved in this browser.</p>
      </section>

      <section className="entry-form-region" aria-label="Demo entry">
        <form className="entry-card" onSubmit={enterWorkspace}>
          <div className="entry-card-kicker">
            <span className="entry-card-dot" aria-hidden="true" />
            DEEDA <span>/</span> LOCAL DEMO
          </div>
          <h2>Welcome to Deeda</h2>
          <p className="entry-intro">
            Step into your workspace. No account needed.
          </p>

          <label htmlFor="demo-username">Username or email</label>
          <input
            autoComplete="off"
            id="demo-username"
            name="username"
            placeholder="you@example.com"
            type="text"
          />

          <label htmlFor="demo-password">Password</label>
          <input
            autoComplete="off"
            id="demo-password"
            name="password"
            placeholder="Enter any text, or leave blank"
            type="password"
          />

          <button className="entry-login-button" type="submit">
            Log in <span aria-hidden="true">&#8594;</span>
          </button>

          <div className="entry-divider" aria-hidden="true">
            <span />
            <span>OR</span>
            <span />
          </div>

          <button
            className="entry-google-button"
            disabled
            type="button"
            aria-describedby="google-demo-note"
          >
            <span className="google-mark" aria-hidden="true">G</span>
            <span>Continue with Google</span>
            <span className="google-not-connected">Not connected</span>
          </button>
          <p className="google-demo-note" id="google-demo-note">
            Google sign-in is not connected in this demo.
          </p>
          <p className="entry-security-note">
            This demo does not verify or save your password.
          </p>
        </form>
        <p className="entry-region-footer">A focused space for the things you wonder about.</p>
      </section>
    </main>
  );
}
