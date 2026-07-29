# Data Collection & Retention Policy — OTTO Plumbing CRM

> **DRAFT — the owner must review, fill in every [OWNER TO CONFIRM] item, and
> approve this document before it is shared with the crew.** Once approved,
> remove this banner and record the approval date below.
>
> Approved by: ____________  Date: ____________

This document answers, in plain language, what information the OTTO app
collects about the people who use it, where that information goes, who can see
it, and how long it is kept. It exists so that every technician, office staff
member, and owner knows exactly where they stand. La versión en español está
más abajo.

---

## English

### What the app collects

- **Location (GPS) — during jobs only.** Your location is recorded when you
  check in to a job, roughly every 5 minutes while the job is open, and when
  you check out. It is used to calculate time on site and to fill in payroll
  hours automatically.
- **App open and close times**, with location at those moments.
- **Job photos.** Before/after photos you take for a job, stored with that
  job's record.
- **Checklist answers and notes**, including "can't complete" explanations.
- **Sign-in activity.** When you sign in, and wrong-PIN attempts.

### What the app does NOT collect

- **No tracking outside of work.** GPS is not sampled before you check in to a
  job or after you check out. There is no around-the-clock tracking.
- **No access to your personal phone data** — contacts, messages, other apps,
  browsing, or photo library. Only photos you take for a job inside the app.
- **No microphone access** except at the moment you choose to use voice input.
- **Your PIN is never stored as a readable number** — only a scrambled
  fingerprint of it.

### Where the information is stored

- On the device that created it, and in the company's private cloud database
  (Supabase). The cloud database is locked: anonymous access is denied, and
  photos live in a private storage bucket.

### Who can see it

- **Owners** and the **office manager** can see job records, GPS-derived hours,
  photos, checklists, and the KPI dashboard.
- **Technicians** see their own schedule, jobs, and submissions — not other
  workers' data.
- Nothing is sold or shared outside the company. [OWNER TO CONFIRM: any
  exceptions, e.g. accountant or insurance audits]

### How long it is kept

| Data | Proposed retention | Status |
|---|---|---|
| GPS logs | 12 months, then deleted | [OWNER TO CONFIRM] |
| Job photos | Life of the job record + 3 years | [OWNER TO CONFIRM] |
| Checklists & notes | Life of the job record + 3 years | [OWNER TO CONFIRM] |
| Sign-in / audit logs | 24 months | [OWNER TO CONFIRM] |
| Payroll-related records | Per legal requirement (typ. 3+ years, FLSA) | [OWNER TO CONFIRM with accountant] |

### Your rights

- You may ask the office manager to show you the data held about you.
- If something is wrong (for example, GPS hours that don't match reality),
  raise it with the office manager and it will be reviewed and corrected.
- Questions about this policy go to the office manager or an owner.

---

## Español

### Qué recopila la aplicación

- **Ubicación (GPS) — solamente durante los trabajos.** Su ubicación se
  registra cuando marca entrada en un trabajo, aproximadamente cada 5 minutos
  mientras el trabajo está abierto, y cuando marca salida. Se usa para
  calcular el tiempo en el sitio y llenar las horas de nómina automáticamente.
- **Horas de apertura y cierre de la aplicación**, con la ubicación en esos
  momentos.
- **Fotos del trabajo.** Las fotos de antes/después que usted toma para un
  trabajo, guardadas con el registro de ese trabajo.
- **Respuestas de la lista de verificación y notas**, incluidas las
  explicaciones de "no se pudo completar".
- **Actividad de inicio de sesión.** Cuándo inicia sesión e intentos de PIN
  incorrecto.

### Qué NO recopila la aplicación

- **No hay rastreo fuera del trabajo.** El GPS no se registra antes de marcar
  entrada en un trabajo ni después de marcar salida. No existe rastreo las 24
  horas.
- **Sin acceso a los datos personales de su teléfono** — contactos, mensajes,
  otras aplicaciones, navegación o galería de fotos. Solo las fotos que usted
  toma para un trabajo dentro de la aplicación.
- **Sin acceso al micrófono**, excepto en el momento en que usted decide usar
  la entrada por voz.
- **Su PIN nunca se guarda como un número legible** — solo una huella cifrada.

### Dónde se guarda la información

- En el dispositivo que la creó y en la base de datos privada de la empresa en
  la nube (Supabase). La base de datos está bloqueada: el acceso anónimo se
  rechaza y las fotos viven en un depósito de almacenamiento privado.

### Quién puede verla

- **Los dueños** y la **gerente de oficina** pueden ver los registros de
  trabajos, las horas derivadas del GPS, las fotos, las listas de verificación
  y el panel de indicadores.
- **Los técnicos** ven su propio horario, sus trabajos y sus envíos — no los
  datos de otros trabajadores.
- Nada se vende ni se comparte fuera de la empresa. [PENDIENTE DE CONFIRMAR
  POR EL DUEÑO: excepciones, p. ej. contador o auditorías de seguro]

### Cuánto tiempo se conserva

| Datos | Retención propuesta | Estado |
|---|---|---|
| Registros de GPS | 12 meses, luego se eliminan | [PENDIENTE DE CONFIRMAR] |
| Fotos de trabajos | Vida del registro del trabajo + 3 años | [PENDIENTE DE CONFIRMAR] |
| Listas y notas | Vida del registro del trabajo + 3 años | [PENDIENTE DE CONFIRMAR] |
| Registros de inicio de sesión / auditoría | 24 meses | [PENDIENTE DE CONFIRMAR] |
| Registros de nómina | Según requisito legal (típ. 3+ años, FLSA) | [PENDIENTE DE CONFIRMAR con el contador] |

### Sus derechos

- Puede pedir a la gerente de oficina que le muestre los datos que se guardan
  sobre usted.
- Si algo está mal (por ejemplo, horas de GPS que no coinciden con la
  realidad), plantéelo a la gerente de oficina y se revisará y corregirá.
- Las preguntas sobre esta política se dirigen a la gerente de oficina o a un
  dueño.
