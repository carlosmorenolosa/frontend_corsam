# Configuración de Supabase Auth + 2FA (TOTP)

Guía de puesta en marcha del nuevo sistema de acceso de Corsam IA.
El login ahora es real (Supabase Auth) y exige un segundo factor TOTP,
compatible con Google Authenticator, Authenticator de Microsoft, 1Password, etc.

## 1. Variables de entorno

Define en Vercel (y en tu `.env` local) estas variables:

```bash
VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key del proyecto>
```

Puedes copiar `env.example` como plantilla (renómbralo a `.env` en local). Ya no se usan
`VITE_USER_CORSAM` ni `VITE_PASSWORD_CORSAM`: elimínalas de Vercel.

## 2. Crear el usuario en Supabase

1. Entra en el [dashboard de Supabase](https://supabase.com/dashboard) y selecciona el proyecto de Corsam.
2. Ve a **Authentication → Users → Add user → Create new user**.
3. Introduce el email y una contraseña segura. Marca **Auto Confirm User** para no depender de un email de confirmación.
4. Apunta ese email y contraseña: son los que usarás en la pantalla de login.

## 3. Habilitar el factor TOTP

1. En el mismo proyecto, ve a **Authentication → Billing (?) → Multifactor Authentication** (o **Authentication → Settings → MFA**, según versión de dashboard).
2. Activa **TOTP** como factor permitido.

Sin este paso, `mfa.enroll` devolverá un error y el login no podrá completarse.

## 4. Primer acceso: enrollment

Con la app abierta:

1. Entra con email y contraseña.
2. Aparecerá la pantalla **Configura tu segundo factor** con un código QR.
3. Ábrelo con Google Authenticator → **+ → Escanear código QR**.
4. Si prefieres escribirlo a mano, usa la clave que aparece bajo el QR (preferible: activa Google Authenticator también para su copia de seguridad).
5. Introduce el código de 6 dígitos que muestra la app y pulsa **Verificar y activar**.

A partir de ese momento, cada login pedirá un código nuevo del autenticador.
El QR solo se muestra la primera vez; el secreto queda guardado en Supabase y
nunca viaja al navegador.

## 5. Si pierdes el autenticador

El acceso se recupera desde el dashboard de Supabase:

1. **Authentication → MFA Factors**: verás el factor del usuario; puedes **Eliminar** el factor.
2. Al volver a entrar con email+contraseña, la app ofrecerá configurar de nuevo el 2FA con un QR nuevo.

## 6. Arquitectura (referencia rápida)

- `src/lib/supabase.js`: cliente único de Supabase (falla rápido si faltan env vars).
- `src/lib/mfaFlow.js`: lógica pura del flujo (¿enroll o challenge? ¿es AAL2?). Cubierta por `mfaFlow.test.js` (`npm test`).
- `src/LoginScreen.jsx`: tres pasos en una misma pantalla: login → QR enrollment / código de verificación.
- `src/App.jsx`: restaura sesión solo si el nivel de garantía es AAL2 (login + segundo factor verificado) y el logout hace `signOut` real.
