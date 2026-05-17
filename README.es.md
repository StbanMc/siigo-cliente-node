# siigo-cliente-node

> Cliente Node.js minimalista y sin dependencias para la API REST de Siigo.
> Pensado primero en LATAM. ESM. Trae tipos TypeScript.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)
![Cero deps](https://img.shields.io/badge/dependencies-0-brightgreen)

> **Estado: 0.1.0-pre — en progreso.** El transporte HTTP, el proveedor
> de tokens OAuth2 y la fábrica `createClient()` ya están funcionando.
> Los recursos (clientes, facturas, productos, comprobantes, notas
> crédito, pagos, estados de cuenta) llegan en los próximos commits.
> El primer release publicado `0.1.0` va a traer CRUD completo de
> clientes/facturas/productos + CI en Node 18/20/22.

[Read in English](README.md)

---

## Por qué existe

Manejo una empresa colombiana de outsourcing tecnológico que integra
con la API de Siigo en producción todos los días. En el ecosistema
Node no existe un SDK mantenido para Siigo — solo wrappers
abandonados sin tipos, sin pruebas y sin paginación. Estoy publicando
el SDK que uso a diario, reescrito limpio, MIT.

Reglas de diseño:

- **Cero dependencias en runtime.** Validado en CI cada commit.
- **Node ≥ 18.** Usa `fetch` y `AbortController` nativos.
- **ESM.** Stack moderno desde el día uno.
- **Errores tipados.** Atrapas por clase (`SiigoAuthError`, `SiigoRateLimitError`, …), nunca por string.
- **Retry que respeta el protocolo.** Honra `Retry-After`, reintenta `429/502/503/504` con backoff exponencial + jitter.
- **Sin secretos en el código.** Las credenciales las pasa quien llama; el SDK nunca lee `.env` ni `process.env` por su cuenta.

---

## Instalación

```bash
npm install siigo-cliente-node
```

---

## Uso rápido

```js
import { createClient } from 'siigo-cliente-node';

const client = createClient({
  username: process.env.SIIGO_USERNAME,
  accessKey: process.env.SIIGO_ACCESS_KEY,
});

// API de bajo nivel (siempre disponible)
const cliente = await client.api.get('/customers/12345');

// Paginar una colección de forma perezosa
for await (const factura of client.api.paginate('/invoices', {
  params: { created_start: '2026-01-01' },
})) {
  console.log(factura.id, factura.total);
}

// O traerlo todo de un saque
const productos = await client.api.collect('/products', { params: { active: true } });
```

> Los namespaces por recurso (`client.customers.list()`, `client.invoices.create()`, …) llegan en los próximos commits.

---

## Configuración

| Opción           | Default                                       | Para qué                                            |
|------------------|-----------------------------------------------|-----------------------------------------------------|
| `username`       | —                                             | **Obligatorio.** Usuario de la API Siigo.           |
| `accessKey`      | —                                             | **Obligatorio.** Access key de la API Siigo.        |
| `baseUrl`        | `https://api.siigo.com/v1`                    | Cambiarlo si usas sandbox o proxy.                  |
| `authUrl`        | derivado de `baseUrl`                         | Sobrescribir el endpoint `/auth`.                   |
| `partnerId`      | `siigo-cliente-node`                          | Valor del header `Partner-Id`.                      |
| `userAgent`      | `siigo-cliente-node/<version>`                | Valor del header `User-Agent`.                      |
| `timeoutMs`      | `60_000`                                      | Timeout por request.                                |
| `maxRetries`     | `3`                                           | Máximo de reintentos.                               |
| `baseDelayMs`    | `1500`                                        | Base del backoff exponencial.                       |
| `maxDelayMs`     | `30_000`                                      | Tope del backoff.                                   |
| `retryStatuses`  | `[429, 502, 503, 504]`                        | Códigos HTTP que se reintentan.                     |
| `renewMarginMs`  | `300_000`                                     | Renovar el token este tanto antes de expirar.       |
| `fetch`          | `globalThis.fetch`                            | Inyectar un fetch propio (tests, proxies).          |

---

## Tipos de error

```js
import {
  SiigoError,           // clase base
  SiigoAuthError,       // 401 / 403 / falló el handshake de auth
  SiigoRateLimitError,  // 429 con reintentos agotados — trae .retryAfterMs
  SiigoValidationError, // 400 / 422 — trae .errors[]
  SiigoNotFoundError,   // 404
  SiigoNetworkError,    // fallo de fetch / timeout / socket
  SiigoConfigError,     // mal uso de createClient/registerResource
} from 'siigo-cliente-node';
```

---

## Roadmap

- v0.1.x — recursos: customers, invoices, products, vouchers, credit-notes, payments, account-statements
- v0.2.x — verificación de firmas de webhook (cuando Siigo la publique), helpers para batch
- v1.0   — promesa de estabilidad, cobertura completa de cada endpoint documentado

¿Te falta un recurso? Abre un issue.

---

## Licencia

[MIT](LICENSE) © Esteban Esquivel
