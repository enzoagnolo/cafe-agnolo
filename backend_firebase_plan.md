# Plano — Backend Firebase (mais simples e efetivo)

## Objetivo
Remover dependência de `localStorage.orders`/`formsubmit.co` e passar a:
- salvar pedidos em Firestore (ou Realtime DB)
- listar pedidos no perfil consultando o backend
- proteger dados com validação e regras de acesso

## Decisões
- Usar **Firestore** (mais comum para web apps).
- Autenticação:
  - **Opção 1 (mais fácil):** pedidos por dispositivo anônimo com um `deviceId` + regra de segurança usando esse id.
  - **Opção 2 (mais efetiva):** Firebase Auth (telefone/e-mail) e regras por `uid`.

Como você pediu “mais fácil e efetivo”, vou começar com:
- **Firebase Auth opcional:** sem login (pedidos por `deviceId`) na 1ª versão
- depois evoluir para Auth se você quiser.

## Endpoints (na prática)
Como é front-only, vamos usar:
- Chamadas diretas ao Firebase SDK (client-side) para ler/escrever.
- Regras do Firestore + validação no Security Rules.
- (Opcional) Cloud Functions para validação mais pesada / anti-spam.

## Passos de implementação
1. Criar projeto no Firebase Console
2. Adicionar Web App e obter:
   - apiKey, authDomain, projectId, etc.
3. Instalar SDK no projeto (via script tags ou npm)
4. Implementar:
   - `createOrder` quando checkout finalizar
   - `fetchOrders` para renderizar `#orderHistory`
5. Atualizar `script.js` para usar Firebase ao invés de `localStorage.orders`
6. Configurar Firestore Rules para evitar acesso indevido
7. (Opcional) Cloud Functions para validações e rate limiting

## O que eu preciso de você (mínimo)
- se você prefere começar com pedidos por dispositivo anônimo (deviceId) ou com login.

Se você não quiser login: uso `deviceId` gerado no browser e salvo em localStorage; as regras permitem leitura/escrita apenas daquele deviceId.

