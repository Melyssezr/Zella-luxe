import { useEffect, useId, useRef, useState } from "react";
import loginBackground from "./assets/nv-login.png";

export type Role = "admin" | "vendeur";

const ROLES: { value: Role; label: string }[] = [
  { value: "admin", label: "Administrateur" },
  { value: "vendeur", label: "Vendeur(se)" },
];

const ROLE_KEY = "zella-stock-role";
const REMEMBER_KEY = "zella-stock-remember";

type Props = {
  onConnected: (role: Role) => void;
};

export function LoginScreen({ onConnected }: Props) {
  const [role, setRole] = useState<Role>("admin");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ password?: string }>({});
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const savedRemember = localStorage.getItem(REMEMBER_KEY) === "1";
    const savedRole = localStorage.getItem(ROLE_KEY);
    setRemember(savedRemember);
    if (savedRemember && (savedRole === "admin" || savedRole === "vendeur")) setRole(savedRole);
  }, []);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!password.trim()) {
      setErrors({ password: "Saisissez votre mot de passe." });
      return;
    }

    setErrors({});
    setNotice("");

    if (remember) {
      localStorage.setItem(ROLE_KEY, role);
      localStorage.setItem(REMEMBER_KEY, "1");
    } else {
      localStorage.removeItem(ROLE_KEY);
      localStorage.removeItem(REMEMBER_KEY);
    }

    onConnected(role);
  }

  return (
    <div className="login-page">
      <div className="login-bg" aria-hidden>
        <img className="background-image" src={loginBackground} alt="" draggable={false} />
      </div>
      <div className="login-content">
        <LoginCard
          role={role}
          password={password}
          remember={remember}
          showPassword={showPassword}
          errors={errors}
          notice={notice}
          onRoleChange={setRole}
          onPasswordChange={(value) => {
            setPassword(value);
            setErrors({});
            setNotice("");
          }}
          onRememberChange={setRemember}
          onTogglePassword={() => setShowPassword((show) => !show)}
          onForgotPassword={() =>
            setNotice("Contactez l’administrateur pour réinitialiser votre mot de passe.")
          }
          onContactAdmin={() => setNotice("Écrivez à l’administrateur pour créer un accès.")}
          onSubmit={submit}
        />
      </div>
    </div>
  );
}

function LoginCard({
  role,
  password,
  remember,
  showPassword,
  errors,
  notice,
  onRoleChange,
  onPasswordChange,
  onRememberChange,
  onTogglePassword,
  onForgotPassword,
  onContactAdmin,
  onSubmit,
}: {
  role: Role;
  password: string;
  remember: boolean;
  showPassword: boolean;
  errors: { password?: string };
  notice: string;
  onRoleChange: (value: Role) => void;
  onPasswordChange: (value: string) => void;
  onRememberChange: (value: boolean) => void;
  onTogglePassword: () => void;
  onForgotPassword: () => void;
  onContactAdmin: () => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  return (
    <form className="login-card" onSubmit={onSubmit} noValidate aria-label="Connexion">
      <div className="login-brand">
        <CrownIcon />
        <p className="login-brand-name">ZELLA</p>
        <p className="login-brand-sub">LUXE</p>
        <span className="login-gold-line" aria-hidden />
      </div>

      <header className="login-heading">
        <h1>
          Bienvenue chez
          <strong>Zella Stock</strong>
        </h1>
        <p>Connectez-vous pour accéder à votre espace</p>
      </header>

      <RoleField value={role} onChange={onRoleChange} />

      <PasswordField
        value={password}
        error={errors.password}
        showPassword={showPassword}
        onChange={onPasswordChange}
        onToggle={onTogglePassword}
      />

      <div className="login-row">
        <label className="login-check">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => onRememberChange(event.target.checked)}
          />
          <span>Se souvenir de moi</span>
        </label>
        <button type="button" className="login-text-link" onClick={onForgotPassword}>
          Mot de passe oublié ?
        </button>
      </div>

      {notice ? (
        <p className="login-notice" role="status">
          {notice}
        </p>
      ) : null}

      <button type="submit" className="login-submit">
        Se connecter →
      </button>

      <div className="login-sep" aria-hidden />

      <p className="login-signup">
        Vous n’avez pas de compte ?
        <button type="button" className="login-text-link" onClick={onContactAdmin}>
          Contactez l’administrateur
        </button>
      </p>

      <footer className="login-secure">
        <ShieldIcon />
        <div>
          <strong>Connexion sécurisée</strong>
          <span>Zella Stock — Zella Luxe</span>
        </div>
      </footer>
    </form>
  );
}

function RoleField({ value, onChange }: { value: Role; onChange: (value: Role) => void }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const label = ROLES.find((item) => item.value === value)?.label ?? "Administrateur";

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="login-field">
      <label htmlFor="role-button">Rôle</label>
      <div className="login-role" ref={box}>
        <button
          id="role-button"
          type="button"
          className="login-control login-role-btn"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          <span className="login-field-ico" aria-hidden>
            <UserIcon />
          </span>
          <span className="login-role-value">{label}</span>
          <ChevronIcon open={open} />
        </button>
        {open ? (
          <ul className="login-role-menu" role="listbox" aria-labelledby="role-button">
            {ROLES.map((item) => (
              <li key={item.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={item.value === value}
                  className={item.value === value ? "on" : ""}
                  onClick={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                >
                  {item.label}
                  {item.value === value ? <CheckIcon /> : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

function PasswordField({
  value,
  error,
  showPassword,
  onChange,
  onToggle,
}: {
  value: string;
  error?: string;
  showPassword: boolean;
  onChange: (value: string) => void;
  onToggle: () => void;
}) {
  const errorId = useId();
  return (
    <div className="login-field">
      <label htmlFor="password">Mot de passe</label>
      <div className={error ? "login-control invalid" : "login-control"}>
        <span className="login-field-ico" aria-hidden>
          <LockIcon />
        </span>
        <input
          id="password"
          type={showPassword ? "text" : "password"}
          value={value}
          autoComplete="current-password"
          placeholder="Entrez votre mot de passe"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          className="login-eye"
          aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          aria-pressed={showPassword}
          onClick={onToggle}
        >
          <EyeIcon off={showPassword} />
        </button>
      </div>
      {error ? (
        <p id={errorId} className="login-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function CrownIcon() {
  return (
    <svg className="login-crown" viewBox="0 0 32 22" aria-hidden>
      <path
        d="M3.2 18.6 6.1 7.4 12.2 13 16 3.6 19.8 13 25.9 7.4 28.8 18.6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M4.4 18.6h23.2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="16" cy="3.4" r="1.35" fill="currentColor" />
      <circle cx="6.1" cy="7.2" r="1.15" fill="currentColor" />
      <circle cx="25.9" cy="7.2" r="1.15" fill="currentColor" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="8.2" r="3.1" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5.6 18.4c.7-3.1 3.2-4.7 6.4-4.7s5.7 1.6 6.4 4.7" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <rect x="6" y="11" width="12" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.4 11V8.4a3.6 3.6 0 0 1 7.2 0V11" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="2.3" fill="none" stroke="currentColor" strokeWidth="1.6" />
      {off && <path d="M4 20 20 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />}
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={open ? "login-chev open" : "login-chev"}>
      <path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="login-check-ico">
      <path d="M5 12.5 9.2 17 19 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 3.4 5.4 6v5.3c0 4.1 2.7 7.1 6.6 8.6 3.9-1.5 6.6-4.5 6.6-8.6V6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M9.2 12.1 11.2 14l3.8-4.2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
