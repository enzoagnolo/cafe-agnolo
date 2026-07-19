# Backend Node (Express)

Este backend vai receber pedidos do seu front e salvar em um banco simples, com validação server-side e rate limit.

## Rodar localmente
1. Instalar dependências (precisa rodar `npm install` na pasta `backend`)
2. `npm start`
3. Verificar: `http://localhost:3000/health`

## Configuração
- por enquanto, vamos usar SQLite (arquivo local) para facilitar.

## Endpoints planejados
- `POST /api/orders`
- `GET /api/orders?deviceId=...`

