# Plano — Backend Node (Express) para proteger dados

## Objetivo
Sair do `localStorage.orders` e do envio direto para `formsubmit.co`.
O front envia o pedido para um backend Node que:
- valida os dados
- calcula/valida total
- salva no banco (opcional) ou mantém histórico
- (opcional) envia e-mail

## Por que é mais seguro
- O cliente não controla o que é “total real”
- Validação server-side reduz spam e dados ruins
- Sem depender do `localStorage` para histórico

## Stack proposta (fácil)
- Node.js + Express
- SQLite (simples) ou PostgreSQL (se preferir)
- Zod (validação)
- CORS restrito

## Endpoints
- `POST /api/orders`
  - body: { customer, items, subtotal, cep, shipping, total }
  - server valida e recalcula shipping/total baseado em regras
- `GET /api/orders?deviceId=...`
  - retorna pedidos do dispositivo/usuário

## Segurança (mínimo efetivo)
- Rate limit por IP
- Helmet (headers)
- validação rígida (Zod)
- limitar tamanho dos campos
- gerar `deviceId` no front e mandar (ou login depois)

## Próximos passos
1. Criar estrutura do backend em uma pasta `/backend`
2. Implementar API + validação + persistência
3. Atualizar `script.js` para chamar `/api/orders` e renderizar histórico via API
4. (Opcional) Habilitar HTTPS e rate limit extra no host

