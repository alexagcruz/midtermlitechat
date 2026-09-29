"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  LocalAuthError,
  authErrorMessage,
  registrationFieldErrors,
  type RegistrationFieldErrors,
  type RegistrationInput,
} from "@/lib/auth/accounts";

type EntryMode = "login" | "register";

export function DeedaEntry({
  initialNotice,
  onLogin,
  onRegister,
}: {
  initialNotice: string;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (input: RegistrationInput) => Promise<string>;
}) {
  const [mode, setMode] = useState<EntryMode>("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialNotice);
  const [notice, setNotice] = useState("");
  const [fieldErrors, setFieldErrors] = useState<RegistrationFieldErrors>({});
  const emailRef = useRef<HTMLInputElement>(null);
  const displayNameRef = useRef<HTMLInputElement>(null);

  function switchMode(nextMode: EntryMode) {
    setMode(nextMode);
    setError("");
    setNotice("");
    setFieldErrors({});
    setPassword("");
    setPasswordConfirmation("");
    window.requestAnimationFrame(() => {
      (nextMode === "login" ? emailRef.current : displayNameRef.current)?.focus();
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    setFieldErrors({});

    try {
      if (mode === "register") {
        const input = { displayName, email, password, passwordConfirmation };
        const validationErrors = registrationFieldErrors(input);
        if (Object.keys(validationErrors).length > 0) {
          setFieldErrors(validationErrors);
          setError("Correct the highlighted account fields.");
          setPassword("");
          setPasswordConfirmation("");
          return;
        }

        const normalizedEmail = await onRegister({
          ...input,
        });
        setMode("login");
        setEmail(normalizedEmail);
        setDisplayName("");
        setPassword("");
        setPasswordConfirmation("");
        setNotice("Account created. Log in with your email and password.");
        window.requestAnimationFrame(() => emailRef.current?.focus());
      } else {
        await onLogin(email, password);
        setPassword("");
        setPasswordConfirmation("");
      }
    } catch (submitError) {
      setError(authErrorMessage(submitError));
      if (submitError instanceof LocalAuthError && submitError.code === "account-exists") {
        setFieldErrors({ email: "An account with this email already exists." });
      }
      setPassword("");
      setPasswordConfirmation("");
    } finally {
      setBusy(false);
    }
  }

  const registering = mode === "register";

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

      <section className="entry-form-region" aria-label="Account access">
        <form
          aria-label={registering ? "Create account" : "Log in"}
          className="entry-card"
          noValidate
          onSubmit={submit}
        >
          <div className="entry-card-kicker">
            <span className="entry-card-dot" aria-hidden="true" />
            DEEDA <span>/</span> LOCAL ACCOUNT
          </div>
          <h2>{registering ? "Create your account" : "Welcome to Deeda"}</h2>
          <p className="entry-intro">
            {registering
              ? "Create a local account for this browser."
              : "Log in to return to your Deeda workspace."}
          </p>

          <div className="entry-mode-switch">
            <span>{registering ? "Already have an account?" : "New to Deeda?"}</span>
            <button
              disabled={busy}
              onClick={() => switchMode(registering ? "login" : "register")}
              type="button"
            >
              {registering ? "Log in" : "Create account"}
            </button>
          </div>

          {(error || notice) && (
            <p
              className={`entry-message${notice && !error ? " is-success" : ""}`}
              role={error ? "alert" : "status"}
            >
              {error || notice}
            </p>
          )}

          {registering && (
            <>
              <label htmlFor="account-display-name">Display name</label>
              <input
                aria-describedby={fieldErrors.displayName ? "display-name-error" : undefined}
                aria-invalid={Boolean(fieldErrors.displayName)}
                autoComplete="name"
                id="account-display-name"
                maxLength={80}
                onChange={(event) => setDisplayName(event.target.value)}
                ref={displayNameRef}
                required
                value={displayName}
              />
              {fieldErrors.displayName && (
                <span className="entry-field-error" id="display-name-error">
                  {fieldErrors.displayName}
                </span>
              )}
            </>
          )}

          <label htmlFor="account-email">Email</label>
          <input
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
            aria-invalid={Boolean(fieldErrors.email)}
            autoComplete="email"
            id="account-email"
            maxLength={254}
            onChange={(event) => setEmail(event.target.value)}
            ref={emailRef}
            required
            type="email"
            value={email}
          />
          {fieldErrors.email && (
            <span className="entry-field-error" id="email-error">
              {fieldErrors.email}
            </span>
          )}

          <label htmlFor="account-password">Password</label>
          <input
            aria-describedby={fieldErrors.password ? "password-error" : undefined}
            aria-invalid={Boolean(fieldErrors.password)}
            autoComplete={registering ? "new-password" : "current-password"}
            id="account-password"
            maxLength={256}
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
          {fieldErrors.password && (
            <span className="entry-field-error" id="password-error">
              {fieldErrors.password}
            </span>
          )}

          {registering && (
            <>
              <label htmlFor="account-password-confirmation">Confirm password</label>
              <input
                aria-describedby={fieldErrors.passwordConfirmation ? "password-confirmation-error" : undefined}
                aria-invalid={Boolean(fieldErrors.passwordConfirmation)}
                autoComplete="new-password"
                id="account-password-confirmation"
                maxLength={256}
                minLength={8}
                onChange={(event) => setPasswordConfirmation(event.target.value)}
                required
                type="password"
                value={passwordConfirmation}
              />
              {fieldErrors.passwordConfirmation && (
                <span className="entry-field-error" id="password-confirmation-error">
                  {fieldErrors.passwordConfirmation}
                </span>
              )}
            </>
          )}

          <button className="entry-login-button" disabled={busy} type="submit">
            {busy
              ? registering ? "Creating account..." : "Checking..."
              : registering ? "Create account" : "Log in"}
            {!registering && <span aria-hidden="true">&#8594;</span>}
          </button>

          <div className="entry-divider" aria-hidden="true">
            <span />
            <span>OR</span>
            <span />
          </div>

          <button
            aria-describedby="google-demo-note"
            className="entry-google-button"
            disabled
            type="button"
          >
            <span className="google-mark" aria-hidden="true">G</span>
            <span>Continue with Google</span>
            <span className="google-not-connected">Not connected</span>
          </button>
          <p className="google-demo-note" id="google-demo-note">
            Google sign-in is not connected.
          </p>
          <p className="entry-security-note">
            Accounts and conversations stay in this browser. This local login
            does not protect the chat service.
          </p>
        </form>
        <p className="entry-region-footer">A focused space for the things you wonder about.</p>
      </section>
    </main>
  );
}
