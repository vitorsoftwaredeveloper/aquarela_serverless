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

> **Convenção de CRUD.** Todas as entidades de cadastro (`usuarios`, `professores`, `turmas`, `criancas`, `avisos`) expõem o ciclo completo **create / read / update / delete**. `DELETE` é sempre **hard delete definitivo** — não existe soft delete/`ativo` no sistema. `usuarios`/`criancas`/`professores`/`avisos` apagam o registro de vez (crianças e usuários removem em cadeia o que só pertence a eles — ver seções abaixo); `turmas` bloqueia a remoção se ainda houver crianças vinculadas. Ver seção 9 (LGPD) e a doc de banco.

### Auth/usuários (CRUD completo)
| Método | Rota | Papel | Descrição |
|---|---|---|---|
| POST | `/usuarios` | admin | Criar usuário (admin/professor/responsavel) |
| GET | `/usuarios` | admin | Listar usuários (filtro: papel) |
| GET | `/usuarios/{id}` | admin | Detalhe do usuário |
| PUT | `/usuarios/{id}` | admin | Atualizar dados/papel |
| DELETE | `/usuarios/{id}` | admin | Remover usuário **em definitivo** (hard delete: apaga do banco + `AdminDeleteUser` no Cognito) |
| GET | `/me` | todos | Dados do usuário logado + papel |

> **`GET /me` (papel `professor`) inclui `professorId`, resolvido sob demanda.** O schema `usuarios.professorId` nunca é gravado na criação — o backend resolve `professores._id` a partir de `usuarioId` a cada chamada (`getMeService`) e injeta como `professorId` na resposta. Sem essa resolução o campo vem `undefined` e a tela Perfil do professor não mostra o card "Meus dados".

> **`POST /usuarios` — sem senha no body, senha temporária no retorno.** Body: `{ nome, email, papel, telefone? }` (`nome`≥3, `papel`∈`admin|professor|responsavel`). O backend cria o usuário no **Cognito com senha temporária gerada** (`AdminCreateUser` com `MessageAction: "SUPPRESS"` — **não** manda e-mail de convite), marca `email_verified`, adiciona ao grupo do papel e guarda o `cognitoSub`.
>
> **Modelo de entrega = "admin define e comunica":** a resposta inclui **`senhaTemporaria`** (retornada **uma única vez**, não persistida) — o front mostra num modal para o admin copiar e repassar ao usuário. O usuário loga com ela e troca no 1º login (challenge `NEW_PASSWORD`). **O front nunca coleta senha.** Falha na gravação faz rollback do usuário no Cognito.
>
> Usuário preso em `FORCE_CHANGE_PASSWORD` sem a temp: `aws cognito-idp admin-set-user-password --user-pool-id <id> --username <email> --password '<Temp>' --no-permanent`. **`ForgotPassword` não funciona nesse estado** (Cognito bloqueia até haver senha própria).
>
> `DELETE /usuarios/{id}` é **hard delete** (apaga banco + Cognito, irreversível). Bloqueado com `409 USUARIO_COM_VINCULOS` se o usuário for responsável por alguma criança, ou professor com turma vinculada.

### Professores (CRUD completo)
| Método | Rota | Papel | Descrição |
|---|---|---|---|
| POST | `/professores` | admin | Cadastrar professor (+ **foto** opcional) |
| GET | `/professores` | admin | Listar professores (com `turmas: [{ _id, nome }]` vinculadas) |
| GET | `/professores/{id}` | admin/professor* | Detalhe (*só o próprio cadastro) |
| PUT | `/professores/{id}` | admin/professor* | Atualizar dados/**foto** (*só o próprio cadastro, e sem `email`) |
| DELETE | `/professores/{id}` | admin | Remover em definitivo (professor + usuário/Cognito vinculado); bloqueado se houver turma vinculada |

> **`POST /professores` — cria o usuário (papel=professor) junto, sem `usuarioId`.** Body: `{ nome, cpf, telefone, email, formacao?, foto? }` — todos obrigatórios exceto `formacao` e `foto`. Mesmo padrão de `POST /usuarios`: o backend cria o usuário no Cognito com senha temporária gerada (`AdminCreateUser`, `MessageAction: "SUPPRESS"`), grupo `professor`, guarda `cognitoSub`, cria o registro em `professores` vinculado (`usuarioId` interno) e retorna **`senhaTemporaria`** no payload (uma única vez, não persistida) — o front mostra num modal para o admin copiar e repassar. Valida CPF por dígitos verificadores (`400`) e e-mail único (`409`). Falha em qualquer etapa faz rollback (usuário no Cognito + registro).
>
> **`PUT /professores/{id}` — só `{ nome?, telefone?, email?, formacao?, foto? }`** (`additionalProperties:false`). **Não aceita** trocar `usuarioId` nem `cpf` — enviar esses campos causa `400`.
>
> **Professor edita o próprio cadastro (tela Perfil), nunca `email`.** `GET`/`PUT /professores/{id}` aceitam papel `professor` além de `admin` — ownership checado no backend (`professor.usuarioId === requester._id`); pedir o cadastro de outro professor, ou mandar o campo `email` (mesmo com o valor igual ao atual), responde **`403 FORBIDDEN`**. O front (`ProfessorService.getMeuCadastro`/`atualizarMeuCadastro` em `services/professorService.ts`) por isso **nunca inclui `email`** no payload do PUT — o formulário mostra o campo só como leitura. O `_id` do próprio cadastro vem de `GET /me` → `IUsuario.professorId` (`AppUser.professorId` em `types/user.ts`, populado no `AuthContext`).
>
> **Foto do professor — mesmo mecanismo da foto de criança**, implementado (base64 no corpo, teto de 2MB decodificados, checagem de magic bytes contra o `contentType`, key no bucket `FotosBucket` sob `professores/{professorId}/{uuid}.{ext}`, leitura por `fotoUrl` pré-assinada de 1h) — ver `src/services/shared/fotoUpload.ts` (núcleo genérico reusado por `fotoCrianca.ts` e `fotoProfessor.ts`) e a seção "Crianças" abaixo pro detalhe de validação. `POST` e `PUT /professores/{id}` aceitam o campo opcional `foto: { contentType, base64 }`; toda resposta traz `fotoUrl`. **Tanto admin quanto o próprio professor podem mandar `foto` no `PUT`** — é o mesmo payload que já aceita `nome`/`telefone`/`formacao`. **Não existe endpoint dedicado pra apagar só a foto** (ao contrário de `DELETE /criancas/{id}/foto`) — pra trocar, manda outra `foto` no `PUT`; pra remover sem substituir, hoje não há rota. `DELETE /professores/{id}` apaga a foto do bucket junto com o cadastro (hard delete).

### Turmas (CRUD completo + vínculo de crianças)
| Método | Rota | Papel | Descrição |
|---|---|---|---|
| POST | `/turmas` | admin | Criar turma (nome, descrição, faixa etária, professora) |
| GET | `/turmas` | admin/professor | Listar turmas (com `professor: { _id, nome, email }`) |
| GET | `/turmas/{id}` | admin/professor | Detalhe da turma |
| PUT | `/turmas/{id}` | admin | Atualizar dados / trocar professora |
| DELETE | `/turmas/{id}` | admin | Remover turma em definitivo (só se vazia, ou realocando as crianças antes — ver regra) |
| GET | `/turmas/{id}/criancas` | admin/professor | Listar alunos da turma |
| POST | `/turmas/{id}/criancas` | admin | **Vincular** criança à turma (body: `criancaId`) |
| DELETE | `/turmas/{id}/criancas/{criancaId}` | admin | **Desvincular** criança da turma |
| PATCH | `/criancas/{id}/turma` | admin | **Mover** criança para outra turma (body: `turmaId`) |

> **`GET /turmas/{id}/criancas` (visão professor) devolve `agendaRegistradaHoje: boolean`
> e `agendaEnviadaHoje: boolean`** por criança (`listCriancasDaTurmaService`), calculados a
> partir de `AgendaDiaria` da data de hoje (servidor). O front (`AlunoTurma extends Crianca`,
> `services/professorService.ts`) remapeia pra `agendaRegistrada`/`agendaEnviada` e pinta três
> estados na tela **Alunos da turma**: "Pendente" (sem registro), "Registrada" (salva mas ainda
> não enviada aos pais) e "Registrada e enviada" (`enviadaEm` preenchido).
>
> **"Hoje" é calculado no fuso de Brasília (UTC-3 fixo, sem DST), não UTC do servidor**
> (`utils/date.ts` → `hojeMeiaNoiteBrasil`, usado em `listCriancasDaTurma` e `listTurmas`).
> Bug corrigido: antes o corte de "dia" usava `setUTCHours(0,0,0,0)` sobre o instante atual do
> servidor — entre ~21h e meia-noite (horário de Brasília) o dia UTC já tinha virado o dia
> seguinte, então uma agenda salva à noite (gravada com a data local do front) não aparecia
> como "Registrada" até o professor atualizar a tela depois da meia-noite. `POST /agenda`
> retornava sucesso, mas o `GET` seguinte não refletia o registro — não era bug de cache do
> front.

### Crianças (CRUD completo)
| Método | Rota | Papel | Descrição |
|---|---|---|---|
| POST | `/criancas` | admin | Cadastrar criança (+ vínculo de turma, responsáveis e **consentimento LGPD**) |
| GET | `/criancas` | admin/professor/responsavel* | Listar (filtro por turma, nome). Cada criança inclui `turmaNome` (resolvido a partir de `turmaId`; `null` se sem turma). *`responsavel` só recebe os próprios filhos (via `usuarios.criancasVinculadas` ou `responsaveis[].usuarioId`) — usado pela tela "Início" do responsável |
| GET | `/criancas/{id}` | admin/professor/responsavel* | Detalhe (*só o próprio filho) |
| PUT | `/criancas/{id}` | admin/responsavel* | Editar dados/saúde/responsáveis/foto (*só o próprio filho e sem `financeiro`) |
| DELETE | `/criancas/{id}/foto` | admin | Apagar só a foto (o cadastro permanece) |
| DELETE | `/criancas/{id}` | admin | Remover **em definitivo, em cadeia** (apaga agenda diária, mensalidades e pagamentos da criança; desvincula — sem apagar — os usuários responsáveis) |

> **Foto da criança — base64 no corpo.** `POST /criancas` e `PUT /criancas/{id}`
> aceitam o campo opcional `foto: { contentType, base64 }`. A Lambda decodifica,
> grava no S3 e o Mongo guarda **só a key**; toda resposta traz `fotoUrl`
> (presigned de leitura). Regras que o front precisa respeitar:
>
> - **Teto de 2MB decodificados** (payload síncrono de Lambda = 6MB e base64
>   infla 33%). Acima disso: `422 FOTO_MUITO_GRANDE`. O front **sempre**
>   redimensiona no canvas antes de enviar (`utils/imagem.ts`: 800px de lado
>   maior, JPEG 0.8 ≈ 150KB) — foto de celular vem com 3–8MB e bateria no teto.
> - `base64` **sem** o prefixo `data:...;base64,` — o ajv recusa por `pattern`,
>   porque `Buffer.from` ignoraria os caracteres inválidos em silêncio e
>   gravaria imagem corrompida. O front manda `dataUrl.split(",")[1]`.
> - Magic bytes conferidos contra o `contentType` declarado
>   (`422 TIPO_IMAGEM_INVALIDO`) — o cliente é quem declara o tipo.
>
> No `PUT`, a nova imagem é gravada antes do update (se o S3 falhar, o cadastro fica intacto) e a foto anterior é apagada só depois. No `POST`, a imagem é validada antes de provisionar os acessos dos responsáveis no Cognito, e o objeto é removido se o insert falhar.
>
> **Responsável editando o próprio filho.** `PUT /criancas/{id}` aceita
> `admin` e `responsavel`; como o payload é todo opcional, mandar só `{ foto }`
> cobre o caso "só trocar a foto". O backend devolve `403` se o responsável
> tocar em `financeiro` (senão ele editaria a própria mensalidade).
> `PATCH /criancas/{id}/turma`, `DELETE /criancas/{id}` e
> `DELETE /criancas/{id}/foto` seguem **admin-only**.
>
> ⚠️ **`PUT` não sincroniza e-mail de responsável.** Quem provisiona o usuário
> a partir do e-mail é só o `POST /criancas` (`ensureResponsavelUsuario`); o
> `PUT` faz `$set` cru em `responsaveis`. Trocar o e-mail ali muda **apenas o
> array embutido na criança** — Cognito e a coleção `usuarios` ficam com o
> antigo, então o login e o "esqueci minha senha" continuam no e-mail velho
> enquanto a escola passa a ver o novo. O vínculo não quebra (`usuarioId` fica
> intacto), o que torna a divergência silenciosa. Enquanto o backend não
> bloquear ou sincronizar de verdade (`AdminUpdateUserAttributes` + `usuarios`
> + verificação do novo endereço), o front trava o campo: e-mail de responsável
> com `usuarioId` é `readOnly` na tela do responsável.

> **`POST /criancas` cria/vincula o acesso dos responsáveis.** Para cada responsável, o backend garante um **usuário papel=responsavel** pelo e-mail: reusa se já existir, senão cria (Cognito + banco, senha temporária). Grava `usuarioId` no responsável embutido e adiciona a criança em `usuarios.criancasVinculadas`. CPF duplicado é checado **antes** de criar acessos (evita usuário órfão). Resposta: **`{ crianca, acessosResponsaveis: [{ nome, email, senhaTemporaria }] }`** — as senhas dos acessos **recém-criados** são entregues **uma vez** ao admin (front mostra em modal). Responsáveis cujo usuário já existia não retornam senha.
>
> Como `createCrianca` chama o mesmo fluxo de criação de usuário (Cognito), a function precisa das mesmas `environment.USER_POOL_ID` + permissões IAM (`AdminCreateUser`/`AdminAddUserToGroup`/`AdminGetUser`/`AdminDeleteUser`) que `createUsuario` — configurado em `src/handlers/criancas/functions.yml`.
>
> **Valor personalizado (acordo fechado) vs. plano fixo:** `financeiro.valorMensalidade` é sempre obrigatório e é sempre o valor que o admin digitou — o backend não recalcula a partir de `planoId`/`configPrecos` em nenhum momento (`createCriancaService`/`updateCriancaService` gravam `payload.financeiro` como veio). `planoId` é **opcional** e só guarda a referência de qual plano fixo (`GET /config/precos/planos`) foi usado de base, quando foi usado. Omitir `planoId` representa um valor negociado direto com os responsáveis, sem vínculo com nenhum plano — os dois nunca são mandados como se fossem consistentes entre si.
>
> `DELETE /criancas/{id}` é **hard delete em cadeia** (irreversível): apaga a criança + toda `AgendaDiaria`/`Mensalidade`/`Pagamento` vinculados; usuários responsáveis são só desvinculados (`$pull` em `criancasVinculadas`), suas contas não são apagadas.
>
> **Consentimento LGPD (QA-03).** `POST /criancas` exige `consentimentoLgpd:
> boolean` no corpo (`additionalProperties:false` + `required` — sem o campo,
> ou com `false`, o backend responde **`422 CONSENTIMENTO_LGPD_OBRIGATORIO`**).
> O stepper de cadastro (`CriancaStepper.tsx`) trava o botão "Cadastrar
> criança" até o checkbox de consentimento ser marcado e já manda
> `consentimentoLgpd: true` real no payload — o gate do front é só UX (evita o
> round-trip do 422), a fonte da verdade é a validação do backend. O backend
> grava `aceitoEm` com **timestamp do servidor** (não vem do client) e o campo
> é **imutável depois de criado**: não existe em `IUpdateCriancaPayload`, então
> nem faz sentido mandar em `PUT /criancas/{id}`.

**Regras de vínculo e remoção:**
- Uma criança pertence a **uma turma por vez**. Vincular a uma nova turma (ou `PATCH .../turma`) substitui o vínculo anterior.
- **Remover turma** com crianças ativas é bloqueado (`409`): o admin deve antes realocar/desvincular as crianças (o front pode oferecer "mover todos para a turma X").
- **Remover professor** vinculado a uma turma retorna aviso/`409`; trocar a professora da turma é feito via `PUT /turmas/{id}`.

### Agenda diária
| POST | `/agenda` | professor | Criar registro (criança+data) |
| PUT | `/agenda/{id}` | professor | Editar registro do dia |
| GET | `/agenda?criancaId=&data=` | professor/responsavel* | Registro por dia |
| GET | `/agenda/historico?criancaId=&de=&ate=` | professor/responsavel* | Histórico |
| POST | `/agenda/{id}/enviar` | professor | Gatilho **"Enviar para os pais"** — dispara a notificação push (ver §Notificações push abaixo). Só a professora da turma (mesma regra de `PUT /agenda/{id}`); 2ª chamada → `409 AGENDA_JA_ENVIADA`. Resposta é a agenda com `enviadaEm` preenchido |
| DELETE | `/agenda/{id}` | professor | Remover registro do dia. Mesma guarda de `PUT /agenda/{id}` (só a professora da turma; senão `403 FORBIDDEN`); agenda inexistente → `404 NOT_FOUND`. **Hard delete** — registro diário não tem soft delete |

> **`PUT /agenda/{id}` substitui por completo os campos opcionais — não é patch parcial.**
> `updateAgendaService` monta o `$set` sempre com todos os campos (`alimentacao`, `sono`,
> `atividades`, `humor`, `higiene`, `medicacoesAdministradas`, `intercorrencias`,
> `observacoes`), usando `[]`/`null` como default pra qualquer campo ausente no payload — nunca
> faz spread cru do `payload` no `$set`. Antes, campo omitido no corpo simplesmente não era
> tocado no Mongo (`$set` parcial de verdade): a tela do professor já reconstrói o payload
> inteiro a cada "Salvar" e omite (`undefined`) qualquer campo que o professor deixou vazio, daí
> apagar uma intercorrência/observação/soneca durante uma edição no mesmo dia não tinha efeito
> — o valor antigo continuava no banco e aparecia pro responsável, mesmo com a tela mostrando
> "Agenda salva". O front deve continuar mandando o **estado completo do formulário** a cada
> `PUT` (nunca um patch parcial de verdade) — campo omitido agora é lido como "esvaziado", não
> "sem alteração".
>
> **`GET /agenda` e `GET /agenda/historico` devolvem `professor: { _id, nome }`**
> junto com o `registradoPor` cru (o `_id` do professor, sem nome). O front
> (`AgendaService.getDia`, `src/services/agendaService.ts`) usa `professor.nome`
> para assinar a carta da agenda (`AgendaStory.tsx`) — antes disso o nome real
> nunca chegava à tela do responsável, só o `_id`. O tipo aceita também um
> `fotoUrl` opcional (`AgendaProfessor` em `src/types/agenda.ts`) para quando o
> backend passar a projetar a foto do professor nessa rota; até lá o avatar cai
> no fallback de iniciais (`components/Avatar`).
>
> **Cron `removerAgendasAnoAnterior`** (1º de janeiro, 00:00 GMT-3 —
> `cron(0 3 1 1 ? *)` UTC): apaga de `agendasDiarias` todo registro com
> `data` anterior ao dia 1º de janeiro do ano corrente (UTC), de todas as
> crianças. Não é só o ano que passou — qualquer resíduo de anos ainda mais
> antigos (ex.: cron que falhou) também é limpo, já que agenda diária velha
> não tem valor depois da virada do ano. Hard delete, sem soft delete, sem
> volta.

### Notificações push (Web Push / FCM)
| Método | Rota | Papel | Descrição |
|---|---|---|---|
| POST | `/dispositivos` | admin/professor/responsavel | Upsert do token FCM do dispositivo do usuário logado — `{ token, plataforma: "android"\|"ios"\|"web"\|"desktop" }`. Idempotente por `token`: reenviar não duplica |
| DELETE | `/dispositivos/{token}` | admin/professor/responsavel | Remove um dispositivo próprio (logout). Token de terceiro é no-op silencioso (204) |

> Motor de envio (`services/notificacoes/enviarNotificacao.ts`) resolve os dispositivos do(s) `usuarioId` alvo e envia via Firebase Cloud Messaging (`libs/firebase.ts`, credencial do service account em SSM `SecureString`, lida em runtime). Token que o FCM reporta como `registration-token-not-registered` é removido automaticamente. Corpo da notificação é sempre genérico (ex.: "A agenda de hoje da Sofia já está disponível") — nunca leva saúde/alimentação/medicação (LGPD, aparece na tela de bloqueio).
>
> **Implementado e testado no back (NOT-01…NOT-08).** Ainda **não implementado no front** — é o Épico I (`NOT-10`…`NOT-18`) em `docs/06-Backlog.md`. O que falta construir no front:
> - `public/firebase-messaging-sw.js` na **raiz** do domínio + `manifest.json` (`display: standalone`) — sem isso não há push, principalmente no iPhone
> - Fluxo de permissão: pedir `Notification.requestPermission()` só **depois** de explicar o benefício (o browser só pergunta uma vez — negou, só reverte manualmente nas configs do browser)
> - `getToken()` do Firebase SDK (`firebase/messaging`) → `POST /dispositivos` no login; reenviar em `onTokenRefresh`; `DELETE /dispositivos/{token}` no logout
> - **iPhone só recebe push com o PWA instalado na tela de início** (iOS 16.4+) — abrir pelo Safari normal não funciona, e abrir pelo **webview do WhatsApp/Instagram também não** (confirmado no spike `NOT-00`: `PushManager` indisponível). Precisa detectar os dois casos e instruir o responsável
> - `RegistrarAgendaScreen` chama `POST /agenda/{id}/enviar` (ver acima) **automaticamente logo após salvar** a agenda (criação ou edição) — sem botão "Enviar para os pais" na tela. Cada criança gera seu próprio envio: um responsável com vários filhos na escola recebe uma notificação por criança. Falha ao notificar não bloqueia o salvamento (chamada best-effort, erro silenciado) e reenvio em edições posteriores é idempotente no back (`409 AGENDA_JA_ENVIADA`)

### Planos de aula
| Método | Rota | Papel | Descrição |
|---|---|---|---|
| GET | `/planosAula?turmaId=` | admin/professor | Listar (sem `turmaId`: professor vê os próprios, filtrado por `professorId` do JWT) |
| POST | `/planosAula` | admin/professor | Criar (`turmaId` no body; `professorId` derivado de `turma.professorId`, nunca do payload) |
| PUT | `/planosAula/{id}` | admin/professor | Atualizar (trocar `turmaId` reatribui `professorId` à nova turma) |
| DELETE | `/planosAula/{id}` | admin/professor | Remover (hard delete — sem campo `ativo` no schema) |

> Sem GET por id — o front (`PlanosAulaService.getById`) resolve via `list` + filtro em memória. Ownership: professor só cria/edita planos das próprias turmas (reusa `getTurmaByIdService`); admin sem restrição.

### Avisos (mural)
| Método | Rota | Papel | Descrição |
|---|---|---|---|
| GET | `/avisos` | admin/professor/responsavel | Listar avisos (escopo por papel, ver abaixo) |
| POST | `/avisos` | admin | Publicar aviso (`titulo`, `corpo`, `turmaId?`) |
| PUT | `/avisos/{id}` | admin | Editar |
| DELETE | `/avisos/{id}` | admin | Remover **em definitivo** (hard delete — apaga o documento) |

> Documento: `{ _id, titulo, corpo, autorId, turmaId?, createdAt,
> updatedAt }`. **Sem campo `tipo`** (recado/cuidado/evento) — não existe no
> modelo. **Sem campo `ativo`** — o sistema não tem soft delete; `turmaId` é
> opcional: **ausente = visível para todos os responsáveis**; presente = só
> para quem tem filho na turma (mural geral + por turma, ver
> docs/05-Sugestoes-Produto.md).
>
> **Escopo do `GET /avisos` varia por papel** (não é um filtro de query):
> `admin` vê todos; `professor` vê os avisos globais + das turmas que leciona;
> `responsavel` vê os globais + das turmas das crianças vinculadas a ele. O
> front não filtra nada — consome a resposta como vier.
>
> Remover uma turma (`DELETE /turmas/{id}`) apaga junto os avisos vinculados a
> ela (`turmaId`) — mural não tem valor de histórico independente da turma.

### Financeiro / Pagamentos
| GET | `/mensalidades?criancaId=&ano=` | responsavel*/admin | Meses pagos/em aberto |
> Geração de mensalidade: `POST /criancas` já cria, na hora do cadastro, a mensalidade de cada mês do mês corrente até dezembro do ano corrente (`gerarMensalidadesIniciaisService`) — sem isso a criança ficaria sem cobrança até o cron mensal (`gerarMensalidadesDoMes`, dia 1 de cada mês) gerar a competência seguinte. Ambos idempotentes via índice único `{criancaId, ano, mes}`. Mensalidade não é proporcional a cadastro no meio do mês — sempre o valor cheio de `crianca.financeiro.valorMensalidade`.

> **Mudança de valor/vencimento propaga (`sincronizarMensalidadesNaoPagas`):** todo `PUT /criancas/{id}` que traz `financeiro` reaplica `valorMensalidade` e `diaVencimento` em **todas as mensalidades da criança que não estão `pago`** (`aberto`, `atrasado`, `cancelado`). Mensalidade `pago` nunca é tocada — é histórico financeiro. Sem isso o cadastro mostrava o valor novo e a tela do responsável continuava cobrando o antigo, porque as competências já existiam com o valor da geração. O `vencimento` é recalculado por competência (`$dateFromParts` com `{ano, mes, diaVencimento}`) e o par `aberto`/`atrasado` é reavaliado contra a nova data (vencimento empurrado para o futuro volta a `aberto`). Pagamentos PIX pendentes dessas mensalidades **com o valor antigo** são apagados — o QR já emitido cobraria o valor errado; pendentes que já batem com o novo valor sobrevivem.

> **Cron `gerarMensalidadesAno`** (1º de janeiro, 00:00 GMT-3 —
> `cron(0 3 1 1 ? *)` UTC, `timeout: 120`): pré-gera de uma vez as 12
> competências (janeiro a dezembro) do ano novo para toda criança ativa,
> reusando `criarMensalidadeSeNaoExiste` — idempotente via índice único
> `{criancaId, ano, mes}`, seguro reexecutar. Coexiste com o cron mensal
> `gerarMensalidadesDoMes` (dia 1 de cada mês, 06:00 UTC / 03:00 GMT-3):
> em janeiro os dois rodam sobre a mesma competência, mas o segundo vira
> no-op porque a mensalidade já foi criada pelo cron anual horas antes.
| POST | `/pagamentos` | responsavel | Gerar cobrança PIX (retorna copia-e-cola + txid) |
| GET | `/pagamentos/{txid}` | responsavel | Status do pagamento |
| POST | `/pagamentos/manual` | admin | Registrar pagamento recebido em dinheiro físico (baixa manual da mensalidade) — ver seção 7.1 |
| POST | `/webhooks/mercadopago` | público (assinado) | Confirmação de pagamento |
| GET | `/financeiro/balanco?periodo=` | admin | Balanço mensal/anual |
| POST/GET | `/despesas` | admin | Lançar/listar despesas |
| PUT/DELETE | `/despesas/{id}` | admin | Editar/remover despesa |
| GET | `/financeiro/inadimplentes` | admin | Lista de inadimplentes |

> **`/financeiro/inadimplentes` devolve uma linha por mensalidade em atraso**,
> não uma lista já agregada por criança: `{ mensalidade: { valor, mes, ano,
> vencimento, status, ... }, crianca: { nome, responsaveis: [{ nome, telefone,
> ... }] } }[]`. Não existe `valorTotal` nem `mesesEmAtraso` na resposta — o
> front (`services/financeiroNormalize.ts#normalizarInadimplentes`) agrupa por
> `crianca._id` e soma `mensalidade.valor`. Além disso, a rota só considera
> mensalidades com `status: "atrasado"` (vencimento já passado) — mensalidades
> do mês corrente ainda `"aberto"` (não vencidas, só não pagas) **não
> aparecem** nessa lista; hoje não há rota/filtro para elas.

### Simulador
| GET | `/simulador?meses=&plano=` | público | Cálculo de estimativa (ou 100% no cliente) |
| GET | `/config/precos/planos` | público | Lista de planos completa (`nome`, `tipo`, `valorMensal`, `valorDiario`, `descontos`) — sem token |
| GET/PUT | `/config/precos` | admin | Valores base da mensalidade |

> `/config/precos/planos` devolve `{ planos: [...] }` igual ao `GET /config/precos`
> (inclusive `descontos`, de propósito — é o gancho de venda "quanto mais
> meses, mais desconto" da landing/simulador), só que sem exigir token. O
> front usa essa rota para montar a landing e o simulador e faz o cálculo de
> desconto por meses **100% no cliente** com os dados reais do admin — o
> `GET /simulador` deixou de ser necessário para isso.

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
6. **Pagamento pendente já existente:** `POST /pagamentos` para uma mensalidade que já tem cobrança `pendente` responde `409 PAGAMENTO_PENDENTE` (em vez de devolver a cobrança antiga). O front trata isso como qualquer erro genérico de `criarPagamento` — mostra a mensagem da API no modal PIX com o botão "Tentar de novo". **Não confundir com `409 MENSALIDADE_PAGA`**, que é tratado como confirmação (mensalidade já quitada), não como erro.
7. **Reconciliação de pendências:** um cron (a cada 30 min) consulta o MercadoPago para cobranças `pendente` sem confirmação. A cada consulta sem resolução incrementa `tentativasReconciliacao`; na 2ª tentativa sem sucesso a cobrança pendente é **removida**, liberando o responsável para gerar uma nova (sem erro). Enquanto a cobrança pendente existir, o responsável recebe `PAGAMENTO_PENDENTE` ao tentar gerar outra para a mesma mensalidade.

Credenciais do MercadoPago e strings de conexão do Mongo ficam em **SSM Parameter Store** por stage, referenciadas em `config/<stage>.json`.

### 7.1 Pagamento manual (dinheiro físico, só admin)

Fluxo separado do PIX: usado quando o responsável paga em espécie (ex.: na secretaria) e o **admin** registra a baixa manualmente — nunca o próprio responsável. Tela: [`FinanceiroCriancaModal.tsx`](../src/features/admin/criancas/FinanceiroCriancaModal.tsx) no front, acessível pelo ícone de carteira na lista de crianças (`CriancasScreen.tsx`).

1. `POST /pagamentos/manual` (papel `admin`) — body `{ mensalidadeId, valor }`. `valor` é o que foi efetivamente recebido em mãos e **não precisa bater com `mensalidade.valor`** (desconto, acerto, etc.) — qualquer `valor > 0` baixa a mensalidade inteira pra `pago`. Não existe baixa parcial (a mensalidade não fica "parcialmente paga"), mesma simplificação do fluxo PIX.
2. Bloqueado (`409`) se a mensalidade já está `pago` (`MENSALIDADE_PAGA`) ou `cancelado` (`MENSALIDADE_CANCELADA`) — mesmos códigos de erro do fluxo PIX (`createPagamentoService`). O front trata `MENSALIDADE_PAGA` como confirmação silenciosa (fecha o formulário e recarrega a lista, sem mostrar erro).
3. Grava um `pagamentos` com `metodo:"dinheiro"`, `provedor:"manual"`, `status:"pago"` já direto (nunca passa por `pendente`), `pagoEm` = timestamp do servidor (nunca do payload), e `recebidoPor` = `_id` do admin autenticado — trilha de auditoria da baixa financeira exigida na seção 9. `txid` continua existindo no schema (gerado via `randomUUID()`, mesmo mecanismo do PIX) mas não representa uma transação PIX real — é só o identificador interno único do pagamento.
4. Em transação (replicaSet): atualiza a `mensalidade` pra `pago` + `pagamentoId`, e expira (`status:"expirado"`) qualquer `pagamento` PIX `pendente` da mesma mensalidade — mesma limpeza que o webhook do MercadoPago já faz ao confirmar, evitando um QR PIX pendente "vivo" pra uma mensalidade já paga em dinheiro.
5. Sem webhook, sem reconciliação — a baixa é síncrona no próprio `POST`. `GET /pagamentos/{txid}` e `GET /mensalidades?criancaId=&ano=` continuam funcionando sem mudança: pro responsável, uma mensalidade paga em dinheiro aparece igual a uma paga por PIX (`status:"pago"`), só sem `pixCopiaECola`/`qrBase64`.

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
