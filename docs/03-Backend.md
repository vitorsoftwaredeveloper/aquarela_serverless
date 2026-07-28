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

> **`GET /me` (papel `professor`) inclui `professorId`.** `usuarios.professorId` do schema **nunca é gravado** (`createProfessor` não seta esse campo — o vínculo real é `professores.usuarioId`, resolvido nos outros services via `resolveProfessorId`). `getMeService` (`src/services/usuarios/getMe.ts`) resolve o `professores._id` correspondente sob demanda e injeta como `professorId` na resposta — é assim que o front descobre o `_id` do próprio cadastro pra chamar `GET`/`PUT /professores/{id}`. Sem essa resolução o campo vem sempre `undefined`.

### Professores (CRUD completo)
| Método | Rota | Papel | Descrição |
|---|---|---|---|
| POST | `/professores` | admin | Cadastrar professor (+ **foto** opcional) |
| GET | `/professores` | admin | Listar professores |
| GET | `/professores/{id}` | admin/professor* | Detalhe (*só o próprio cadastro) |
| PUT | `/professores/{id}` | admin/professor* | Atualizar dados/**foto** (*só o próprio cadastro, e sem `email`) |
| DELETE | `/professores/{id}` | admin | Remover (bloqueado/aviso se houver turma vinculada) |

`email` fora do alcance do professor: é o username no Cognito e o vínculo com o `usuarios` criado pelo admin no cadastro — trocar exige atualizar Cognito + `usuarios` + `professores` juntos, então só admin. Ownership (GET e PUT) + bloqueio de campo (PUT) em `src/services/shared/professorAccess.ts` (`isDonoDoProfessor`, `CAMPOS_EXCLUSIVOS_ADMIN`), aplicada no service — o handler só filtra papel. `IUsuario.professorId` (`GET /me`) é como o front descobre o `_id` do próprio cadastro pra montar a URL do GET/PUT.

**Foto do professor:** mesmo mecanismo da criança (base64 no corpo, teto de 2MB decodificados, checagem de magic bytes, key no bucket `FotosBucket` sob `professores/{professorId}/{uuid}.{ext}`, leitura por `fotoUrl` pré-assinada de 1h) — ver `src/services/shared/fotoUpload.ts` (núcleo genérico reusado por `fotoCrianca.ts` e `fotoProfessor.ts`) e a seção "Foto da criança" (mais abaixo) para o detalhe de validação. Como soft delete preserva o cadastro, `DELETE /professores/{id}` **não** apaga a foto do bucket — só `PUT` (troca) remove a anterior.

### Turmas (CRUD completo + vínculo de crianças)
| Método | Rota | Papel | Descrição |
|---|---|---|---|
| POST | `/turmas` | admin | Criar turma (nome, descrição, faixa etária, professora) |
| GET | `/turmas` | admin/professor | Listar turmas |
| GET | `/turmas/{id}` | admin/professor | Detalhe da turma |
| PUT | `/turmas/{id}` | admin | Atualizar dados / trocar professora |
| DELETE | `/turmas/{id}` | admin | Remover turma (só se vazia, ou realocando as crianças — ver regra) |
| GET | `/turmas/{id}/criancas` | admin/professor | Listar alunos da turma — cada criança inclui `agendaRegistradaHoje: boolean` (se já tem registro de agenda na data corrente) |
| POST | `/turmas/{id}/criancas` | admin | **Vincular** criança à turma (body: `criancaId`) |
| DELETE | `/turmas/{id}/criancas/{criancaId}` | admin | **Desvincular** criança da turma |
| PATCH | `/criancas/{id}/turma` | admin | **Mover** criança para outra turma (body: `turmaId`) |

### Crianças (CRUD completo)
| Método | Rota | Papel | Descrição |
|---|---|---|---|
| POST | `/criancas` | admin | Cadastrar criança (+ vínculo de turma, responsáveis, **foto** e **consentimento LGPD**) |
| GET | `/criancas` | admin/professor | Listar (filtro por turma, nome, ativo) — cada criança inclui `turmaNome` (nome da turma vinculada, resolvido a partir de `turmaId`; `null` se sem turma) |
| GET | `/criancas/{id}` | admin/professor/responsavel* | Detalhe (*só o próprio filho) |
| PUT | `/criancas/{id}` | admin/responsavel* | Editar dados/saúde/responsáveis/**foto** (*só o próprio filho, e sem `financeiro`/`ativo`) |
| DELETE | `/criancas/{id}` | admin | Remover (hard delete — apaga também agenda/mensalidades/pagamentos da criança **e a foto no S3**; desvincula responsáveis sem apagá-los) |
| DELETE | `/criancas/{id}/foto` | admin | Remove a foto (bucket + cadastro). `204`, idempotente |

**Quem edita o quê:**

| | admin | responsável (próprio filho) |
|---|---|---|
| `nome`, `dataNascimento`, `responsaveis`, `saude`, `foto` | ✅ | ✅ |
| `financeiro`, `ativo` | ✅ | ❌ `403 FORBIDDEN` |
| turma (`PATCH /criancas/{id}/turma`) | ✅ | ❌ |
| `DELETE /criancas/{id}`, `DELETE .../foto` | ✅ | ❌ |

`financeiro` fora do alcance do responsável é o ponto crítico: sem isso ele baixaria a própria `valorMensalidade`. Regra em `src/services/shared/criancaAccess.ts` (`CAMPOS_EXCLUSIVOS_ADMIN`), aplicada no service — o handler só filtra papel.

**Foto da criança (base64 no corpo, guardada no S3):**

`POST /criancas` e `PUT /criancas/{id}` aceitam o campo opcional:

```json
"foto": { "contentType": "image/jpeg", "base64": "/9j/4AAQSk..." }
```

- `contentType`: `image/jpeg` | `image/png` | `image/webp`.
- `base64`: conteúdo **puro**, sem o prefixo `data:<tipo>;base64,` (o front recorta com `dataUrl.split(",")[1]`). Prefixo presente = `400 VALIDATION_ERROR`.
- **Teto de 2MB decodificados.** O payload síncrono de Lambda é limitado a 6MB e base64 infla ~33% — o front deve redimensionar no canvas antes de enviar (avatar 800px/jpeg 0.8 ≈ 150KB). Acima do teto: `422 FOTO_MUITO_GRANDE`.
- Os bytes iniciais são conferidos contra o `contentType` declarado; divergir (ex.: PDF ou SVG rotulado como JPEG) = `422 TIPO_IMAGEM_INVALIDO`. Base64 que decodifica para nada = `400 FOTO_INVALIDA`.

No Mongo fica só a **key** do objeto (`criancas/{criancaId}/{uuid}.{ext}`), nunca o binário. No `PUT`, a nova imagem é gravada antes do update (se o S3 falhar, o cadastro fica intacto) e a foto anterior é apagada só depois. No `POST`, a imagem é validada antes de provisionar os acessos dos responsáveis no Cognito, e o objeto é removido se o insert falhar.

**Leitura:** `GET /criancas`, `GET /criancas/{id}`, `GET /turmas/{id}/criancas` e as respostas de `POST`/`PUT` devolvem `fotoUrl` — URL pré-assinada válida por **1h**, ausente quando a criança não tem foto. Assinar é HMAC local: **não gera request ao S3**, então uma listagem de 40 crianças custa CPU, não chamadas — o download sai do browser direto para o bucket. `foto` (a key) não deve ser usada pelo front.

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

`GET /agenda` e `GET /agenda/historico` devolvem, além de `registradoPor` (ID), o campo `professor: { _id, nome, fotoUrl? }` com o nome e a foto (URL pré-assinada de 1h, mesmo mecanismo de `src/services/shared/fotoProfessor.ts`) de quem registrou (resolvido a partir de `registradoPor` no service — sem populate do Mongoose).

### Financeiro / Pagamentos
| GET | `/mensalidades?criancaId=&ano=` | responsavel*/admin | Meses pagos/em aberto |
> Geração de mensalidade: `POST /criancas` já cria, na hora do cadastro, a mensalidade de cada mês do mês corrente até dezembro do ano corrente (`gerarMensalidadesIniciaisService`) — sem isso a criança ficaria sem cobrança até o cron mensal (`gerarMensalidadesDoMes`, dia 1 de cada mês) gerar a competência seguinte. Ambos idempotentes via índice único `{criancaId, ano, mes}`. Mensalidade não é proporcional a cadastro no meio do mês — sempre o valor cheio de `crianca.financeiro.valorMensalidade`.
| POST | `/pagamentos` | responsavel | Gerar cobrança PIX (retorna copia-e-cola + txid) |
| GET | `/pagamentos/{txid}` | responsavel | Status do pagamento |
| POST | `/webhooks/mercadopago` | público (assinado) | Confirmação de pagamento |
| GET | `/financeiro/balanco?periodo=` | admin | Balanço mensal/anual |
| POST/GET | `/despesas` | admin | Lançar/listar despesas |
| PUT/DELETE | `/despesas/{id}` | admin | Editar / remover despesa |
| GET | `/financeiro/inadimplentes` | admin | Lista de inadimplentes |

### Simulador
| GET | `/simulador?meses=&plano=` | público | Cálculo de estimativa (ou 100% no cliente) |
| GET | `/config/precos/planos` | público | Lista `planos` (nome, tipo, valores, descontos) — usado pela landing page e pela tela do simulador no front |
| GET/PUT | `/config/precos` | admin | Valores base da mensalidade (fonte de verdade; edição) |

### Mural de avisos
| POST | `/avisos` | admin | Criar aviso (título, corpo, `turmaId` opcional) |
| GET | `/avisos?ativo=` | admin/professor/responsavel | Listar avisos — admin vê todos (filtro `ativo` opcional); professor/responsável só `ativo:true` e visível pra eles (sem `turmaId` = todos, ou `turmaId` de turma que lecionam/filho está matriculado) |
| PUT | `/avisos/{id}` | admin | Editar título/corpo/`turmaId` |
| DELETE | `/avisos/{id}` | admin | Soft delete (`ativo:false`) |

### Planos de aula
| POST | `/planosAula` | admin/professor | Criar plano (título, descrição, data, `turmaId`, `objetivos?`, `materiais?`); `professorId` é derivado da turma, não do payload |
| GET | `/planosAula?turmaId=` | admin/professor | Listar planos — admin vê todos; professor só das turmas que leciona (com `turmaId`, valida ownership; sem `turmaId`, filtra por suas turmas) |
| PUT | `/planosAula/{id}` | admin/professor | Editar plano — professor só nas turmas que leciona (ownership validada na turma atual e, se `turmaId` mudar, na nova também) |
| DELETE | `/planosAula/{id}` | admin/professor | Remover plano (hard delete — sem soft delete, coleção não é registro de auditoria) |

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
5. **Estorno (`status: refunded`):** o mesmo webhook, ao rebuscar o pagamento na API do MercadoPago e encontrar `refunded`, **remove o `pagamento` do banco** e reverte a `mensalidade` vinculada para `aberto` (limpando `mensalidadeId.pagamentoId`) — a competência volta a ser cobrável, um novo PIX pode ser gerado. Ver `src/services/webhooks/processarWebhookMercadoPago.ts`.

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
- **Consentimento LGPD (QA-03):** `POST /criancas` exige `consentimentoLgpd: boolean` no corpo; `false`/ausente é `422 CONSENTIMENTO_LGPD_OBRIGATORIO`. O backend grava `{ aceito: true, aceitoEm: <timestamp do servidor> }` — o client nunca controla `aceitoEm`. Campo imutável após o cadastro (fora do payload de `PUT /criancas/{id}`).

---

## 10. Testes & dev local
- **Jest + ts-jest**: unitários de services e validações; testes de contrato dos handlers.
- **Local:** `serverless-offline` + `nodemon` + MongoDB em `docker-compose` (replicaSet, necessário para transações do Mongoose).
- Seeds de dados (turmas/crianças fictícias) para desenvolvimento.
