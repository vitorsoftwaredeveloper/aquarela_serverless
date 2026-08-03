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
| PUT | `/usuarios/{id}/senha` | admin | Redefinir a senha de qualquer usuário |
| DELETE | `/usuarios/{id}` | admin | Remover usuário **em definitivo** (hard delete: apaga do banco + `AdminDeleteUser` no Cognito) |
| GET | `/me` | todos | Dados do usuário logado + papel |

> **`GET /me` (papel `professor`) inclui `professorId`, resolvido sob demanda.** O schema `usuarios.professorId` nunca é gravado na criação — o backend resolve `professores._id` a partir de `usuarioId` a cada chamada (`getMeService`) e injeta como `professorId` na resposta. Sem essa resolução o campo vem `undefined` e a tela Perfil do professor não mostra o card "Meus dados".

> **`POST /usuarios` — sem senha no body, senha temporária no retorno.** Body: `{ nome, email, papel, telefone? }` (`nome`≥3, `papel`∈`admin|professor|responsavel`). O backend cria o usuário no **Cognito com senha temporária gerada** (`AdminCreateUser` com `MessageAction: "SUPPRESS"` — **não** manda e-mail de convite), marca `email_verified`, adiciona ao grupo do papel e guarda o `cognitoSub`.
>
> **Modelo de entrega = "admin define e comunica":** a resposta inclui **`senhaTemporaria`** (retornada **uma única vez**, não persistida) — o front mostra num modal para o admin copiar e repassar ao usuário. O usuário loga com ela e troca no 1º login (challenge `NEW_PASSWORD`). **O front nunca coleta senha.** Falha na gravação faz rollback do usuário no Cognito.
>
> Usuário preso em `FORCE_CHANGE_PASSWORD` sem a temp: `aws cognito-idp admin-set-user-password --user-pool-id <id> --username <email> --password '<Temp>' --no-permanent`. **`ForgotPassword` não funciona nesse estado** (Cognito bloqueia até haver senha própria).
>
> **`PUT /usuarios/{id}/senha` — admin redefine a senha de qualquer usuário.** Body: `{ novaSenha }` (mín. 8 caracteres; o Cognito aplica a política de senha real do User Pool e responde `422 SENHA_INVALIDA` se não atender). Chama `AdminSetUserPassword` com `Permanent: false` — mesmo modelo do `POST /usuarios`: o admin comunica a nova senha ao usuário, que é obrigado a trocá-la no próximo login (challenge `NEW_PASSWORD`). **`204` sem corpo**; a senha não é persistida nem retornada. `404` se o usuário não existir no banco.
>
> `DELETE /usuarios/{id}` é **hard delete** (apaga banco + Cognito, irreversível). Bloqueado com `409 USUARIO_COM_VINCULOS` se o usuário for responsável por alguma criança, ou professor com turma vinculada. Em cadeia também apaga os `dispositivos` (tokens FCM) vinculados ao `usuarioId` — senão o registro fica órfão e o motor de notificação (`enviarNotificacao.ts`) tentaria enviar push pra um usuário que não existe mais.

### Professores (CRUD completo)
| Método | Rota | Papel | Descrição |
|---|---|---|---|
| POST | `/professores` | admin | Cadastrar professor (+ **foto** opcional) |
| GET | `/professores` | admin | Listar professores (com `turmas: [{ _id, nome }]` vinculadas) |
| GET | `/professores/{id}` | admin/professor* | Detalhe (*só o próprio cadastro) |
| PUT | `/professores/{id}` | admin/professor* | Atualizar dados/**foto** (*só o próprio cadastro, e sem `email`) |
| DELETE | `/professores/{id}` | admin | Remover em definitivo (professor + usuário/Cognito vinculado); bloqueado só se for o **único** professor de alguma turma — senão só sai do array `professorIds` |

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
| POST | `/turmas` | admin | Criar turma (nome, descrição, faixa etária, `professorIds: string[]` — mínimo 1) |
| GET | `/turmas` | admin/professor | Listar turmas (com `professores: [{ _id, nome, email }]`) |
| GET | `/turmas/{id}` | admin/professor | Detalhe da turma |
| PUT | `/turmas/{id}` | admin | Atualizar dados / trocar professoras (`professorIds`) |
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
>
> **✅ OPS-03 — múltiplos professores por turma.** `turmas.professorId: ObjectId` virou
> `turmas.professorIds: [ObjectId]` (mínimo 1, índice em `professorIds`). Migração
> (`scripts/migrations/2026-08-turmas-professorIds.ts`, `npm run migrate:turmas-professorIds`)
> converte `professorId` legado em `professorIds: [professorId]` e remove o campo antigo.
> **Compat de 1 release:** `GET /turmas` segue devolvendo `professorId` (= `professorIds[0]`)
> e `professor` (= `professores[0]`) — só derivados na resposta, não persistidos — pro front
> antigo não quebrar durante o deploy; somem no release seguinte. Todo ownership por turma
> passou a usar `professorIds.includes(...)` (`getTurmaById`, `listTurmas`, `listCriancas`,
> `getCriancaById`, `listAvisos`, `agendaAccess`, `mensagemAccess`). **`planosAula.professorId`
> muda de significado:** era "o professor da turma" (derivado), agora é o **autor** do plano
> (o `professorId` de quem criou; admin cai em `turma.professorIds[0]`) — não é mais
> recalculado se o plano muda de turma. **`DELETE /professores/{id}`** deixa de bloquear por
> qualquer turma vinculada: só bloqueia (`409 PROFESSOR_COM_TURMA_VINCULADA`) se o professor
> for o **único** de alguma turma; caso contrário sai do array (`$pull`) e a turma continua com
> os demais. Responsável ao enviar recado (`POST /mensagens`) agora notifica **todos** os
> professores da turma, não só o primeiro.

### Crianças (CRUD completo)
| Método | Rota | Papel | Descrição |
|---|---|---|---|
| POST | `/criancas` | admin | Cadastrar criança (+ vínculo de turma, responsáveis e **consentimento LGPD**) |
| GET | `/criancas` | admin/professor/responsavel* | Listar (filtro por turma, nome). Cada criança inclui `turmaNome` (resolvido a partir de `turmaId`; `null` se sem turma). *`responsavel` só recebe os próprios filhos (via `usuarios.criancasVinculadas` ou `responsaveis[].usuarioId`) — usado pela tela "Início" do responsável |
| GET | `/criancas/{id}` | admin/professor/responsavel* | Detalhe (*só o próprio filho) |
| PUT | `/criancas/{id}` | admin/responsavel* | Editar dados/saúde/responsáveis/foto (*só o próprio filho e sem `financeiro`) |
| DELETE | `/criancas/{id}/foto` | admin | Apagar só a foto (o cadastro permanece) |
| DELETE | `/criancas/{id}` | admin | Remover **em definitivo, em cadeia** (apaga agenda diária, mensalidades e pagamentos da criança; desvincula os usuários responsáveis e apaga a conta de quem ficar sem nenhuma criança vinculada) |

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
> `DELETE /criancas/{id}` é **hard delete em cadeia** (irreversível): apaga a criança + toda `AgendaDiaria`/`Mensalidade`/`Pagamento` vinculados; usuários responsáveis são desvinculados (`$pull` em `criancasVinculadas`) e, **para cada um que fica sem nenhuma criança vinculada** (`CriancaRepository.count({ "responsaveis.usuarioId": ... }) === 0`, checado depois do `$pull`), a conta também é apagada em cadeia (Cognito `AdminDeleteUser` + registro em `usuarios`) — mesmo hard delete de `DELETE /usuarios/{id}`, só que automático. Só entra nessa remoção automática **usuário com `papel: "responsavel"`**: se o e-mail do responsável já batia com uma conta `admin`/`professor` existente (reuso por e-mail em `ensureResponsavelUsuario`), essa conta nunca é apagada por aqui.
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
- **Remover turma** com crianças ativas é bloqueado (`409`): o admin deve antes realocar/desvincular as crianças (o front pode oferecer "mover todos para a turma X"). Ao remover, avisos e **planos de aula** vinculados à turma são apagados em cascata (hard delete).
- **Remover professor** vinculado a uma turma retorna aviso/`409`; trocar a professora da turma é feito via `PUT /turmas/{id}`.

### Agenda diária
| POST | `/agenda` | professor | Criar registro (criança+data) |
| PUT | `/agenda/{id}` | professor | Editar registro do dia |
| GET | `/agenda?criancaId=&data=` | professor/responsavel* | Registro por dia |
| GET | `/agenda/historico?criancaId=&de=&ate=` | professor/responsavel* | Histórico |
| GET | `/agenda/frequencia?criancaId=&de=&ate=` | professor/responsavel* | Contagem de presença (`presente`/`falta`/`atrasado`) no período — AG2-09 |
| POST | `/agenda/{id}/enviar` | professor | Gatilho **"Enviar para os pais"** — dispara a notificação push (ver §Notificações push abaixo). Só a professora da turma (mesma regra de `PUT /agenda/{id}`); **renotifica em toda chamada** ("agenda atualizada" a partir da 2ª), com debounce de 10 min por agenda (`200 { notificado: false, motivo: "DEBOUNCE" }` dentro da janela). Resposta é a agenda com `enviadaEm`/`ultimoEnvioEm`/`enviosCount` + `{ notificado, motivo? }` |
| DELETE | `/agenda/{id}` | professor | Remover registro do dia. Mesma guarda de `PUT /agenda/{id}` (só a professora da turma; senão `403 FORBIDDEN`); agenda inexistente → `404 NOT_FOUND`. **Hard delete** — registro diário não tem soft delete |

> **AG2-09 — `GET /agenda/frequencia?criancaId=&de=&ate=`** (`src/services/agendas/getFrequenciaAgenda.ts`).
> `de`/`ate` são **obrigatórios** (`400 BAD_REQUEST` sem algum dos três parâmetros
> ou com data inválida) — diferente de `GET /agenda/historico`, que aceita
> período opcional; aqui um período sem limite cruzaria com anos já expurgados
> pelo cron `limparDadosAnoAnterior` sem nenhum aviso. Mesma guarda de acesso
> de `GET /agenda/historico` (`loadCriancaParaLeituraAgenda`: professor da
> turma da criança ou responsável pelo próprio filho). Resposta:
> `{ criancaId, de, ate, presente, falta, atrasado, total }`, contando só dias
> com `presenca` registrada (agenda anterior ao Épico L, sem esse campo, não
> entra em nenhum total). Consumida pela tela de Histórico (chip de resumo do
> período) e por um futuro relatório de frequência.
>
> **Épico L (AG2) — `tarefaCasa`, `presenca` e `anexos` no registro diário
> (`POST`/`PUT /agenda`).** `tarefaCasa?: { status: "feito"|"nao_feito"|"incompleto", observacao? }`
> e `presenca?: { status: "presente"|"falta"|"atrasado", horaChegada?, justificativa? }`
> — `horaChegada` é **obrigatório** quando `status === "atrasado"` (ajv `if/then`,
> `422` sem ele). `anexos?: {key, nome, contentType, tamanho}[]` reusa 100% a
> infra de anexo do Épico K (mesmo `escopo: "agenda"` já aceito em
> `POST /anexos/upload-url`, mesma whitelist e teto de 10MB, `maxItems: 5`) —
> `createAgenda`/`updateAgenda` chamam `validarAnexosVinculados("agenda", …)`
> antes de gravar (key forjada/de outro escopo → `422 ANEXO_INVALIDO`).
> `GET /agenda` e `GET /agenda/historico` devolvem cada anexo já com `url`
> pré-assinada de leitura (1h, `withAgendaAnexosUrl(s)` em
> `src/services/agendas/withAgendaAnexosUrl.ts`, mesmo padrão de
> `withAnexosUrl` em mensagens).
>
> **`PUT /agenda/{id}` substitui por completo os campos opcionais — não é patch parcial.**
> `updateAgendaService` monta o `$set` sempre com todos os campos (`alimentacao`, `sono`,
> `atividades`, `humor`, `higiene`, `medicacoesAdministradas`, `intercorrencias`,
> `observacoes`, `tarefaCasa`, `presenca`, `anexos`), usando `[]`/`null` como default pra qualquer campo ausente no payload — nunca
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
> **Cron `limparDadosAnoAnterior`** (`src/handlers/manutencao/`, 1º de janeiro,
> 00:00 GMT-3 — `cron(0 3 1 1 ? *)` UTC; era `removerAgendasAnoAnterior`,
> renomeado quando deixou de ser só agenda): expurga, de todas as crianças,
> tudo que for anterior ao dia 1º de janeiro do ano corrente (UTC) —
> `agendasDiarias` por `data`, `mensagens` por `createdAt` e `pagamentos`
> por **`pagoEm`** (só `status: "pago"`). Não é só o ano que passou: qualquer
> resíduo de anos ainda mais antigos (ex.: cron que falhou) também cai.
>
> **Pagamento é filtrado por `pagoEm`, nunca por `createdAt`** — é o mesmo
> critério da consolidação, então todo pagamento apagado está garantidamente
> dentro de um fechamento. Por `createdAt`, o PIX gerado em 30/12 e baixado
> em 02/01 seria apagado sem entrar em fechamento nenhum: some do caixa do
> ano corrente, que é justamente o ano que ainda não foi consolidado.
> Pagamento sem baixa não é problema deste cron — o `removerPagamentosNaoPagos`
> (diário, 04:00 UTC) já apaga tudo que não é `pago`.
>
> A ordem importa. **Antes de qualquer `deleteMany`** o cron (1) consolida o
> fechamento financeiro de cada ano que tem pagamento a ser expurgado, via
> `gerarRelatorioAnualService` → `relatoriosAnuais`, e (2) busca os `anexos`
> (fotos/documentos) de cada agenda e mensagem selecionada para apagar os
> objetos do S3 (`removerAnexosDoBucket`). Invertido, o fechamento sairia
> zerado e os anexos ficariam órfãos no bucket.
>
> **Não são tocados:** cadastro da criança (`criancas`), `mensalidades` e
> `despesas`. Hard delete, sem soft delete, sem volta — depois da virada,
> `relatoriosAnuais` é a única fonte do histórico financeiro daquele ano.
>
> ⚠️ **Este cron divide o horário com `gerarMensalidadesAno`** (`cron(0 3 1 1
> ? *)` nos dois): um pré-gera as 12 mensalidades do ano que começa, o outro
> expurga o ano que acabou. Não conflitam porque **`mensalidades` está fora do
> expurgo** — as competências recém-criadas do ano novo não correm risco, e as
> antigas também ficam (retenção fiscal). Quem mexer neste cron não pode
> incluir `mensalidades` no `deleteMany` sem antes resolver essa sobreposição.
>
> Efeito colateral aceito: mensalidade paga de ano expurgado fica com
> `pagamentoId` apontando para um pagamento que não existe mais. Nada
> desreferencia esse campo na leitura (`listMensalidades` só devolve o valor),
> então é referência pendurada inofensiva, não bug.

### Relatórios
| Método | Rota | Papel | Descrição |
|---|---|---|---|
| GET | `/financeiro/relatorio-anual` | admin | Relatório anual de pagamentos por criança × mês. Query `?ano=YYYY` (padrão: ano corrente) |

> Resposta: `{ ano, consolidadoEm, origem, anosDisponiveis, totais, meses,
> criancas }`. `totais` traz `pagamentos`, `despesas`, `saldo`,
> `quantidadePagamentos`, `criancasComPagamento` e `ticketMedio`; `meses` são
> sempre os 12 (mês sem movimento vem zerado); cada item de `criancas` traz
> `{ criancaId, nome, turmaNome, total, meses[] }`.
>
> **`origem` diz de onde veio o número.** `"consolidado"` = ano já fechado
> pelo cron `limparDadosAnoAnterior`, servido do snapshot em
> `relatoriosAnuais` — recalcular devolveria zero, porque os `pagamentos`
> daquele ano não existem mais. `"calculado"` = ano ainda aberto, agregado ao
> vivo de `pagamentos` (`status: "pago"`, por `pagoEm`, fuso
> `America/Sao_Paulo`) e `despesas`. O snapshot sempre ganha quando existe.
>
> Criança removida do cadastro depois do fechamento continua no relatório com
> `nome: "Criança removida"` — o pagamento aconteceu e precisa somar.

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
> - `RegistrarAgendaScreen` chama `POST /agenda/{id}/enviar` (ver acima) **automaticamente logo após salvar** a agenda (criação ou edição) — sem botão "Enviar para os pais" na tela. Cada criança gera seu próprio envio: um responsável com vários filhos na escola recebe uma notificação por criança. Falha ao notificar não bloqueia o salvamento (chamada best-effort, erro silenciado) e reenvio em edições posteriores renotifica o responsável, com debounce de 10 min por agenda no back

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

### Anexos (upload direto ao S3) — Épico K

| Método | Rota | Papel | Descrição |
|---|---|---|---|
| POST | `/anexos/upload-url` | admin/professor/responsavel | Emite uma **URL pré-assinada de PUT** para o cliente subir o arquivo direto no S3 |

> **Por que existe um segundo mecanismo de upload.** A foto de criança/professor
> trafega em **base64 no corpo** (`fotoUpload.ts`), o que impõe teto de **2MB
> decodificados** — payload síncrono de Lambda é 6MB e base64 infla 33%.
> Atestado em PDF e foto de evento estouram isso. Anexo de **recado (K)**,
> **agenda (L)** e **mural (M)** usam presigned PUT; a foto de criança e de
> professor **continuam em base64**, sem mudança.
>
> Body: `{ escopo: "mensagem"|"agenda"|"mural", nome, contentType, tamanho }`.
> Resposta: `{ key, uploadUrl, expiraEm }`.
>
> - Presigned **PUT de 5 minutos**, com `Content-Type` **e** `Content-Length`
>   fixados na assinatura — o browser não consegue subir tipo/tamanho diferente
>   do declarado.
> - Whitelist: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`. Fora
>   dela → `422 TIPO_ANEXO_INVALIDO`. Teto de **10MB** por arquivo →
>   `422 ANEXO_MUITO_GRANDE`.
> - Bucket é o **`FotosBucket` que já existe** (privado, SSE-AES256, TLS
>   obrigatório) — nenhum bucket novo. Prefixo por escopo, **plano** (sem
>   subpasta por id — no momento do upload a mensagem/agenda/evento ainda pode
>   não existir): `mensagens/{uuid}.{ext}` · `agendas/{uuid}.{ext}` ·
>   `eventos/{uuid}.{ext}` (`buildAnexoKey`,
>   `src/services/anexos/criarUploadUrlAnexo.ts`).
> - **O backend nunca vê o arquivo**, então valida no momento de vincular a
>   `key` (ao criar a mensagem / anexar à agenda / anexar ao evento): `HeadObject`
>   confere que o objeto existe e que `ContentType`/`ContentLength` batem com o
>   declarado, e a `key` precisa ter o prefixo emitido por ele. Não bateu →
>   `422 ANEXO_INVALIDO`. Sem isso, um cliente sobe um `.exe` renomeado ou
>   referencia a key de outro escopo.
> - ⚠️ **Toda Lambda que vincula anexo precisa de `s3:GetObject` no
>   `functions.yml`** — `HeadObject` é autorizado por essa action, não existe
>   `s3:HeadObject`. Sem ela o S3 responde **403 sem corpo**, o SDK levanta um
>   erro `message: "UnknownError"` e a rota vira `500 INTERNAL_SERVER_ERROR` em
>   vez de `422 ANEXO_INVALIDO`. Foi exatamente o que quebrou
>   `POST /agenda` com anexo em 03/08/2026: `createAgenda`/`updateAgenda`
>   tinham só o statement de `encryption_key`. `UnknownError` num 500 é a
>   assinatura desse erro — procure IAM antes de procurar bug de validação.
> - Objeto que subiu e nunca foi vinculado é lixo: cron diário
>   `limparAnexosOrfaos` apaga o que passou de 24h sem referência em nenhuma
>   coleção.
> - **Leitura sempre por presigned GET de 1h**, gerado na resposta da rota que
>   devolve o anexo (mesmo padrão do `fotoUrl`). Nunca URL permanente, nunca
>   bucket público.

### Recados responsável ↔ professor — Épico K

| Método | Rota | Papel | Descrição |
|---|---|---|---|
| POST | `/mensagens` | professor/responsavel | Enviar recado sobre uma criança (com anexos opcionais) |
| GET | `/mensagens?criancaId=&limit=&antesDe=&desde=` | admin/professor/responsavel* | Thread da criança, mais recentes primeiro |
| DELETE | `/mensagens/{id}` | autor/admin | Remover em definitivo (hard delete + apaga o anexo no S3) |

> **É thread por criança, não chat livre.** Toda mensagem nasce ligada a uma
> `criancaId` — é isso que resolve a autorização sem inventar um modelo de
> conversa. Sem tempo real, sem indicador de digitação, sem edição de mensagem
> já enviada, sem confirmação de leitura no servidor (ver push-driven abaixo).
>
> Body do `POST`: `{ criancaId, corpo, anexos?: [{ key, nome, contentType, tamanho }] }`.
> `corpo` até 2000 caracteres, máx. **5 anexos** por mensagem. **`turmaId` é
> derivado da criança no backend, nunca lido do payload** — senão o cliente
> escolheria o escopo de leitura da própria mensagem.
>
> **Ownership (validado no service, como todo o resto):** `responsavel` só sobre
> os próprios filhos; `professor` só sobre criança de turma que ele leciona
> (`turma.professorIds.includes(...)` depois do OPS-03); `admin` sobre qualquer
> uma, mas **admin não envia** — só lê, para suporte. Fora disso, `403`.
>
> `GET /mensagens` devolve cada anexo já com `url` (presigned de 1h) além de
> `key`/`nome`/`contentType`/`tamanho`. Paginação por cursor (`antesDe` =
> `createdAt` da mais antiga já em tela), `limit` default 30, teto 100.
> `desde` = `createdAt` da mais recente já em tela — fetch incremental depois
> de um push, sem repaginar a thread inteira.
>
> **Notificação:** recado do responsável notifica os professores das turmas da
> criança; recado do professor notifica os responsáveis. Corpo **genérico**
> ("Novo recado sobre a Sofia") — o texto da mensagem **nunca** vai no push, que
> aparece na tela de bloqueio (mesma regra LGPD do Épico I).
>
> `DELETE` é permitido ao **autor** ou ao **admin**; qualquer outro recebe `403`.
> Apaga o documento e os objetos do S3 vinculados.
>
> **Push-driven, sem polling nem "lida" no servidor:** o cliente busca
> `/mensagens` só ao abrir a thread e ao receber push — nunca em intervalo. Não
> existe `POST /mensagens/{id}/lida` nem `GET /mensagens/nao-lidas`: quem leu
> não é informação de negócio aqui, então o contador de "não lidas" é
> calculado no cliente comparando `createdAt` contra a última abertura local.

### Mural de fotos por evento — Épico M

> **Status (02/08/2026): back-end implementado.** Front (FOT-06/07) e
> `docs/04` seguem neste release. Decisão de produto (dona da escola, ver
> [`docs/06-Backlog.md`](./06-Backlog.md) §Épico M): **sem marcação de
> criança por foto** — não existe `fotos[].criancasIds`, nem bloqueio técnico
> de publicação por falta de consentimento. O controle é só o consentimento
> registrado no cadastro (`criancas.consentimentoImagem`) + o professor sabe,
> por cadastro/conhecimento da turma, quem não pode aparecer — o sistema não
> impõe isso automaticamente.

| Método | Rota | Papel | Descrição |
|---|---|---|---|
| GET | `/eventos?turmaId=&ano=` | admin/professor/responsavel | Listar eventos (escopo por papel, ver abaixo) |
| POST | `/eventos` | admin/professor | Criar evento (`titulo`, `descricao?`, `data`, `turmaId?`) |
| PUT | `/eventos/{id}` | admin/professor* | Editar (*só evento de turma que leciona) |
| POST | `/eventos/{id}/fotos` | admin/professor* | Vincular fotos já subidas via presigned (`{ fotos: [{ key, nome, contentType, tamanho, legenda? }] }`, máx. 50 itens por chamada) |
| PUT | `/eventos/{id}/fotos` | admin/professor* | Reordenar/editar legenda das fotos já vinculadas (`{ fotos: [{ key, legenda?, ordem }] }`) — a lista precisa conter **exatamente** as mesmas `key` já vinculadas (nenhuma a mais, nenhuma a menos); adicionar/remover é só pelas rotas dedicadas |
| DELETE | `/eventos/{id}/fotos/{fotoKey}` | admin/professor* | Remover uma foto (apaga o objeto no S3); `fotoKey` vai na própria rota (path greedy, pois a key contém `/`) |
| POST | `/eventos/{id}/publicar` | admin/professor* | Publica e notifica os responsáveis do escopo |
| DELETE | `/eventos/{id}` | admin/professor* | Remover em definitivo (hard delete + apaga todas as fotos no S3) |

> **Não confundir com `/avisos` (Épico H):** avisos são texto do **admin** para o
> mural de recados; eventos são álbuns de foto do **professor**. Coleções,
> telas e permissões diferentes.
>
> **Escopo do `GET /eventos` varia por papel**, mesma mecânica de `/avisos` (não
> é filtro de query): `admin` vê tudo, inclusive rascunho; `professor` vê os
> globais + das turmas que leciona, inclusive os próprios rascunhos;
> `responsavel` vê **só `publicado: true`**, globais + das turmas dos filhos.
> `turmaId` ausente = evento da escola inteira, **exclusivo do admin**:
> professor sem `turmaId` no `POST /eventos` recebe `403`, e só gerencia
> (`PUT`/fotos/publicar/`DELETE`) evento de turma onde está em
> `turma.professorIds` — evento global fica fora do alcance dele mesmo que
> tenha sido ele o autor original.
>
> **Rascunho × publicado.** O professor sobe as fotos ao longo do dia; nada
> aparece para o responsável até `POST /eventos/{id}/publicar`. A publicação
> grava `publicadoEm` e dispara **uma** notificação ("Novas fotos do evento
> Festa Junina"); 2ª chamada é no-op silencioso (não renotifica, resposta
> inclui `notificado: false`) — mesmo padrão de idempotência do envio de
> agenda. Máx. **50 fotos** por evento (`422 LIMITE_FOTOS_EXCEDIDO` acima
> disso). Fotos chegam por `key` já validada contra o bucket
> (`validarAnexosVinculados("mural", ...)`, mesmo mecanismo de `/mensagens`).
>
> **🔴→✅ Consentimento de imagem (LGPD) — decisão tomada (02/08/2026).** O
> mural expõe a imagem de uma criança a **outros responsáveis** da turma —
> tratamento distinto do `consentimentoLgpd` genérico, que cobre
> cadastro/saúde. Por isso existe `criancas.consentimentoImagem` (ver doc de
> banco), coletado em checkbox **separado** no cadastro e — ao contrário do
> `consentimentoLgpd`, que é imutável — **revogável** pelo responsável a
> qualquer momento via `PUT /criancas/{id}`. Recusar não impede a matrícula.
> **Não há marcação de criança por foto nem bloqueio de publicação**: a
> escola optou por não exigir marcação (custo de UX/trabalho do professor
> maior que o benefício) — o consentimento registrado é só isso, um registro;
> quem evita fotografar uma criança sem consentimento é o professor, avisado
> pelo cadastro da turma, não o sistema.

### Cobrança automática e inadimplência — Épico J

> **Status (01/08/2026): Fase 3 (inadimplência) e Fase 4 (cobrança automática)
> implementadas.** `configPrecos.inadimplencia`, cron `marcarInadimplentes`,
> `GET /financeiro/inadimplentes` filtrando por `inadimplenteDesde`, cron
> `dispararCobrancas` (dias 05/20) e `POST /financeiro/cobrancas/disparar`
> (com `dryRun`) — tudo em produção. **`GET /financeiro/cobrancas` (histórico
> por `ano`/`mes`) segue fora do escopo, deliberado** — não corresponde a
> nenhum item do backlog (COB-01…05 cobrem só o disparo, não um histórico
> navegável); a rota abaixo é especificação, não contrato vigente.

| Método | Rota | Papel | Descrição |
|---|---|---|---|
| POST | `/financeiro/cobrancas/disparar` | admin | Dispara o mesmo motor do cron sob demanda; `{ dryRun?: boolean }` |
| GET | `/financeiro/cobrancas?ano=&mes=` | admin | **Não implementado.** Histórico do que foi disparado (a partir de `mensalidades.cobrancas[]`) |

> **Cron `dispararCobrancas` — dias 05 e 20, 09:00 GMT-3** (`cron(0 12 5,20 * ? *)`).
> Notifica por push (FCM, motor `enviarNotificacao`) **só quem ainda deve**.
>
> **Seleção — a parte que erra fácil.** O sistema **pré-gera as 12 competências
> do ano** (`gerarMensalidadesAno`, 1º de janeiro), então filtrar por
> `status: "aberto"` sozinho cobraria dezembro em fevereiro. O filtro correto é
> `status ∈ {aberto, atrasado}` **E** `vencimento <= último instante do mês
> corrente (GMT-3)`.
>
> **Uma notificação por responsável, não por mensalidade.** Sem agregar, um
> responsável com 3 filhos e 4 meses em aberto levaria 12 pushes num disparo só
> — e desligaria o canal. O motor agrupa por `usuarioId` e manda uma mensagem
> resumida, com `dados: { tipo: "cobranca" }` para o front abrir `/financeiro`.
>
> **Corpo sem valor em reais.** Pode citar a criança e a competência (mesmo
> padrão de "A agenda de hoje da Sofia já está disponível"); **valor devido,
> não** — a notificação aparece na tela de bloqueio. Valor só dentro do app.
>
> **Idempotência:** cada envio grava em `mensalidades.cobrancas[]`
> `{ enviadaEm, canal, gatilho: "dia05"|"dia20"|"manual" }` (capado nas últimas
> 12 entradas). O cron reexecutado no mesmo dia com o mesmo gatilho não
> redispara. `POST .../disparar` com `dryRun: true` devolve **as contagens**
> de quem seria notificado e quantos estão **sem token válido**
> (`{ responsaveisNotificados, responsaveisSemToken, mensalidadesAtualizadas: 0 }`)
> sem enviar nem gravar nada — não uma lista nominal de responsáveis.

> **Inadimplência é diferente de atraso (mudança de contrato do
> `GET /financeiro/inadimplentes`).** Hoje a rota devolve tudo que está
> `status: "atrasado"`, ou seja, vencimento + 1 dia. Passa a existir uma
> **carência configurável** e a rota passa a filtrar por
> `inadimplenteDesde != null`:
>
> - Configuração em `configPrecos.inadimplencia = { diasCarencia: 10 }`
>   (`GET`/`PUT /config/precos`, admin). `0 ≤ diasCarencia ≤ 365`.
> - Regra: a mensalidade não paga vira inadimplente em
>   **`vencimento + diasCarencia`**, às 00:00 GMT-3. A conta é por mensalidade —
>   o `diaVencimento` individual da criança manda também aqui, não existe corte
>   de calendário comum a todo mundo. Ele continua valendo, como antes, para a
>   transição `aberto → atrasado`; a carência é uma segunda linha, depois dela.
> - Com o default, vencimento 05/08 vira inadimplente em **15/08**.
> - **Mudança de contrato (02/08/2026):** o formato anterior
>   `{ diaCorte, mesesCarencia }` não existe mais — `PUT /config/precos` com
>   esses campos responde `400` (`additionalProperties: false`).
> - Cron diário `marcarInadimplentes` (00:05 GMT-3, `cron(5 3 * * ? *)`) grava/
>   limpa `mensalidades.inadimplenteDesde`. Pagar (PIX, webhook ou manual) limpa
>   o campo na mesma transação da baixa.
> - Entre o vencimento e o corte a mensalidade segue `atrasado` — cobrável, em
>   vermelho na tela do responsável, mas **fora** da lista de inadimplentes e do
>   KPI do dashboard.
> - O KPI "Inadimplentes" do dashboard passa a contar **crianças distintas**,
>   não linhas de mensalidade (hoje o front já agrupa por `crianca._id` em
>   `financeiroNormalize.ts`; o backend passa a devolver o número pronto).

### Mudanças de contrato em rotas existentes (lote de 01/08/2026)

**⚠️ `POST /agenda/{id}/enviar` — `409 AGENDA_JA_ENVIADA` deixa de existir** (AG2-01).

A rota era "envie uma vez": o 2º disparo respondia `409` e **não notificava**.
Como o front chama essa rota automaticamente depois de todo `save`, uma correção
feita às 17h nunca chegava ao responsável — ele leu a versão das 11h e não
soube que mudou. A rota passa a ser **"notificar (re)envio"**:

- 1º envio → grava `enviadaEm`, corpo "A agenda de hoje da Sofia já está disponível".
- Envios seguintes → corpo "A agenda de hoje da Sofia foi **atualizada**",
  atualiza `ultimoEnvioEm` e incrementa `enviosCount`. **`enviadaEm` não é
  sobrescrito** — continua marcando o 1º envio, que é o que a tela do professor
  exibe.
- **Debounce de 10 minutos por agenda.** Sem ele o professor salva 5 vezes em 3
  minutos e o responsável leva 5 pushes. Reenvio dentro da janela responde
  `200 { notificado: false, motivo: "DEBOUNCE" }` — sucesso, só não notificou.
- Resposta passa a incluir `{ notificado: boolean, motivo?: "DEBOUNCE" }` além
  da agenda. O front deve **remover** o tratamento de `409` desse fluxo.

**`PUT /criancas/{id}` — responsável não concede `podeRetirar`** (OPS-01, ✅
implementado).

Até aqui a única trava para o papel `responsavel` era
`CAMPOS_EXCLUSIVOS_ADMIN = ["financeiro"]`: o array `responsaveis` passava
livre, então **um responsável conseguia adicionar qualquer pessoa com
`podeRetirar: true`**. Isso é segurança física de menor, não regra
administrativa. Regra em `assertMutacaoResponsaveis`
(`src/services/shared/criancaAccess.ts`), aplicada só quando o requester **não
é admin**:

| Ação sobre `responsaveis` | Responsável |
|---|---|
| Adicionar uma nova entrada (pessoa nova) | **bloqueado** (`403 RESPONSAVEL_EXCLUSIVO_ADMIN`) — independe de `podeRetirar`, só a secretaria inclui gente nova |
| Alterar `podeRetirar` de entrada existente | **bloqueado** nos dois sentidos (`true→false` também), `403 PODE_RETIRAR_EXCLUSIVO_ADMIN` |
| Remover entrada com `podeRetirar: true` | **bloqueado** (`403 PODE_RETIRAR_EXCLUSIVO_ADMIN`) |
| Remover entrada com `podeRetirar: false` | permitido |
| Alterar `usuarioId` de qualquer entrada | **bloqueado** (`403 PODE_RETIRAR_EXCLUSIVO_ADMIN`) |
| Editar nome/telefone/parentesco/CPF de entrada já existente | permitido |

> A comparação entre o array do banco e o do payload casa cada entrada por
> **CPF normalizado** (só dígitos) e, quando existe, confere também o
> `usuarioId` — **nunca por posição no array**. Comparar por índice deixa o
> bypass trivial: basta reordenar o array para uma entrada com
> `podeRetirar: true` "virar" outra. Não existe `cpfHash` por entrada de
> `responsaveis` (só `criancas.cpfHash`, da própria criança) — a comparação usa
> o CPF já decifrado em memória (`CriancaRepository.findById` decifra antes de
> devolver), sem tocar `src/libs/crypto.ts`. Toda mutação de `responsaveis`
> feita por responsável entra em `criancas.auditoria` (CAD-09), via o mesmo
> `appendAuditoria` já usado por qualquer edição de criança.

**`GET /financeiro/balanco` — regime de caixa e fuso GMT-3** (OPS-02).

Bug relatado em 01/08/2026: pagamento feito em **31/07** não apareceu nas
entradas de julho nem no card "Entradas do mês"; apareceu em **agosto**.

Causa: `getBalancoService` agregava `mensalidades` (`{ ano, mes, status: "pago" }`,
`$group` por `$mes`) — ou seja, por **competência**, não por data do pagamento.
A mensalidade paga em 31/07 era a competência de **agosto** (as 12 competências
do ano são pré-geradas), então caiu em agosto por design. Dois erros de fuso se
somavam: `$month: "$data"` nas despesas usa **UTC** (despesa lançada dia 31 às
22h GMT-3 caía no mês seguinte) e a janela do período era montada com `Date.UTC`,
deslocada 3h.

Correção (**regime de caixa**, decisão travada em 01/08/2026):

1. Entradas passam a vir de `pagamentos`:
   `{ $match: { status: "pago", pagoEm: { $gte, $lt } } }` +
   `$group: { _id: { $month: { date: "$pagoEm", timezone: "America/Sao_Paulo" } } }`.
2. Soma **`pagamentos.valor`** (o que entrou no caixa), não `mensalidades.valor`
   — casa com a baixa manual em dinheiro, que aceita valor diferente do da
   mensalidade (§7.1).
3. Despesas ganham o mesmo `timezone: "America/Sao_Paulo"` no `$month`.
4. `inicioPeriodo`/`fimPeriodo` calculados em GMT-3 (reusar `utils/date.ts`,
   que já tem `hojeMeiaNoiteBrasil`), não `Date.UTC`.
5. O KPI "Entradas do mês" do dashboard usa o mesmo cálculo.
6. **Estorno já está coberto:** o webhook remove o `pagamento` do banco quando o
   MercadoPago reporta `refunded`, então some do balanço sozinho.
7. Regressão obrigatória: pagamento com `pagoEm = 2026-07-31T23:00-03:00` de uma
   mensalidade `{ano:2026, mes:8}` → entra em **julho**.

> A grade que o responsável vê em `/financeiro` continua por **competência**
> (é a lista de meses dele). Só o balanço/dashboard do admin passa a ser caixa —
> por isso o front rotula o card como "Entradas (regime de caixa — data do
> pagamento)".

**Balanço e relatório anual compartilham a agregação** (`agregarMesesDoAno` em
`src/services/financeiro/mesesDoAno.ts`). Eram dois pipelines idênticos
somando o mesmo número: `getBalanco.meses[].entradas` é exatamente
`relatorio-anual.meses[].pagamentos`. Hoje existe um cálculo só; o relatório
adiciona por cima a quebra por criança e os totais do ano.

> ⚠️ **`getBalanco` também consulta o snapshot** (`getMesesDoAno`), pela mesma
> razão do relatório: depois que o cron `limparDadosAnoAnterior` expurga os
> `pagamentos` do ano, agregar ao vivo devolveria **zero**. E isso não é
> hipótese — o gráfico do dashboard (`BalancoChart`) tem seletor de ano que
> desce até **2020**. Sem essa leitura, todo ano já expurgado apareceria como
> um ano inteiro vazio, sem erro nenhum na tela. Regra: ano com fechamento em
> `relatoriosAnuais` vem do fechamento; ano aberto é agregado ao vivo. O
> recorte `YYYY-MM` é aplicado depois, em cima da fonte escolhida.
>
> Os dois endpoints seguem separados de propósito: o dashboard precisa de 12
> meses leves (e do recorte por mês), o relatório carrega a grade criança × mês
> inteira. Unificar a rota faria o dashboard baixar o payload por criança sem
> usar.

**`/turmas` — múltiplos professores** (OPS-03).

`turmas.professorId: ObjectId` → **`turmas.professorIds: [ObjectId]`** (mínimo 1).

- `POST`/`PUT /turmas` aceitam `professorIds: string[]` (≥1). `GET /turmas`
  devolve `professores: [{ _id, nome, email }]` e **mantém `professor`
  (= `professores[0]`) por um release**, para o front antigo não quebrar durante
  o deploy.
- Migração `scripts/migrations/2026-08-turmas-professorIds.ts`:
  `professorIds = [professorId]`; `professorId` fica derivado somente-leitura por
  um release e some no seguinte.
- **Todo ponto que compara `turma.professorId === requester.professorId` vira
  `turma.professorIds.includes(...)`.** Varrer: `services/shared/agendaAccess.ts`,
  `services/turmas/listTurmas.ts`, `services/turmas/listCriancasDaTurma.ts`, os
  services de `planosAula` (create/update/list), o escopo por turma de
  `listAvisos.ts` — e, quando existirem, `mensagens` (K) e `eventos` (M).
- **`planosAula.professorId` muda de significado:** hoje é derivado de
  `turma.professorId` ("o professor da turma"); passa a ser o **autor** (o
  `professorId` do requester; admin cai em `turma.professorIds[0]`).
- `DELETE /professores/{id}` hoje bloqueia com `409` se houver qualquer turma
  vinculada; passa a bloquear só se o professor for o **único** de alguma turma
  — caso contrário é removido do array.

**Agenda diária — campos novos** (AG2-03, AG2-05, AG2-07).

`POST /agenda` e `PUT /agenda/{id}` passam a aceitar:

```ts
tarefaCasa?: { status: "feito" | "nao_feito" | "incompleto"; observacao?: string };
presenca?: {
  status: "presente" | "falta" | "atrasado";
  horaChegada?: string;      // "HH:mm" — OBRIGATÓRIO quando status = "atrasado" (ajv if/then)
  justificativa?: string;
};
anexos?: { key: string; nome: string; contentType: string; tamanho: number }[];  // máx. 5
```

> Lembrete da regra já vigente: **`PUT /agenda/{id}` não é patch parcial** —
> `updateAgendaService` monta o `$set` com todos os campos, usando `[]`/`null`
> para o que veio ausente. Então `tarefaCasa`/`presenca`/`anexos` omitidos no
> corpo são lidos como **esvaziados**, não como "sem alteração". O front continua
> mandando o estado completo do formulário a cada `PUT`.
>
> `GET /agenda` e `GET /agenda/historico` devolvem `anexos[].url` (presigned de
> 1h) além de `key`/`nome`/`contentType`/`tamanho`.

**✅ Notificação de aniversário** (OPS-05).

Cron `notificarAniversariantes` (`src/handlers/criancas/notificarAniversariantes.ts`
+ `src/services/criancas/notificarAniversariantes.ts`), diário às 08:00 GMT-3
(`cron(0 11 * * ? *)`). Sem rota HTTP.

- Casa por **`criancas.nascimentoDiaMes: "MM-DD"`**, campo derivado indexado
  preenchido no `POST`/`PUT /criancas` (`diaMesDeData` em `utils/date.ts`) +
  migração do acervo (`scripts/migrations/2026-08-criancas-nascimentoDiaMes.ts`,
  `npm run migrate:criancas-nascimentoDiaMes`). A alternativa (`$expr` com
  `$dayOfMonth`/`$month` e `timezone`) força collection scan diário.
- Notifica os **responsáveis** da criança, agregado por pessoa — 1 push mesmo
  com 2+ filhos aniversariantes no mesmo dia ("Hoje é aniversário da Sofia! 🎉"
  ou "Hoje é aniversário de 2 dos seus filhos: Sofia, Davi! 🎉") — e **todos os
  professores** da turma (OPS-03: `turma.professorIds[]`, não só o primeiro),
  1 push agregado por turma ("Hoje é aniversário de 2 alunos da Turma Azul!").
  Admin não recebe push — vê um card no dashboard (`DashboardScreen.tsx`,
  `aquarela_app`), calculado no cliente a partir do `GET /criancas` já
  carregado (sem endpoint novo).
- Idempotência: `criancas.ultimoAniversarioNotificadoEm` — cron reexecutado no
  mesmo dia não duplica (filtro `$lt` hoje-meia-noite-Brasil).

**Novos códigos de erro do lote:** `PODE_RETIRAR_EXCLUSIVO_ADMIN` (403) ·
`RESPONSAVEL_EXCLUSIVO_ADMIN` (403) ·
`TIPO_ANEXO_INVALIDO` (422) · `ANEXO_MUITO_GRANDE` (422) · `ANEXO_INVALIDO` (422)
· `SEM_CONSENTIMENTO_IMAGEM` (422) · `EVENTO_LIMITE_FOTOS` (422) ·
`MENSAGEM_LIMITE_ANEXOS` (422).

---

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
