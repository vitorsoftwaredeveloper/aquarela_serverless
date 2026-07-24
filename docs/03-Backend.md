# Aquarela Kids — Back End

> Arquitetura da API serverless. Versão 0.1 — 16/07/2026

---

## 1. Stack

| Item | Escolha |
|---|---|
| Runtime | Node.js 24.x |
| Linguagem | TypeScript |
| Framework | Serverless Framework v3 (fork `osls` / `oss-serverless`) |
| Compute | AWS Lambda (empacotamento `individually` + `serverless-esbuild`) |
| API | API Gateway **HTTP API** (`httpApi`) |
| Banco | MongoDB via **Mongoose** |
| Auth | AWS Cognito (authorizer JWT nativo do HTTP API) |
| Validação | `ajv` (`JSONSchemaType`) + `ajv-formats` |
| Storage | S3 (comprovantes/recibos) |
| Config/Secrets | SSM Parameter Store (`config/<stage>.json`) |
| Pagamentos | MercadoPago (PIX) |
| Push | Firebase Admin — fase 2+ |
| Plugins SLS | `serverless-esbuild`, `serverless-prune-plugin`, `serverless-offline` |
| Testes | Jest + ts-jest |
| Dev local | `nodemon` + `serverless-offline` + MongoDB (docker-compose, replicaSet) |

> Itens do template original que **não** se aplicam ao Aquarela Kids: TTS de liturgia e módulo de dízimo. MercadoPago/PIX é reaproveitado para mensalidades.

---

## 2. Arquitetura geral

```
Cliente (Next.js)
      │  Bearer JWT (Cognito)
      ▼
API Gateway HTTP API ──► JWT Authorizer (Cognito User Pool)
      │
      ▼  (uma Lambda por função, empacotada individualmente)
Lambdas (handlers)
  ├─ controller  → parse do evento HTTP
  ├─ validação   → ajv (JSONSchemaType)
  ├─ service     → regra de negócio
  └─ repository  → Mongoose (Models)
      │
      ├─► MongoDB (Atlas)          dados de domínio
      ├─► S3                       comprovantes/recibos
      ├─► SSM Parameter Store      config/segredos por stage
      └─► MercadoPago API          cobrança PIX
                 ▲
                 └── webhook ──► Lambda de confirmação de pagamento
```

**Conexão MongoDB em Lambda:** reutilizar a conexão entre invocações (cache do handler / `mongoose.connection.readyState`) e `context.callbackWaitsForEmptyEventLoop = false` para não segurar o event loop.

---

## 3. Autenticação e autorização

- **Cognito User Pool** com grupos `admin`, `professor`, `responsavel`.
- HTTP API usa o **JWT authorizer** nativo → valida o token e injeta claims no evento.
- Autorização de papel: middleware que lê `cognito:groups` das claims.
- Autorização de dado (ownership): o `responsavel` só acessa recursos das crianças vinculadas a ele; o `professor` só das turmas que leciona. Validado no service via vínculos no banco.

---

## 4. Estrutura do projeto

```
src/
├─ handlers/                 # entrypoints Lambda (1 por rota/função)
│  ├─ criancas/ turmas/ professores/ usuarios/
│  ├─ agenda/ financeiro/ pagamentos/ simulador/
├─ services/                 # regras de negócio
├─ repositories/             # acesso a dados (Mongoose)
├─ models/                   # schemas Mongoose
├─ schemas/                  # JSONSchemaType (ajv) por payload
├─ middlewares/              # auth, roleGuard, errorHandler
├─ libs/                     # mongo.ts, s3.ts, ssm.ts, mercadopago.ts
├─ utils/
└─ types/
serverless.ts / serverless.yml
config/<stage>.json          # referências a SSM
```

---

## 5. Endpoints principais (contrato resumido)

Base: `/v1`. Todos exigem JWT, exceto os marcados como público.

> **Convenção de CRUD.** Todas as entidades de cadastro (`usuarios`, `professores`, `turmas`, `criancas`) expõem o ciclo completo **create / read / update / delete**. `professores` e `turmas` usam **soft delete** (`ativo: false`), preservando histórico. `usuarios` e `criancas` usam **hard delete** (remoção definitiva, inclusive do Cognito no caso de `usuarios`) — para só bloquear acesso sem apagar, use `PUT` com `ativo:false`. Ver seção 9 (LGPD) e a doc de banco.

### Auth/usuários (CRUD completo)
| Método | Rota | Papel | Descrição |
|---|---|---|---|
| POST | `/usuarios` | admin | Criar usuário (admin/professor/responsavel) |
| GET | `/usuarios` | admin | Listar usuários (filtros: papel, ativo) |
| GET | `/usuarios/{id}` | admin | Detalhe do usuário |
| PUT | `/usuarios/{id}` | admin | Atualizar dados/papel |
| DELETE | `/usuarios/{id}` | admin | Remover usuário (hard delete: banco + Cognito; bloqueado `409` se houver criança/turma vinculada) |
| GET | `/me` | todos | Dados do usuário logado + papel |

### Professores (CRUD completo)
| Método | Rota | Papel | Descrição |
|---|---|---|---|
| POST | `/professores` | admin | Cadastrar professor |
| GET | `/professores` | admin | Listar professores |
| GET | `/professores/{id}` | admin | Detalhe |
| PUT | `/professores/{id}` | admin | Atualizar dados |
| DELETE | `/professores/{id}` | admin | Remover (bloqueado/aviso se houver turma vinculada) |

### Turmas (CRUD completo + vínculo de crianças)
| Método | Rota | Papel | Descrição |
|---|---|---|---|
| POST | `/turmas` | admin | Criar turma (nome, descrição, faixa etária, professora) |
| GET | `/turmas` | admin/professor | Listar turmas |
| GET | `/turmas/{id}` | admin/professor | Detalhe da turma |
| PUT | `/turmas/{id}` | admin | Atualizar dados / trocar professora |
| DELETE | `/turmas/{id}` | admin | Remover turma (só se vazia, ou realocando as crianças — ver regra) |
| GET | `/turmas/{id}/criancas` | admin/professor | Listar alunos da turma |
| POST | `/turmas/{id}/criancas` | admin | **Vincular** criança à turma (body: `criancaId`) |
| DELETE | `/turmas/{id}/criancas/{criancaId}` | admin | **Desvincular** criança da turma |
| PATCH | `/criancas/{id}/turma` | admin | **Mover** criança para outra turma (body: `turmaId`) |

### Crianças (CRUD completo)
| Método | Rota | Papel | Descrição |
|---|---|---|---|
| POST | `/criancas` | admin | Cadastrar criança (+ vínculo de turma e responsáveis) |
| GET | `/criancas` | admin/professor | Listar (filtro por turma, nome, ativo) |
| GET | `/criancas/{id}` | admin/professor/responsavel* | Detalhe (*só o próprio filho) |
| PUT | `/criancas/{id}` | admin | Editar dados/saúde/responsáveis |
| DELETE | `/criancas/{id}` | admin | Remover (hard delete — apaga também agenda/mensalidades/pagamentos da criança; desvincula responsáveis sem apagá-los) |

**Regras de vínculo e remoção:**
- Uma criança pertence a **uma turma por vez**. Vincular a uma nova turma (ou `PATCH .../turma`) substitui o vínculo anterior.
- **Remover turma** com crianças ativas é bloqueado (`409`): o admin deve antes realocar/desvincular as crianças (o front pode oferecer "mover todos para a turma X").
- **Remover professor** vinculado a uma turma retorna aviso/`409`; trocar a professora da turma é feito via `PUT /turmas/{id}`.
- `DELETE /criancas/{id}` é **hard delete** (definitivo, apaga histórico próprio da criança em cadeia — agenda, mensalidades, pagamentos). Para só bloquear acesso preservando histórico, use `PUT /criancas/{id}` com `ativo:false`.

### Agenda diária
| POST | `/agenda` | professor | Criar registro (criança+data) |
| PUT | `/agenda/{id}` | professor | Editar registro do dia |
| GET | `/agenda?criancaId=&data=` | professor/responsavel* | Registro por dia |
| GET | `/agenda/historico?criancaId=&de=&ate=` | professor/responsavel* | Histórico |

### Financeiro / Pagamentos
| GET | `/mensalidades?criancaId=&ano=` | responsavel*/admin | Meses pagos/em aberto |
> Geração de mensalidade: `POST /criancas` já cria, na hora do cadastro, a mensalidade de cada mês do mês corrente até dezembro do ano corrente (`gerarMensalidadesIniciaisService`) — sem isso a criança ficaria sem cobrança até o cron mensal (`gerarMensalidadesDoMes`, dia 1 de cada mês) gerar a competência seguinte. Ambos idempotentes via índice único `{criancaId, ano, mes}`. Mensalidade não é proporcional a cadastro no meio do mês — sempre o valor cheio de `crianca.financeiro.valorMensalidade`.
| POST | `/pagamentos` | responsavel | Gerar cobrança PIX (retorna copia-e-cola + txid) |
| GET | `/pagamentos/{txid}` | responsavel | Status do pagamento |
| POST | `/webhooks/mercadopago` | público (assinado) | Confirmação de pagamento |
| GET | `/financeiro/balanco?periodo=` | admin | Balanço mensal/anual |
| POST/GET | `/despesas` | admin | Lançar/listar despesas |
| GET | `/financeiro/inadimplentes` | admin | Lista de inadimplentes |

### Simulador
| GET | `/simulador?meses=&plano=` | público | Cálculo de estimativa (ou 100% no cliente) |
| GET/PUT | `/config/precos` | admin | Valores base da mensalidade |

### Mural de avisos
| POST | `/avisos` | admin | Criar aviso (título, corpo, `turmaId` opcional) |
| GET | `/avisos?ativo=` | admin/professor/responsavel | Listar avisos — admin vê todos (filtro `ativo` opcional); professor/responsável só `ativo:true` e visível pra eles (sem `turmaId` = todos, ou `turmaId` de turma que lecionam/filho está matriculado) |
| PUT | `/avisos/{id}` | admin | Editar título/corpo/`turmaId` |
| DELETE | `/avisos/{id}` | admin | Soft delete (`ativo:false`) |

**Erros:** padrão `{ error: { code, message, details? } }` com HTTP status adequado (400 validação, 401/403 auth, 404, 409 conflito, 422 regra de negócio, 500).

---

## 6. Validação (ajv)

```ts
import { JSONSchemaType } from "ajv";
interface CriarAgendaBody {
  criancaId: string; data: string;
  alimentacao?: { refeicao: "cafe"|"almoco"|"lanche"|"janta"; aceitacao: "tudo"|"parte"|"recusou"; obs?: string }[];
  sono?: { inicio: string; fim: string }[];
  atividades?: string[];
  humor?: "feliz"|"tranquilo"|"neutro"|"choroso";
  higiene?: { fraldas?: number; obs?: string };
  medicacoesAdministradas?: { nome: string; dose: string; hora: string; aplicadaPor: string }[];
  intercorrencias?: { tipo: "febre"|"queda"|"doenca"|"outro"; descricao: string; hora: string; notificado?: boolean }[];
  observacoes?: string;
}
const schema: JSONSchemaType<CriarAgendaBody> = { /* ver src/schemas/agendas/createAgenda.schema.ts */ };
```
`PUT /agenda/{id}` aceita o mesmo corpo sem `criancaId`/`data` (imutáveis após criação — ver `src/schemas/agendas/updateAgenda.schema.ts`).
Validar todo payload de entrada antes do service. `ajv-formats` para data/hora/e-mail.

---

## 7. Pagamentos PIX (MercadoPago)

1. `POST /pagamentos` cria cobrança PIX no MercadoPago → devolve `pixCopiaECola`, `qrBase64`, `txid`.
2. Cliente exibe QR e faz polling em `GET /pagamentos/{txid}`.
3. `POST /webhooks/mercadopago` recebe a confirmação → valida assinatura → marca a mensalidade como **paga** → gera recibo (PDF/HTML) e salva no **S3** → (fase 2) dispara push.
4. Idempotência: usar `txid`/`payment_id` para evitar dupla baixa.

Credenciais do MercadoPago e strings de conexão do Mongo ficam em **SSM Parameter Store** por stage, referenciadas em `config/<stage>.json`.

---

## 8. Configuração & deploy

- `serverless.yml`: `provider.runtime=nodejs24.x`, `httpApi` com `authorizer` Cognito, funções `individually` empacotadas via `serverless-esbuild`.
- `serverless-prune-plugin` para limpar versões antigas de Lambda.
- Stages: `dev`, `staging`, `prod` — cada um com seu `config/<stage>.json` e parâmetros SSM.
- Observabilidade: CloudWatch Logs + métricas; logs estruturados (JSON) por requisição.

---

## 9. Segurança & LGPD
- Dados sensíveis de saúde: acesso restrito por papel e por vínculo; princípio do menor privilégio nas Lambdas (IAM por função).
- Criptografia em trânsito (HTTPS) e em repouso (Mongo Atlas + S3 SSE).
- Segredos apenas em SSM (nunca no código/repo).
- Logs sem PII sensível; trilha de auditoria para edições de cadastro de criança e baixas financeiras.
- Webhook com verificação de assinatura.

---

## 10. Testes & dev local
- **Jest + ts-jest**: unitários de services e validações; testes de contrato dos handlers.
- **Local:** `serverless-offline` + `nodemon` + MongoDB em `docker-compose` (replicaSet, necessário para transações do Mongoose).
- Seeds de dados (turmas/crianças fictícias) para desenvolvimento.
