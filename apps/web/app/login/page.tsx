'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiEye, FiEyeOff, FiLock, FiMail, FiShield } from 'react-icons/fi';
import { TrilhaBrand } from '../../components/trilha-brand';
import { api } from '../../lib/api';

type LoginResponse = {
  accessToken: string;
  user: { id: string; name: string; email: string; systemRole: string };
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const remembered = localStorage.getItem('trilha_login_email');
    if (remembered) setEmail(remembered);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      localStorage.setItem('pdi_token', data.accessToken);
      localStorage.setItem('pdi_user', JSON.stringify(data.user));

      if (remember) localStorage.setItem('trilha_login_email', email);
      else localStorage.removeItem('trilha_login_email');

      router.push(data.user.systemRole === 'USER' ? '/meu-pdi' : '/');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível entrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="clean-login-page">
      <div className="clean-login-glow clean-login-glow-left" aria-hidden="true" />
      <div className="clean-login-glow clean-login-glow-right" aria-hidden="true" />

      <section className="clean-login-shell" aria-labelledby="login-title">
        <header className="clean-login-brand">
          <TrilhaBrand theme="light" />
          <span>Desenvolvimento com propósito</span>
        </header>

        <form className="clean-login-card" onSubmit={submit}>
          <div className="clean-login-heading">
            <p>Olá novamente</p>
            <h1 id="login-title">Acesse sua conta</h1>
            <span>Entre para acompanhar sua evolução profissional.</span>
          </div>

          <label className="clean-login-field">
            <span>E-mail</span>
            <div>
              <FiMail aria-hidden="true" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@empresa.com"
                autoComplete="email"
                required
              />
            </div>
          </label>

          <label className="clean-login-field">
            <span>Senha</span>
            <div>
              <FiLock aria-hidden="true" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Digite sua senha"
                minLength={8}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </label>

          <label className="clean-login-remember">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
            />
            <span>Lembrar meu e-mail</span>
          </label>

          {error && (
            <div className="clean-login-error" role="alert" aria-live="polite">
              {error}
            </div>
          )}

          <button className="clean-login-submit" type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <footer className="clean-login-footer">
          <FiShield aria-hidden="true" />
          <span>Acesso seguro e gerenciado pela sua empresa</span>
        </footer>
      </section>
    </main>
  );
}
