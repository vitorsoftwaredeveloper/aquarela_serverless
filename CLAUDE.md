# CLAUDE.md — Aquarela Kids · Back-end (`aquarela_serverless`)

> Contexto para agentes de IA e devs. Leia antes de codar. Fonte da verdade detalhada: pasta [`docs/`](./docs).

## 0. Modo de resposta

Toda resposta neste repo usa o modo caveman (skill `/caveman`, nível `ultra`) por padrão, sem precisar invocar manualmente a cada comando.

---

## 1. O que é o Aquarela Kids

Sistema de gestão para **berçário e hotelzinho infantil** (crianças de 1 a 8 anos). Três públicos:

- **Administração** — cadastros, financeiro (balanço mensal/anual, despesas, inadimplência), relatórios, simulador de preços, gestão de usuários.
- **Professores** — registram a **agenda diária** de cada criança (alimentação, sono, atividades, medicação, intercorrências), gerenciam turmas/alunos e planos de aula.
- **Pais/responsáveis** — leem a agenda/histórico do filho e **pagam a mensalidade via PIX** (meses pagos × em aberto).

Simulador **público** de mensalidade para interessados (sem login).

> A **criança não é usuário** — é a entidade acompanhada. Usuários = `admin`, `professor`, `responsavel` (+ visitante público).

## 2. Papel deste repositório

`aquarela_serverless` é o **back-end serverless**: a API que serve o front `aquarela_app` e detém **toda a regra de negócio e o acesso ao banco**.

- Front-end: `https://github.com/vitorsoftwaredeveloper/aquarela_app`
- Este repo é a **fonte da verdade** para autorização, validação, cálculos financeiros e persistência.

## 3. Stack

| Item           | Escolha                                                                     |
| -------------- | --------------------------------------------------------------------------- |
| Runtime        | Node.js 24.x · TypeScript                                                   |
| Framework      | Serverless Framework v3 (fork `osls`/`oss-serverless`)                      |
| Compute        | AWS Lambda (`individually` + `serverless-esbuild`)                          |
| API            | API Gateway **HTTP API** (`httpApi`)                                        |
| Banco          | **MongoDB** via **Mongoose** (não DynamoDB)                                 |
| Auth           | AWS Cognito (JWT authorizer nativo do HTTP API)                             |
| Validação      | `ajv` (`JSONSchemaType`) + `ajv-formats`                                    |
| Storage        | S3 (fotos de criança, comprovantes/recibos)                                 |
| Config/Secrets | SSM Parameter Store (`config/<stage>.json`)                                 |
| Pagamentos     | MercadoPago (PIX)                                                           |
| Push           | Firebase Admin — **fase 2+**                                                |
| Plugins SLS    | `serverless-esbuild`, `serverless-prune-plugin`, `serverless-offline`, `serverless-iam-roles-per-function` |
| Testes         | Jest + ts-jest                                                              |
| Dev local      | `nodemon` + `serverless-offline` + MongoDB (docker-compose, **replicaSet**) |

> ⚠️ O template de origem trazia itens de outro projeto (TTS de liturgia, módulo de dízimo) que **NÃO** se aplicam ao Aquarela Kids. Reaproveitamos só o MercadoPago/PIX para as mensalidades. Ignore qualquer resquício desses módulos.

## 4. Arquitetura & estrutura — alvo

```
Cliente → API Gateway HTTP API → JWT Authorizer (Cognito) → Lambda
  handler → validação (ajv) → service (regra) → repository (Mongoose)
       ↘ MongoDB · S3 · SSM · MercadoPago (+ webhook de confirmação)
```

```
src/
├─ handlers/     # 1 entrypoint Lambda por rota (criancas, turmas, agenda, financeiro, pagamentos…)
├─ services/     # regra de negócio
├─ repositories/ # acesso a dados (Mongoose)
├─ models/       # schemas Mongoose
├─ schemas/      # JSONSchemaType (ajv) por payload
├─ middlewares/  # auth, roleGuard, errorHandler
├─ libs/         # mongo.ts, s3.ts, ssm.ts, mercadopago.ts, crypto.ts
└─ utils/ types/
serverless.ts · config/<stage>.json
```

Conexão MongoDB em Lambda: **reutilizar** a conexão entre invocações e `context.callbackWaitsForEmptyEventLoop = false`.

Detalhes: [`docs/03-Backend.md`](./docs/03-Backend.md).

## 5. Domínio e regras críticas

- **RBAC:** grupos Cognito `admin` / `professor` / `responsavel`. `roleGuard` lê `cognito:groups`.
- **Autorização de dado (ownership) — obrigatória no service:** `responsavel` só acessa recursos das crianças vinculadas a ele; `professor` só das turmas que leciona. Nunca confiar no cliente.
- **Validação:** todo payload de entrada passa por `ajv` antes do service.
- **Erros padronizados:** `{ error: { code, message, details? } }` com HTTP status correto (400/401/403/404/409/422/500).
- **Balanço e relatório anual usam a mesma agregação** (`agregarMesesDoAno`, `src/services/financeiro/mesesDoAno.ts`) — `balanco.meses[].entradas` é o mesmo número que `relatorio-anual.meses[].pagamentos`. Ambos leem o snapshot de `relatoriosAnuais` quando o ano já foi expurgado (`getMesesDoAno`), senão o gráfico do dashboard — que navega até 2020 — mostraria zero para todo ano antigo. Rotas separadas de propósito: o dashboard não precisa da grade por criança.
- **Financeiro:** geração de `mensalidades` por criança/competência a partir de `configPrecos`/`crianca.financeiro`. Baixa via **webhook** MercadoPago, **idempotente** (`txid`/`payment_id`), sem dupla baixa. Recibo → S3. **Estorno:** quando o MercadoPago reporta `status: refunded`, o `pagamento` é removido do banco e a `mensalidade` vinculada volta para `aberto` (perde o `pagamentoId`) — ver `src/services/webhooks/processarWebhookMercadoPago.ts`.
- **Transações** (replicaSet) ao gerar mensalidade + baixar pagamento.
- **Hard delete** em todas as entidades — não existe soft delete/`ativo` no sistema. `DELETE` remove o registro em definitivo (crianças e usuários removem em cadeia o que só pertence a eles); `turmas` bloqueia a remoção enquanto houver crianças vinculadas. **`DELETE /criancas/{id}` também apaga o usuário responsável que fica sem nenhuma criança vinculada** (Cognito + banco, via `removeUsuarioService`) — só para `papel: "responsavel"`, nunca para conta `admin`/`professor` reaproveitada por e-mail (`ensureResponsavelUsuario`). Ver `src/services/criancas/removeCrianca.ts`.
- **Expurgo anual (`limparDadosAnoAnterior`, `src/handlers/manutencao/`, cron 1º/jan):** apaga `agendasDiarias`, `mensagens` e `pagamentos` anteriores ao ano corrente, de todas as crianças, junto com os anexos no S3. **Pagamento sai por `pagoEm` + `status: "pago"`, nunca por `createdAt`** — mesmo critério da consolidação, senão o PIX gerado em dezembro e baixado em janeiro sumiria do caixa do ano novo sem estar em nenhum fechamento. **Divide o horário com `gerarMensalidadesAno`** (mesmo `cron(0 3 1 1 ? *)`): convivem porque `mensalidades` está fora do expurgo — não inclua essa coleção no `deleteMany`. **Ordem é regra, não detalhe:** o fechamento do ano vai para `relatoriosAnuais` (`gerarRelatorioAnualService`) e os anexos são lidos **antes** do `deleteMany` — invertido, o fechamento sai zerado e os objetos ficam órfãos no bucket. Cadastro (`criancas`), `mensalidades` e `despesas` não são tocados. Depois da virada, `relatoriosAnuais` é a única fonte do histórico financeiro do ano — é por isso que `GET /financeiro/relatorio-anual` prefere o snapshot ao cálculo ao vivo.
- **LGPD/segurança:** dados de saúde de crianças. IAM por Lambda (menor privilégio); segredos só em SSM; webhook com assinatura verificada; logs sem PII; auditoria em edição de criança e baixas financeiras. **Criptografia em repouso:** `criancas.cpf`, `criancas.responsaveis[].cpf` e `criancas.saude.*` são cifrados (AES-256-GCM) antes de gravar e decifrados só na leitura — ver `src/libs/crypto.ts` e `src/repositories/transforms/criancaCrypto.ts`. Como o IV é aleatório por gravação, a unicidade do CPF não pode mais usar índice direto: `criancas.cpfHash` (HMAC determinístico, mesma chave) carrega o índice único no lugar de `cpf`.
- **Foto da criança:** bucket S3 privado provisionado pelo próprio `serverless.yml` (`FotosBucket`, sem acesso público, SSE-AES256, TLS obrigatório). O Mongo guarda só a **key** (`criancas.foto`); a imagem chega em base64 no corpo de `POST /criancas`/`PUT /criancas/{id}` (teto 2MB decodificados — payload de Lambda é 6MB e base64 infla 33%), com checagem de magic bytes contra o `contentType` declarado, e é lida por URL pré-assinada de 1h (`fotoUrl`). Nada de URL permanente. Ver `src/libs/s3.ts` e `src/services/shared/fotoCrianca.ts`.
- **Edição por responsável:** `PUT /criancas/{id}` aceita `admin` e `responsavel`. O responsável só edita o próprio filho e nunca `financeiro` (senão baixaria a própria mensalidade) — `CAMPOS_EXCLUSIVOS_ADMIN` em `src/services/shared/criancaAccess.ts`. Turma, remoção e `DELETE .../foto` seguem admin-only.
- **Edição por professor:** `PUT /professores/{id}` aceita `admin` e `professor`. O professor só edita o próprio cadastro e nunca `email` (é o username no Cognito, vinculado ao `usuarios` criado pelo admin) — `CAMPOS_EXCLUSIVOS_ADMIN` em `src/services/shared/professorAccess.ts`. Criação e remoção seguem admin-only.
- **Consentimento LGPD (QA-03):** `POST /criancas` exige `consentimentoLgpd: boolean` — `false`/ausente é `422 CONSENTIMENTO_LGPD_OBRIGATORIO`. O backend grava `criancas.consentimentoLgpd = { aceito: true, aceitoEm }` com timestamp do próprio servidor (nunca do payload). Campo fora de `IUpdateCriancaPayload`: imutável após o cadastro.

### 5.1 Lote de 01/08/2026 — Épicos J, K, L, N ✅ concluídos · M pendente

14 pedidos da operação viraram os épicos **J** (cobrança/inadimplência, ✅),
**K** (recados com anexo, ✅), **L** (agenda v2, ✅ — MVP fechado, AG2-09 adiado
por decisão do usuário), **M** (mural de fotos — back-end ✅ 02/08/2026, front
pendente, FOT-06/07 em `aquarela_app`) e **N** (ajustes, ✅ — OPS-01…OPS-05
concluídos em 02/08/2026).
Contrato em [`docs/03-Backend.md`](./docs/03-Backend.md), modelo em
[`docs/04-Banco-de-Dados.md`](./docs/04-Banco-de-Dados.md), tarefas e AC em
[`docs/06-Backlog.md`](./docs/06-Backlog.md). As decisões que mudam código já
existente:

- **✅ `409 AGENDA_JA_ENVIADA` saiu do contrato** (AG2-01, implementado).
  `POST /agenda/{id}/enviar` renotifica em **toda edição** ("agenda
  atualizada"), com **debounce de 10 min** por agenda
  (`src/services/agendas/enviarAgenda.ts`). `enviadaEm` continua sendo o 1º
  envio; `ultimoEnvioEm`/`enviosCount` sustentam o reenvio. Resposta passa a
  incluir `{ notificado, motivo? }`. Front (`RegistrarAgendaScreen`) não
  precisou de mudança — já era fire-and-forget sem tratar `409`.
- **✅ Furo de segurança em `PUT /criancas/{id}` corrigido** (OPS-01):
  `CAMPOS_EXCLUSIVOS_ADMIN = ["financeiro"]` deixava o array `responsaveis`
  passar livre, então um responsável conseguia adicionar alguém com
  `podeRetirar: true`. Agora, via `assertMutacaoResponsaveis`
  (`src/services/shared/criancaAccess.ts`): responsável **não adiciona
  ninguém novo à lista** — só admin (`403 RESPONSAVEL_EXCLUSIVO_ADMIN`) — e
  não altera `podeRetirar`/`usuarioId` de quem já está lá (`403
  PODE_RETIRAR_EXCLUSIVO_ADMIN`). Comparação banco × payload casa por CPF
  normalizado/`usuarioId` — **nunca por índice do array**, senão reordenar
  vira bypass. Front (`EditarCriancaScreen`) trava o toggle com `disabled` e
  removeu o botão "Adicionar responsável".
- **✅ `GET /financeiro/balanco` vira regime de caixa** (OPS-02): agrega
  `pagamentos` por `pagoEm` (fuso `America/Sao_Paulo`), não `mensalidades` por
  competência — `src/services/financeiro/getBalanco.ts` +
  `src/utils/date.ts` (`inicioMesBrasil`). Corrigido junto o `$month` UTC das
  despesas e a janela em `Date.UTC`. Era o que fazia um pagamento de 31/07
  aparecer só em agosto. Rótulo do card no `aquarela_app` ("Entradas — regime
  de caixa") segue pendente, é front.
- **⚠️ `turmas.professorId` → `professorIds: [ObjectId]`** (OPS-03): todo
  ownership por turma vira `includes` (`agendaAccess`, `listTurmas`,
  `listCriancasDaTurma`, `planosAula`, escopo de `avisos`). `planosAula.professorId`
  passa a significar **autor**, não "professor da turma".
- **Inadimplência ≠ atraso** (COB-06/07): `configPrecos.inadimplencia
  { diaCorte: 10, mesesCarencia: 1 }` + cron `marcarInadimplentes` gravando
  `mensalidades.inadimplenteDesde`. `GET /financeiro/inadimplentes` deixa de
  filtrar por `status: "atrasado"`.
- **Anexo grande sobe direto ao S3** (MSG-01): `POST /anexos/upload-url` (presigned
  PUT de 5 min, 10MB, whitelist de tipo) para recado/agenda/mural, validado por
  `HeadObject` no vínculo. A **foto de criança e de professor continua em base64**
  no corpo — dois mecanismos, não um substituindo o outro.
- **Crons novos:** `dispararCobrancas` (dias 05 e 20, 09:00 GMT-3) ·
  `marcarInadimplentes` (diário 00:05 GMT-3) · `notificarAniversariantes`
  (diário 08:00 GMT-3) · `limparAnexosOrfaos` (diário).
- **✅ Mural de fotos** (FOT-01…05, 08): `/eventos` (CRUD + escopo por papel,
  igual `/avisos`), `POST /eventos/{id}/fotos` (reaproveita
  `validarAnexosVinculados("mural", ...)`), `POST /eventos/{id}/publicar`
  (idempotente via `publicadoEm`, mesmo padrão binário do envio de agenda,
  sem debounce). **Decisão de produto: sem marcação de criança por foto** —
  `fotos[].criancasIds` não existe, `criancas.consentimentoImagem` é só
  registro (opcional, revogável via `PUT /criancas/{id}`), sem bloqueio
  técnico de publicação. Evento sem `turmaId` (global) é exclusivo do admin;
  professor só gerencia evento de turma onde está em `turma.professorIds`
  (`src/services/shared/eventoAccess.ts`).
- **Pendências de produto antes de codar:** carência de 36 dias até virar
  inadimplente · cobrança precisa de canal além do push (iPhone sem PWA não
  recebe).

## 6. Modelo de dados (MongoDB)

Coleções principais: `usuarios`, `criancas`, `professores`, `turmas`, `agendasDiarias`, `planosAula`, `mensalidades`, `pagamentos`, `despesas`, `configPrecos`, `avisos`, `dispositivos`, `relatoriosAnuais`, `mensagens` (recados com anexo, ✅), `eventos` (mural de fotos, ✅).

Índices-chave: `agendasDiarias {criancaId, data}` único · `mensalidades {criancaId, ano, mes}` único · `pagamentos.txid` único · `criancas.cpf` único.

Schema completo, índices e consultas: [`docs/04-Banco-de-Dados.md`](./docs/04-Banco-de-Dados.md).

## 7. Endpoints (resumo — contrato completo em docs/03)

`/usuarios` `/criancas` `/turmas` `/professores` · `/agenda` `/agenda/historico` · `/mensalidades` `/pagamentos` `/webhooks/mercadopago` `/financeiro/balanco` `/despesas` `/financeiro/inadimplentes` `/financeiro/cobrancas/disparar` · `/avisos` `/planosAula` `/dispositivos` · `/anexos/upload-url` `/mensagens` `/eventos` · `/simulador` `/config/precos`. Base `/v1`, JWT obrigatório exceto simulador/landing e webhook (assinado).

## 8. Como rodar

### Local (sem AWS)

`serverless.local.yml` sobe sem `authorizer` do Cognito e sem nenhuma
variável vinda do SSM — por isso funciona antes do Cognito estar
provisionado. Para simular um usuário autenticado localmente, mande headers
`x-dev-sub`, `x-dev-role` (`admin`/`professor`/`responsavel`) e
`x-dev-email` nas requisições (ver `src/middlewares/auth.ts`; esse fallback
só é lido quando `STAGE` é `dev`/`local`, nunca em `staging`/`prod`). Rotas
que chamam o Cognito de verdade (criar/remover usuário) só funcionam após o
setup de AWS abaixo.

Outros comandos: `npm test` (Jest), `npm run typecheck` (`tsc --noEmit`).

### Setup manual de AWS (uma vez, antes do primeiro deploy)

O deploy real (`npm run deploy:dev|staging|prod`) usa `serverless.yml`, que
lê Cognito e Mongo via **SSM Parameter Store** — nada disso é provisionado
automaticamente. Antes do primeiro deploy em cada stage:

1. **Cognito:** criar um User Pool + App Client (sem secret, fluxo
   `USER_PASSWORD_AUTH`/`ADMIN_USER_PASSWORD_AUTH`) e 3 grupos:
   `admin`, `professor`, `responsavel`.
2. **SSM Parameter Store** (`String`/`SecureString`), prefixo
   `/aquarela_serverless/<stage>/...` (dev usa `/aquarela_serverless/...`
   sem o stage no meio — ver `config/dev.json`):
   - `cognito_url` → issuer do User Pool (`https://cognito-idp.<region>.amazonaws.com/<userPoolId>`)
   - `client_id` → App Client ID
   - `user_pool_id` → User Pool ID
   - `cognito_user_pool_arn` → ARN do User Pool
   - `db` (staging/prod) → connection string do MongoDB Atlas
   - `frontend_url` (staging/prod) → origem do `aquarela_app` para CORS
   - `mercadopago_access_token` → access token da conta MercadoPago
     (`SecureString`; sandbox em dev, produção em prod)
   - `mercadopago_webhook_secret` → segredo de assinatura do webhook
     (`SecureString`), gerado no painel do MercadoPago
   - `encryption_key` → chave AES-256 (`SecureString`, hex de 64 chars —
     gerar com `openssl rand -hex 32`) para os campos cifrados de `criancas`
     (CPF, dados de saúde). **Perder essa chave torna os dados
     irrecuperáveis** — guardar backup fora do SSM (ex.: cofre da equipe).
3. **MongoDB Atlas:** cluster com **replicaSet** habilitado (exigido para
   transações), IP allowlist liberando os egress da AWS (ou VPC peering).
4. Deploy: `npm run deploy:dev` (e `deploy:staging`/`deploy:prod` quando
   existirem esses ambientes).

Ver INF-02/INF-05/INF-11 em [`docs/06-Backlog.md`](./docs/06-Backlog.md) para o detalhamento desses passos como tarefas de backlog.

## 9. Documentação (pasta `docs/`)

| Arquivo                   | Conteúdo                                           |
| ------------------------- | -------------------------------------------------- |
| `00-Visao-Produto-PRD.md` | Visão, personas, papéis, épicos, user stories, MVP |
| `01-Design-UX.md`         | UX/telas (referência)                              |
| `02-Frontend.md`          | O que o front consome desta API                    |
| `03-Backend.md`           | **Guia deste repo** (arquitetura, endpoints)       |
| `04-Banco-de-Dados.md`    | **Modelo de dados** deste repo                     |
| `05-Sugestoes-Produto.md` | Evoluções priorizadas                              |
| `06-Backlog.md`           | Tarefas por épico, estimativas, sprints            |

> Ao mudar contrato de API ou schema, **atualize `docs/03` e `docs/04`** — o front (`aquarela_app`) depende deles para não sair do contrato.
