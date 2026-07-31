# Borrador de contrato — Sistema CRM de OTTO Plumbing Inc.

> **BORRADOR. No es un contrato firmado ni un acuerdo aprobado.**
> Ningún término de este documento tiene efecto hasta que el propietario lo
> revise, complete cada punto marcado `[PENDIENTE DE CONFIRMACIÓN]` y lo firme.
> Los apartados legales y económicos deben ser revisados por un profesional
> antes de la firma; este borrador no constituye asesoría legal.

- **Cliente:** OTTO Plumbing Inc. — Sur de la Florida
- **Licencia del negocio:** #CFC1429613
- **Teléfono:** (786) 344-2837
- **Proyecto:** aplicación CRM móvil bilingüe para trabajo de campo
- **Repositorio:** `ejnburrows-rgb/otto`
- **Fecha del borrador:** 2026-07-30
- **Razón social y domicilio legal para el contrato:** `[PENDIENTE DE CONFIRMACIÓN]`

---

## 1. Alcance

El sistema es una aplicación web instalable (PWA) que funciona sin conexión y
guarda los datos en el propio dispositivo, con sincronización opcional a una
base de datos en la nube.

**Incluido y en funcionamiento hoy:**

- Clientes, trabajos, llamadas, notas, presupuestos, facturas, pagos, cheques,
  seguimientos, flujos de trabajo, base de conocimiento y reportes.
- Funcionamiento sin conexión con almacenamiento local en el dispositivo.
- Interfaz completa en inglés y español.
- Impresión de facturas y presupuestos en formato de documento.
- Exportación CSV de todos los registros, incluido el formato de QuickBooks.
- Copias de seguridad locales con verificación y restauración probada.

**Fuera del alcance salvo acuerdo por escrito:** `[PENDIENTE DE CONFIRMACIÓN]`
(por ejemplo: contabilidad en dos direcciones, facturación en línea, portal
para clientes, aplicaciones nativas para tiendas de aplicaciones).

## 2. Propiedad de los datos y del trabajo

- **Todos los datos del negocio pertenecen a OTTO Plumbing Inc.** Esto incluye
  clientes, trabajos, fotos, registros de ubicación, horas y nómina.
- El propietario puede exportar la totalidad de los datos en cualquier momento
  desde la pantalla de Ajustes, sin depender del equipo de desarrollo.
- **Propiedad del código fuente al finalizar el proyecto:**
  `[PENDIENTE DE CONFIRMACIÓN]`
- **Licencia de uso de componentes de terceros:** `[PENDIENTE DE CONFIRMACIÓN]`

## 3. Roles y accesos

El sistema define cuatro roles: `owner` (dueño), `office` (oficina), `field`
(campo) y `accounting` (contabilidad). Cada persona entra con un código de
cuatro dígitos que el dueño asigna desde la pantalla de Equipo.

**Limitación importante, declarada de forma abierta:** hoy la verificación del
código ocurre **en el navegador del dispositivo**, no en un servidor. Esto
significa que una persona con conocimientos técnicos y acceso al dispositivo
podría saltarse la pantalla de inicio de sesión. Los códigos se guardan
cifrados y hay bloqueo tras cinco intentos fallidos, pero **esto no equivale a
un sistema de identidad con verificación en servidor.**

Como medida de contención, los puntos de acceso del servidor que manejan datos
reales están cerrados por defecto y responden `server_auth_not_configured`
hasta que exista un sistema de identidad real.

- **Decisión sobre implementar identidad y sesión en servidor con permisos por
  rol, y quién asume ese costo:** `[PENDIENTE DE CONFIRMACIÓN]`

## 4. Datos en el dispositivo y datos en la nube

- Los datos viven primero en el dispositivo, para que la cuadrilla pueda
  trabajar sin señal.
- La sincronización a la nube (Supabase) existe en el código y la base de
  datos está configurada. **Hoy no está en uso:** todas las rutas del
  servidor que tocan datos reales están cerradas por defecto (véase el
  apartado 3) hasta que exista una identidad real en servidor, así que
  `/api/data` rechaza toda solicitud, autenticada o no, con
  `server_auth_not_configured`. **En la práctica, el sistema funciona hoy
  solo con almacenamiento local en cada dispositivo — no hay sincronización
  entre teléfonos.**
- Una solicitud anónima a la base de datos es rechazada; esto está verificado.
- **Región de alojamiento de los datos y requisitos de residencia:**
  `[PENDIENTE DE CONFIRMACIÓN]`

## 5. Copias de seguridad y responsabilidad de conservación

- El sistema genera copias locales con verificación de integridad, y la
  restauración fue ensayada con éxito en un dispositivo limpio.
- **Las copias locales viven en el mismo dispositivo que los datos.** La única
  copia realmente externa es el archivo de exportación que el propietario
  descarga.
- **Esa exportación no incluye las fotografías.** El archivo contiene los
  registros (clientes, trabajos, importes, etc.); las imágenes se guardan
  aparte, dentro del propio dispositivo, y la exportación actual no las
  copia. Si el dispositivo se pierde o se restablece sin haber subido antes
  las fotos a la nube, **esas imágenes no son recuperables** con el proceso
  de respaldo actual.
- **Responsable de guardar la exportación periódica fuera del dispositivo:**
  `[PENDIENTE DE CONFIRMACIÓN]`
- **Frecuencia acordada de exportación:** `[PENDIENTE DE CONFIRMACIÓN]`
- **Periodo de conservación de cada tipo de dato:** `[PENDIENTE DE CONFIRMACIÓN]`
  (véase también el documento de política de retención, que sigue en borrador).

## 6. GPS, fotos y nómina

- **GPS:** se registra únicamente durante el trabajo, entre la entrada y la
  salida de un trabajo asignado. No hay seguimiento fuera del horario laboral.
- **Fotos:** se toman en el trabajo y se guardan en el dispositivo. El código
  para subirlas a un depósito privado en la nube existe, pero **hoy no sube
  nada** — la misma ruta cerrada del apartado 4 rechaza la subida. Las fotos
  quedan únicamente en el teléfono que las tomó hasta que exista una
  identidad real en servidor.
- **Nómina:** las horas se calculan a partir de las entradas y salidas
  registradas. Los cálculos son una ayuda administrativa y **no sustituyen la
  revisión de un contador.**
- **Aviso y consentimiento del personal sobre GPS y fotos:** la pantalla de
  consentimiento existe en la aplicación; el texto legal que la respalda sigue
  `[PENDIENTE DE CONFIRMACIÓN]`.
- **Conservación de registros de nómina según requisitos legales (FLSA u
  otros):** `[PENDIENTE DE CONFIRMACIÓN — confirmar con el contador]`

## 7. Integraciones con terceros

| Integración | Estado real hoy |
|---|---|
| Notificaciones por SMS (Twilio) | Código listo; **sin cuenta conectada**, no envía nada |
| Notificaciones por correo (SendGrid) | Código listo; **sin cuenta conectada**, no envía nada |
| QuickBooks | Exportación CSV en un sentido funciona; **la sincronización en dos direcciones no existe** |
| Asistente de IA | Código completo con claves guardadas en el servidor, pero **deshabilitado hoy**: la misma ruta cerrada del apartado 3 rechaza toda solicitud hasta que exista una identidad real en servidor |

**Nota que afecta a toda esta tabla y al apartado 4:** la medida de
contención descrita en el apartado 3 (rutas del servidor cerradas por
defecto) significa que, en este momento, **ninguna función que dependa del
servidor funciona**: ni la sincronización en la nube, ni la subida de fotos,
ni el asistente de IA. El sistema opera hoy exclusivamente con los datos
guardados en cada dispositivo. Esto es deliberado — es la contención de
seguridad del apartado 3, no un error — y se revierte en cuanto exista una
identidad real en servidor.

- **Quién contrata y paga cada servicio de terceros:** `[PENDIENTE DE CONFIRMACIÓN]`
- **Costos recurrentes esperados:** `[PENDIENTE DE CONFIRMACIÓN]`

## 8. Plazos, precio y pagos

- **Cronograma y fechas de entrega:** `[PENDIENTE DE CONFIRMACIÓN]`
- **Precio total:** `[PENDIENTE DE CONFIRMACIÓN]`
- **Calendario de pagos:** `[PENDIENTE DE CONFIRMACIÓN]`
- **Costo del trabajo fuera del alcance:** `[PENDIENTE DE CONFIRMACIÓN]`

## 9. Revisión, aceptación y soporte

- **Criterio de aceptación de cada entrega:** `[PENDIENTE DE CONFIRMACIÓN]`
- **Periodo de garantía o corrección de fallos sin costo:** `[PENDIENTE DE CONFIRMACIÓN]`
- **Alcance y horario del soporte posterior:** `[PENDIENTE DE CONFIRMACIÓN]`
- **Persona de contacto del cliente para aprobaciones:** `[PENDIENTE DE CONFIRMACIÓN]`

## 10. Confidencialidad y protección de datos

- Los datos de clientes de OTTO no se comparten ni se venden a terceros.
- Ninguna clave o contraseña se guarda en el repositorio de código.
- **Cláusula de confidencialidad y sus plazos:** `[PENDIENTE DE CONFIRMACIÓN]`
- **Procedimiento de notificación en caso de incidente de seguridad:**
  `[PENDIENTE DE CONFIRMACIÓN]`

---

## Firma

Este documento **no está firmado**. Las líneas siguientes se completan
únicamente cuando el propietario haya revisado y aceptado todos los puntos
anteriores.

```
Por OTTO Plumbing Inc.        Nombre: ______________________

                              Cargo:  ______________________

                              Firma:  ______________________

                              Fecha:  ______________________
```
