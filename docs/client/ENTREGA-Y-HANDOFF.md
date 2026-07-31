# Entrega y transferencia — Sistema CRM de OTTO Plumbing Inc.

> **BORRADOR. No es un acta de entrega firmada ni una certificación de
> conformidad.** Este documento describe qué se entrega y qué queda pendiente.
> Nada aquí constituye aceptación hasta que el propietario firme el apartado
> final, y esa firma solo procede cuando la lista de verificación esté completa.

**Fecha del borrador:** 2026-07-30

---

## 1. Qué se entrega

- **Aplicación CRM** instalable en teléfono, funcional sin conexión, bilingüe.
- **Repositorio de código** `ejnburrows-rgb/otto`, con todo el historial.
- **Documentación**: estado real del sistema (`docs/STATUS.md`), decisiones
  técnicas (`docs/DECISIONS.md`), reglas de trabajo (`AGENTS.md`) y estos
  documentos de cliente en español.
- **Pruebas automáticas**: 248 comprobaciones que se ejecutan con un comando.

## 2. Propiedad de los datos

**Los datos del negocio son de OTTO Plumbing Inc.** — clientes, trabajos,
fotos, ubicaciones, horas y nómina.

El propietario puede exportar los **registros** (clientes, trabajos, importes
y demás campos de texto) **sin depender del equipo de desarrollo**: Ajustes →
«Respaldar todo (JSON)». Ese archivo se puede volver a cargar con «Restaurar
respaldo». **Esta ruta fue ensayada de principio a fin para los registros:**
se exportó desde un dispositivo y se restauró en un navegador limpio, y todas
las colecciones regresaron con las mismas cantidades.

**Esto no incluye las fotografías.** Las imágenes se guardan aparte, dentro
del propio dispositivo, y el archivo de exportación no las contiene. Hoy no
existe una forma de respaldar o transferir las fotos fuera del teléfono que
las tomó — véase la limitación 5 más abajo.

## 3. Accesos y credenciales a transferir

Ninguna clave se guarda en el repositorio. La transferencia consiste en pasar
la titularidad de las cuentas.

| Cuenta | Titularidad tras la entrega |
|---|---|
| GitHub (repositorio) | `[PENDIENTE DE CONFIRMACIÓN]` |
| Vercel (alojamiento) | `[PENDIENTE DE CONFIRMACIÓN]` |
| Supabase (base de datos) | `[PENDIENTE DE CONFIRMACIÓN]` |
| Dominio propio, si se contrata | `[PENDIENTE DE CONFIRMACIÓN]` |
| Claves de servicios de IA | `[PENDIENTE DE CONFIRMACIÓN]` |
| Twilio / SendGrid, si se contratan | `[PENDIENTE DE CONFIRMACIÓN]` |

- **Fecha y método de traspaso de credenciales:** `[PENDIENTE DE CONFIRMACIÓN]`
- **Persona que recibe los accesos:** `[PENDIENTE DE CONFIRMACIÓN]`

## 4. Responsabilidades después de la entrega

| Tarea | Responsable |
|---|---|
| Exportar la copia de seguridad y guardarla fuera del dispositivo | `[PENDIENTE DE CONFIRMACIÓN]` |
| Cambiar los códigos de acceso cuando alguien deja el equipo | Propietario |
| Pagar los servicios de alojamiento y terceros | `[PENDIENTE DE CONFIRMACIÓN]` |
| Corregir fallos dentro del periodo de garantía | `[PENDIENTE DE CONFIRMACIÓN]` |
| Cambios nuevos fuera del alcance | `[PENDIENTE DE CONFIRMACIÓN]` |

## 5. Limitaciones conocidas en el momento de la entrega

Se declaran de forma abierta para que la firma no se apoye en una impresión
equivocada.

1. **El inicio de sesión se verifica en el dispositivo, no en un servidor.** Una
   persona con conocimientos técnicos y acceso al dispositivo podría saltarse
   la pantalla de acceso. Como contención, los puntos de acceso del servidor
   están cerrados por defecto y no devuelven datos de clientes. **Una identidad
   real en servidor sigue pendiente.**
2. **Las notificaciones por SMS y correo no envían nada** porque no hay cuentas
   conectadas.
3. **QuickBooks solo exporta**; no hay sincronización en dos direcciones.
4. **Las copias de seguridad de registros viven en el mismo dispositivo que los
   datos, y no incluyen fotografías.** La copia externa es el archivo que el
   propietario descarga y guarda; las fotos no están en ese archivo.
5. **La sincronización en la nube, la subida de fotos y el asistente de IA
   están completamente inactivos hoy, no solo sin probar.** La misma
   contención de seguridad del punto 1 cierra las tres rutas del servidor por
   defecto. El sistema funciona hoy únicamente con los datos guardados en
   cada dispositivo, sin compartirlos entre teléfonos. Nada de esto puede
   probarse con la cuadrilla en campo hasta que exista una identidad real en
   servidor.
6. **Quedan diez registros de demostración** en la base de datos en vivo. La
   causa está corregida y no se repetirá; su eliminación espera la decisión del
   propietario y **no se ha borrado nada**.

## 6. Lista de verificación previa a la firma

La firma del apartado 7 solo procede cuando todo lo siguiente esté marcado.

- [ ] El propietario exportó una copia de seguridad y la guardó fuera del dispositivo
- [ ] El propietario restauró esa copia al menos una vez y comprobó los datos
- [ ] Los códigos de acceso de todo el personal están asignados por el propietario
- [ ] Las cuentas del apartado 3 están a nombre de quien corresponde
- [ ] El propietario leyó y aceptó las limitaciones del apartado 5
- [ ] La política de retención de datos está completada y firmada
- [ ] Se decidió qué hacer con los registros de demostración del punto 5.6
- [ ] El periodo y alcance del soporte están acordados por escrito

## 7. Conformidad

Este documento **no está firmado** y no certifica ninguna entrega.

```
Recibido por OTTO Plumbing Inc.   Nombre: ______________________

                                  Cargo:  ______________________

                                  Firma:  ______________________

                                  Fecha:  ______________________
```
