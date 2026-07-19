# Notas de segurança — Firestore

## Riscos atuais
- `localStorage` é controlável pelo usuário.
- `innerHTML` com dados de localStorage pode causar XSS.

## Com Firebase
- Security Rules são a camada principal para impedir acesso indevido.
- Mesmo com regras, **o cliente pode tentar escrever dados falsos**; então:
  - validar campos no backend (Cloud Functions) é o mais efetivo
  - ou restringir formato/valores básicos nas Security Rules

## Política recomendada
- Coleção: `orders`
  - documento com id único
  - campos: deviceId, customer (opcional), items, total, createdAt

- Security Rules:
  - Só permitir `create` se `resource.data.deviceId == request.auth.uid` (se Auth)
  - ou `deviceId` igual ao deviceId persistido (se anônimo)
  - Só permitir leitura se pertence ao deviceId

## Rate limiting
- Ideal via Cloud Functions (ou reCAPTCHA / App Check).


