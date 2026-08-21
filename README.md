# Caffe Dell'Agnolo

## Rodar com banco e painel

1. Instale o Node.js 18 ou superior.
2. No terminal, dentro desta pasta, execute `npm install`.
3. Copie `.env.example` para `.env`.
4. O e-mail administrativo padrao e `enzousava@gmail.com`. Altere `ADMIN_PASSWORD` e `SESSION_SECRET` no `.env`; o `ADMIN_EMAIL` so precisa ser alterado se quiser outro administrador.
   - Use uma senha de administrador com pelo menos 12 caracteres.
   - Nunca publique o arquivo `.env`.
5. Execute `npm start`.
6. Abra `http://localhost:3000` para a loja.
7. Abra `http://localhost:3000/admin` para o painel privado.

O banco SQLite e os comprovantes sao criados automaticamente na pasta `data/`. Essa pasta deve ficar fora do controle de versao e precisa entrar no backup da operacao.

O painel possui as abas `Pedidos`, `Financeiro` e `Produtos`. O total bruto soma todos os pedidos; o total liquido exclui pedidos cancelados. A aba de produtos permite adicionar, editar e excluir itens do catalogo.

## Seguranca

- A area administrativa exige login e usa sessao com cookie `httpOnly`.
- As rotas de pedidos, status e comprovantes exigem sessao administrativa.
- O login tem limite de tentativas.
- Comprovantes nao ficam dentro da pasta publica.
- Em producao, use HTTPS e defina `NODE_ENV=production`.
