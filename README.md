# Caffe Dell'Agnolo

## Rodar o projeto

1. Instale o Node.js 18 ou superior.
2. No terminal, dentro desta pasta, execute `npm install`.
3. Copie `.env.example` para `.env`.
4. Execute `npm start`.
5. Abra `http://localhost:3000` para a loja.

## Funcionalidades

- Loja pública com catálogo e carrinho.
- Cadastro do cliente para pedido.
- Pagamento por Pix.
- Envio de comprovante e confirmação do pedido.
- Banco SQLite gerado automaticamente em `data/`.

## Deploy na Vercel

No projeto da Vercel, configure a variavel `NODE_ENV=production` e faça o deploy normalmente. O projeto exige Node.js 22.5 ou superior.

Para enviar os pedidos por email, configure também `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` e `MAIL_FROM` nas variaveis de ambiente da Vercel. Para o Gmail, use uma senha de app, nao a senha normal da conta. O destinatario padrao e `cafedellagnolo@gmail.com` e pode ser alterado com `ORDER_EMAIL_TO`.
