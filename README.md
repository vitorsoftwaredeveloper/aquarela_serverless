# Aquarela Kids — Serverless

Back-end da plataforma de gestão da Aquarela Kids: API HTTP, regra de negócio e
acesso ao banco. Roda em AWS Lambda atrás de um HTTP API Gateway, com
autorização JWT do Cognito. Consumido pelo
[aquarela_app](https://github.com/vitorsoftwaredeveloper/aquarela_app).

## Stack

- **Node.js 24** + TypeScript, empacotado por **esbuild** (uma função por bundle)
- **Serverless Framework 3** (fork [`osls`](https://github.com/oss-serverless/serverless))
- **AWS**: Lambda, HTTP API, S3, SSM Parameter Store, Cognito
- **MongoDB** + Mongoose (replicaSet obrigatório — há transações)
- **Ajv** para validação de payload
- **Mercado Pago** (Pix) e **firebase-admin** (push)
- **Jest** + ts-jest

## Arquitetura

```
src/
  handlers/      um diretório por domínio, cada um com functions.yml + handlers
  middlewares/   auth, roleGuard, validate, errorHandler
  repositories/  acesso ao Mongo (+ transforms de criptografia)
  models/        schemas Mongoose
  schemas/       schemas Ajv de request
  libs/          cognito, crypto, firebase, mercadopago, mongo, s3, ssm
scripts/migrations/
config/          <stage>.json — variáveis por ambiente
```

São 20 domínios (`usuarios`, `criancas`, `turmas`, `agendas`, `mensalidades`,
`pagamentos`, `financeiro`, `planosAula`, `mensagens`, `eventos`, `relatorios`,
`webhooks`, ...) e 73 rotas, todas sob o prefixo `/v1`.

Cada função declara suas rotas e IAM no `functions.yml` do próprio domínio; o
`serverless.yml` só agrega. IAM é por função
(`serverless-iam-roles-per-function`) — permissão de S3 e da `encryption_key` é
concedida apenas a quem precisa.

### Autorização

O HTTP API usa um JWT authorizer apontado para o User Pool do Cognito. O
`audience` é o Client ID, resolvido em **deploy time** — trocar o client exige
redeploy.

O middleware `auth` lê `cognito:groups` da claim. Usuário sem grupo faz
`getAuthClaims` retornar `null` e a API responde `401 Token ausente ou inválido`
— a mensagem engana, o token está válido, falta o grupo. `requireRole` (em
`middlewares/roleGuard.ts`) restringe cada rota a `admin`, `professor` ou
`responsavel`; ownership fina — professor só na própria turma, responsável só no
próprio filho — fica no service, que recebe `auth` já resolvido.

### Dados sensíveis

Campos como CPF e informações de saúde são criptografados nos `transforms` do
repositório com a `encryption_key` guardada em SSM SecureString. Trocar a chave
torna os dados existentes ilegíveis.

### Fotos e anexos

Bucket S3 privado (acesso público bloqueado, SSE-AES256, TLS obrigatório por
bucket policy), acessado por URLs pré-assinadas. Uploads incompletos são
abortados após 1 dia.

## Configuração por ambiente

`config/<stage>.json` define as variáveis do stage. Valores que não são segredo
(região, URLs) ficam literais; segredos são **nomes de parâmetro SSM** resolvidos
em runtime:

| Parâmetro SSM | Uso |
| --- | --- |
| `/aquarela_serverless/<stage>/db` | connection string do Mongo |
| `/aquarela_serverless/<stage>/encryption_key` | chave de criptografia (hex, 64 chars) |
| `/aquarela_serverless/<stage>/mercadopago_access_token` | Mercado Pago |
| `/aquarela_serverless/<stage>/mercadopago_webhook_secret` | validação do webhook |
| `/aquarela_serverless/<stage>/firebase_service_account` | service account do FCM |

Como são lidos em runtime, atualizar o parâmetro basta — sem redeploy. Já
`COGNITO_URL`, `CLIENT_ID` e `USER_POOL_ID` são resolvidos em deploy time.

No stage `dev` os caminhos não têm o segmento de stage
(`/aquarela_serverless/db`), e o Mongo aponta para o container local.

Nenhum segredo vive no repositório. O service account do Firebase
(`aquarela-kids-notification.json`) é local e está no `.gitignore`.

## Desenvolvimento local

Precisa de Docker (Mongo com replicaSet) e das credenciais AWS configuradas.

```bash
npm install
docker compose up -d
```

Inicialize o replica set na primeira vez:

```bash
docker exec -it aquarela_mongo_local mongosh --eval "rs.initiate()"
```

Suba a API:

```bash
npm run dev
```

`nodemon` roda `serverless offline --config serverless.local.yml`, que usa o
Mongo local e uma chave de criptografia descartável.

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | API local com `serverless-offline` |
| `npm test` | Jest com cobertura |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run deploy:dev` | Deploy do stage `dev` |
| `npm run deploy:staging` | Deploy do stage `staging` |
| `npm run deploy:prod` | Deploy do stage `prod` |
| `npm run remove:staging` | Remove o stack de `staging` |
| `npm run remove:prod` | Remove o stack de `prod` |
| `npm run migrate <script>` | Roda uma migração de `scripts/migrations/` |

## Deploy

```bash
npm run deploy:prod
```

Cria/atualiza o stack CloudFormation `aquarela-serverless-<stage>`, incluindo o
bucket de fotos. `serverless-prune-plugin` mantém apenas as 3 últimas versões de
cada função. O stage tem throttling de 25 req/s (burst 50).

## Documentação

`docs/` traz o detalhamento do produto e da implementação:

| Arquivo | Conteúdo |
| --- | --- |
| `00-Visao-Produto-PRD.md` | visão de produto |
| `01-Design-UX.md` | design e UX |
| `02-Frontend.md` | front-end |
| `03-Backend.md` | back-end |
| `04-Banco-de-Dados.md` | modelagem de dados |
| `05-Sugestoes-Produto.md` | sugestões de produto |
| `06-Backlog.md` | backlog |
