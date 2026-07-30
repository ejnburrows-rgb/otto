# Progreso y revisión — Sistema CRM de OTTO Plumbing Inc.

> **BORRADOR de seguimiento.** Describe el estado real del sistema, no una
> promesa de entrega. Las fechas y aprobaciones marcadas
> `[PENDIENTE DE CONFIRMACIÓN]` las decide el propietario.
>
> Estado técnico detallado: `docs/STATUS.md` (en inglés). Este documento es el
> resumen en español para el cliente.

**Fecha de esta revisión:** 2026-07-30

---

## 1. Qué funciona hoy, verificado

Cada punto de esta lista fue comprobado ejecutando la aplicación, no solo
leyendo el código.

| Área | Estado |
|---|---|
| Aplicación en vivo | Funciona; se instala en el teléfono y opera sin conexión |
| CRM principal | Clientes, trabajos, llamadas, presupuestos, facturas, pagos, seguimientos, reportes |
| Bilingüe inglés/español | Sin textos faltantes en español |
| Datos sin conexión | Guardados en el dispositivo; la cuadrilla trabaja sin señal |
| Impresión | Facturas y presupuestos salen como documento, no como pantalla |
| Exportación | CSV de todos los registros, incluido el formato de QuickBooks |
| Copia de seguridad y restauración | **Ensayada con éxito**: se exportó una copia y se restauró en un dispositivo limpio; todas las colecciones coincidieron |
| Accesibilidad | Contraste y nombres de controles conformes a WCAG 2.1 AA, verificado con herramienta automática |
| Sincronización de fotos | Las fotos suben a un depósito privado; el acceso anónimo está denegado |

## 2. Qué está a medias, dicho con claridad

- **Notificaciones a clientes (SMS y correo).** El código está terminado, pero
  **no hay cuentas conectadas**, así que no se envía nada. Requiere que el
  propietario contrate los servicios.
- **QuickBooks.** La exportación en un sentido funciona. **La sincronización en
  dos direcciones no existe.**
- **Sincronización en la nube.** Funciona técnicamente, pero todavía no se ha
  probado con 19 teléfonos reales en servicio celular real. Se recomienda una
  semana de uso real antes de confiar plenamente en ella.

## 3. Limitación que el propietario debe conocer

**El inicio de sesión se verifica en el dispositivo, no en un servidor.** Una
persona con conocimientos técnicos y acceso al dispositivo podría saltarse la
pantalla de acceso.

Mientras no exista un sistema de identidad en servidor, los puntos de acceso
que manejan datos reales están **cerrados por defecto**: responden
`server_auth_not_configured` y no devuelven ningún dato de clientes. Es una
contención deliberada, no una solución definitiva.

- **Decisión sobre construir identidad en servidor con permisos por rol:**
  `[PENDIENTE DE CONFIRMACIÓN]`

## 4. Puntos que esperan decisión del propietario

Ninguno de estos avanza sin una respuesta.

1. **Registros de demostración en la base de datos en vivo.** Diez trabajos de
   ejemplo llegaron a la base de datos real porque cada dispositivo nuevo creaba
   datos de prueba y los subía. **La causa ya está corregida**, de modo que no
   se repetirá. Falta decidir si se eliminan los diez registros existentes.
   Los criterios de identificación están en
   `docs/DUPLICATE-DATA-CLEANUP-REPORT.md`. **No se ha borrado nada.**
2. **Cuentas de terceros** para SMS, correo y contabilidad:
   `[PENDIENTE DE CONFIRMACIÓN]`
3. **Política de retención de datos** (GPS, fotos, nómina): el borrador existe y
   espera que el propietario complete y firme los plazos.
4. **Responsable de guardar la exportación fuera del dispositivo:**
   `[PENDIENTE DE CONFIRMACIÓN]`

## 5. Ritmo de revisión

- **Frecuencia de las reuniones de revisión:** `[PENDIENTE DE CONFIRMACIÓN]`
- **Medio de comunicación preferido:** `[PENDIENTE DE CONFIRMACIÓN]`
- **Persona que aprueba cambios en nombre del cliente:** `[PENDIENTE DE CONFIRMACIÓN]`
- **Plazo esperado de respuesta a una consulta:** `[PENDIENTE DE CONFIRMACIÓN]`

## 6. Cómo se prueba cada entrega

Antes de decir que algo está terminado:

1. Se ejecutan las pruebas automáticas y se muestra el resultado real.
2. Los cambios visibles se comprueban abriendo la aplicación de verdad y
   capturando la pantalla.
3. No se declara terminado nada que no se haya podido comprobar.

**Resultado de la última ejecución (2026-07-30):** 248 comprobaciones
automáticas, 0 fallidas; revisión general superada.

## 7. Próximos pasos propuestos

Sujetos a la aprobación del propietario.

1. Resolver las decisiones del apartado 4.
2. Semana de uso real con la cuadrilla para probar la sincronización en campo.
3. Conectar las cuentas de terceros que el negocio necesite el primer día.
4. Evaluar la identidad en servidor.

- **Orden de prioridad acordado:** `[PENDIENTE DE CONFIRMACIÓN]`
- **Fecha de la próxima revisión:** `[PENDIENTE DE CONFIRMACIÓN]`
