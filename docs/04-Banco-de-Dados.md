# Aquarela Kids — Banco de Dados

> Modelo de dados MongoDB (Mongoose). Versão 0.1 — 16/07/2026

---

## 1. Abordagem

Banco **MongoDB** com **Mongoose**. Modelagem orientada aos acessos mais frequentes (agenda do dia, financeiro por criança). Referências entre coleções (não embutir o que muda de dono ou cresce sem limite), com **embed** apenas para dados que sempre acompanham o pai (ex.: itens de saúde dentro da criança, itens da agenda dentro do registro do dia).

Autenticação fica no **Cognito**; a coleção `usuarios` guarda o perfil/vínculos do app espelhando o `sub` do Cognito.

---

## 2. Diagrama de relacionamentos (ER lógico)

```
usuarios ──(responsavel)──< responsavelCrianca >── criancas
   │                                                 │
   └──(professor)── professores ──1:N── turmas ──1:N─┘
                                          │
criancas ──1:N── agendasDiarias          │
criancas ──1:N── mensalidades ──1:1── pagamentos
criancas ──1:N── mensagens ──(anexos)── S3
turmas   ──1:N── planosAula
turmas   ──1:N── eventos ──(fotos)── S3
(admin)  ── despesas
         ── configPrecos (singleton)
         ── avisos ──(opcional)── turmas
```

---

## 3. Coleções

### `usuarios`
Perfil de app espelhando o Cognito.
```
{
  _id, cognitoSub: string (idx, unique),
  nome, email (idx, unique),
  papel: "admin" | "professor" | "responsavel",
  telefone?,
  professorId?: ObjectId,        // se papel=professor
  criancasVinculadas?: [ObjectId],// se papel=responsavel (atalho de leitura)
  createdAt, updatedAt
}
```

### `criancas`
```
{
  _id,
  nome, dataNascimento: Date,
  cpf: string (cifrado), cpfHash: string (idx, unique),  // ver nota de criptografia
  foto?: string,                     // KEY do objeto no S3, nunca URL nem binário
  turmaId?: ObjectId | null (idx),   // opcional — ver nota abaixo
  responsaveis: [{
    usuarioId?: ObjectId, nome, cpf: string (cifrado), parentesco,
    telefone, email, podeRetirar: boolean
  }],
  saude: {                            // todos os campos abaixo cifrados
    alergias: [string],
    restricoesAlimentares: [string],
    medicacoesContinuas: [{ nome, dose, horario, observacao? }],
    condicoesAtipicas?: [string],
    cuidadosEspeciais?: string,
    observacoes?: string
  },
  financeiro: { planoId?: ObjectId, valorMensalidade: number, diaVencimento: number },
  consentimentoLgpd: { aceito: boolean, aceitoEm: Date },  // QA-03
  auditoria: [{ usuarioId: ObjectId, alteradoEm: Date, campos: [string] }],  // CAD-09
  createdAt, updatedAt
}
```
Índices: `cpfHash` (unique), `turmaId`, texto em `nome`.

> `turmaNome` **não é persistido** — `GET /criancas` resolve o nome da
> turma a partir de `turmaId` (lookup em `turmas`) e devolve no payload de
> resposta, sem gravar no documento.

> **Implementado com 4 divergências deliberadas desta especificação** (ver
> `aquarela_serverless`):
> - `turmaId` é **opcional/nullable**, não obrigatório — necessário para
>   `DELETE /turmas/{id}/criancas/{criancaId}` (desvincular sem apagar a
>   criança).
> - Adicionado `auditoria` (array embutido, capado às últimas 50 entradas)
>   para atender CAD-09 (quem/quando alterou o cadastro, especialmente
>   campos de saúde) sem precisar de uma coleção nova nesta fase.
> - **Criptografia em repouso (LGPD):** `cpf`, `responsaveis[].cpf` e todo
>   `saude.*` são cifrados (AES-256-GCM, IV aleatório por gravação — ver
>   `src/libs/crypto.ts`) antes de gravar; o service continua lendo/gravando
>   texto plano, a cifragem acontece no `crianca.repository.ts`. Como o
>   ciphertext varia a cada gravação, a unicidade de CPF não pode mais viver
>   num índice sobre `cpf` — `cpfHash` (HMAC-SHA256 determinístico, mesma
>   chave) carrega esse índice único no lugar dele.
> - **`foto` guarda a key do S3**, não o binário nem uma URL. O objeto vive
>   no bucket privado `<service>-<stage>-fotos-<accountId>`, sob
>   `criancas/{criancaId}/{uuid}.{jpg|png|webp}`. Deliberadamente **não**
>   se armazena a imagem no Mongo: base64 infla o documento em ~33%, entra
>   no working set em RAM e estouraria a resposta de uma listagem de turma.
>   A imagem sobe em base64 no corpo de `POST /criancas` / `PUT /criancas/{id}`
>   (teto de 2MB decodificados) e a leitura sai por `fotoUrl` pré-assinada
>   de 1h — ver `docs/03-Backend.md`.
> - **`consentimentoLgpd`** (QA-03): `{ aceito: true, aceitoEm }` gravado
>   pelo próprio backend no `POST /criancas` (nunca lido do payload — o
>   client só manda `consentimentoLgpd: boolean`), rejeitando o cadastro com
>   `422 CONSENTIMENTO_LGPD_OBRIGATORIO` se vier `false`/ausente. Campo
>   **imutável**: não existe em `IUpdateCriancaPayload`, então `PUT
>   /criancas/{id}` não altera o consentimento já registrado.

> **`financeiro.valorMensalidade` é sempre o valor livre, `planoId` é só
> etiqueta.** O backend nunca deriva `valorMensalidade` de `planoId`/
> `configPrecos` — o valor gravado é sempre o número que o client manda em
> `POST`/`PUT`. `planoId` é opcional e serve só de referência (qual plano
> fixo o admin usou de base, se usou algum); sumir com `planoId` (ou nunca
> mandar) representa um **valor personalizado/acordo fechado com o
> responsável**, sem vínculo com nenhum plano de `configPrecos`. Não existe
> "sobrepor o plano" no backend — o valor digitado **é** o que vale, sempre;
> quem decide se aquele número veio de um plano ou foi negociado é a UI
> (mandar `planoId` junto ou deixar de fora).

### `professores`
```
{ _id, usuarioId: ObjectId, nome, cpf, telefone, email,
  formacao?, foto?: string, createdAt, updatedAt }
```
> `foto`: mesma key-no-S3/`fotoUrl`-pré-assinada de `criancas.foto` — ver
> `docs/03-Backend.md`. `DELETE /professores/{id}` é hard delete e apaga a
> foto do bucket junto com o cadastro.

### `turmas`
```
{ _id, nome, descricao,
  faixaEtaria: { min: number, max: number },   // ex.: {1,3}
  professorIds: [ObjectId] (idx),   // ≥ 1
  capacidade?: number,
  createdAt, updatedAt }
```
> Contagem de crianças = query em `criancas` por `turmaId` (não duplicar).
>
> **✅ OPS-03 concluído — múltiplos professores por turma.** `professorId: ObjectId`
> único virou `professorIds: [ObjectId]` (mínimo 1). `professorId`/`professor` **não
> são persistidos** — `listTurmas`/`getTurmaById` os calculam na resposta
> (`= professorIds[0]`/`professores[0]`) só como compat de 1 release para o front
> antigo não quebrar; somem no release seguinte. Migração
> `scripts/migrations/2026-08-turmas-professorIds.ts`
> (`npm run migrate:turmas-professorIds`) converte o acervo já gravado
> (`professorIds = [professorId]`, unset do campo antigo). Ownership por turma
> deixou de ser igualdade e virou `includes` — `getTurmaById`, `listTurmas`,
> `listCriancas`, `getCriancaById`, `listAvisos`, `agendaAccess`, `mensagemAccess`.
> `planosAula.professorId` mudou de significado: era "o professor da turma"
> (derivado), agora é **o autor** do plano — não recalcula se o plano muda de
> turma. `DELETE /professores/{id}` só bloqueia se o professor for o **único** de
> alguma turma; senão sai do array (`$pull`).

### `agendasDiarias`
Um documento por **criança + dia**.
```
{
  _id, criancaId: ObjectId (idx), turmaId: ObjectId,
  data: Date (idx),                 // normalizada 00:00
  registradoPor: ObjectId (professor),
  alimentacao: [{ refeicao: "cafe"|"almoco"|"lanche"|"janta",
                  aceitacao: "tudo"|"parte"|"recusou", obs? }],
  sono: [{ inicio: string, fim: string }],
  atividades: [string],
  humor?: "feliz"|"tranquilo"|"neutro"|"choroso",
  higiene?: { fraldas?: number, obs? },
  medicacoesAdministradas: [{ nome, dose, hora, aplicadaPor }],
  intercorrencias: [{ tipo:"febre"|"queda"|"doenca"|"outro",
                      descricao, hora, notificado: boolean }],
  observacoes?: string,
  fotos?: [string],                 // S3 — fase 2
  enviadaEm: Date | null,           // marcado só após POST /agenda/{id}/enviar resolver sem erro
  createdAt, updatedAt
}
```
Índice composto único: `{ criancaId: 1, data: 1 }`. Índice `{ criancaId, data: -1 }` para histórico.

### `planosAula`
```
{ _id, turmaId: ObjectId (idx), professorId: ObjectId,  // autor (OPS-03), não "o professor da turma"
  titulo, descricao, data: Date, objetivos?: [string],
  materiais?: [string], createdAt, updatedAt }
```

### `mensalidades`
Uma por criança + competência (mês/ano).
```
{
  _id, criancaId: ObjectId (idx), ano: number, mes: number,
  valor: number, vencimento: Date,
  status: "aberto" | "pago" | "atrasado" | "cancelado",
  pagamentoId?: ObjectId,
  createdAt, updatedAt
}
```
Índice único: `{ criancaId: 1, ano: 1, mes: 1 }`.

### `pagamentos`
```
{
  _id, mensalidadeId: ObjectId, criancaId: ObjectId,
  metodo: "pix" | "dinheiro",
  provedor: "mercadopago" | "manual",
  txid: string (idx, unique), providerPaymentId?: string,
  valor: number,
  status: "pendente" | "pago" | "expirado" | "falhou",
  pixCopiaECola?: string, qrBase64?: string,
  reciboUrl?: string,               // S3
  recebidoPor?: ObjectId,           // usuarios (admin) — só quando provedor="manual"
  pagoEm?: Date, createdAt, updatedAt
}
```
`provedor:"manual"` = pagamento em dinheiro físico registrado por um admin (`POST /pagamentos/manual`, ver docs/03 §7.1): `status:"pago"` já na criação (nunca passa por `pendente`), `txid` gerado internamente (não é PIX real), `recebidoPor` obrigatório — trilha de auditoria de quem deu a baixa.

### `despesas`
```
{ _id, descricao, categoria: string, valor: number,
  data: Date (idx), lancadoPor: ObjectId, anexoUrl?: string,
  createdAt, updatedAt }
```

### `relatoriosAnuais` — fechamento financeiro do ano
```
{ _id, ano: number (unique), consolidadoEm: Date,
  totais: { pagamentos, despesas, saldo, quantidadePagamentos,
            criancasComPagamento, ticketMedio },
  meses: [{ mes: 1..12, pagamentos, despesas, saldo,
            quantidadePagamentos }],
  criancas: [{ criancaId: ObjectId, nome: string,
               turmaNome?: string, total: number,
               meses: [{ mes, valor, quantidadePagamentos }] }],
  createdAt, updatedAt }
```
Gravado pelo cron `limparDadosAnoAnterior` **antes** de apagar os `pagamentos`
do ano, e servido por `GET /financeiro/relatorio-anual`. Depois do expurgo é a
única fonte do histórico financeiro daquele ano. `nome`/`turmaNome` são
desnormalizados de propósito: a criança pode ser removida do cadastro depois, e
o fechamento não pode mudar retroativamente. Upsert por `ano` — reexecutar o
cron sobrescreve em vez de duplicar.

### `configPrecos` (singleton)
```
{ _id, planos: [{ nome, tipo:"integral"|"meioPeriodo",
                  valorMensal: number, valorDiario?: number,
                  descontos?: [{ meses: number, percentual: number }] }],
  atualizadoPor, updatedAt }
```
Usado pelo simulador e pela geração de mensalidades.

### `avisos`
```
{ _id, titulo, corpo,
  autorId: ObjectId (usuarios),
  turmaId?: ObjectId (turmas),   // ausente = visível a todos; presente = só à turma
  createdAt, updatedAt }
```
Hard delete — `DELETE /avisos/{id}` apaga o documento. Remover a turma apaga junto os avisos vinculados a ela. Leitura: admin vê todos; professor/responsável só os avisos globais ou da(s) turma(s) que lecionam/filho está matriculado.

### `dispositivos`
```
{ _id, usuarioId: ObjectId (usuarios),
  token: string,          // token FCM do navegador/PWA — identifica o dispositivo, não a pessoa
  plataforma: "android"|"ios"|"web"|"desktop",
  ultimoUsoEm, createdAt, updatedAt }
```
Um usuário pode ter N dispositivos (celular + notebook). `token` é upsert idempotente — se reaparecer vinculado a outro `usuarioId`, o registro mais recente vence (dispositivo compartilhado por outro login). Hard delete real (não soft): token invalidado pelo FCM (`registration-token-not-registered`) ou removido pelo próprio usuário (logout) não tem valor de auditoria. `DELETE /usuarios/{id}` também apaga em cadeia todos os `dispositivos` do `usuarioId` removido.

---

### `mensagens` — Épico K (recados responsável ↔ professor)
```
{
  _id,
  criancaId: ObjectId (idx),        // thread é sempre por criança
  turmaId: ObjectId (idx),          // DERIVADO da criança no backend, nunca do payload
  autorId: ObjectId (usuarios),
  autorNome: string,                 // snapshot do nome no envio, para exibir no balão sem join
  autorPapel: "responsavel" | "professor",
  corpo: string,                    // ≤ 2000 chars
  anexos: [{ key: string, nome: string, contentType: string, tamanho: number }],  // máx. 5
  createdAt, updatedAt
}
```
Índice: `{criancaId, createdAt: -1}` (thread paginada, e a base do fetch
incremental por `desde`).

> `turmaId` é redundante com `crianca.turmaId` **de propósito**: sem ele, contar
> não lidas de uma turma exigiria varrer todas as crianças a cada abertura de
> tela. É snapshot no momento do envio — criança que muda de turma depois não
> reescreve o histórico, e isso é o comportamento desejado (o recado pertence à
> professora que o recebeu).
>
> `anexos[].key` aponta para `mensagens/{criancaId}/{uuid}.{ext}` no
> **`FotosBucket`** (o mesmo da foto de criança — nenhum bucket novo). O binário
> nunca entra no Mongo. Leitura por presigned GET de 1h, gerada em
> `GET /mensagens`. Hard delete (`DELETE /mensagens/{id}`) apaga o documento e os
> objetos do S3 juntos.
>
> **Sem rastreio de leitura no banco.** Quem leu o recado não é dado de
> negócio — o app é push-driven (chega notificação → busca `/mensagens`) e o
> contador de "não lidas" é local ao cliente, comparando `createdAt` contra a
> última abertura da thread. Evita 1 write + 1 query extra por
> abertura/mensagem sem perder nada que o produto realmente usa.

### `eventos` — Épico M (mural de fotos) ✅ implementado (02/08/2026)
```
{
  _id, titulo, descricao?, data: Date,
  turmaId?: ObjectId (idx),         // ausente = evento da escola inteira
  autorId: ObjectId (usuarios),
  fotos: [{
    key: string, nome: string, contentType: string, tamanho: number,
    legenda?: string, ordem: number,
    enviadoPor: ObjectId, enviadoEm: Date
  }],                               // máx. 50 — SEM criancasIds (ver nota abaixo)
  publicado: boolean,               // rascunho × publicado
  publicadoEm?: Date,               // idempotência da notificação
  createdAt, updatedAt
}
```
Índices: `{turmaId, data: -1}` e `{publicado, data: -1}`.

> **Não confundir com `avisos`:** avisos são texto do admin; eventos são álbuns
> de foto do professor. Mesma mecânica de escopo (`turmaId` ausente = todos),
> coleções e telas diferentes.
>
> Rascunho existe porque o professor sobe fotos ao longo do dia — nada aparece
> ao responsável enquanto `publicado: false`. `publicadoEm` é o que torna
> `POST /eventos/{id}/publicar` idempotente: 2ª chamada não renotifica.
>
> Hard delete apaga todos os objetos do S3 do prefixo `eventos/` referentes às
> `fotos[].key` do evento (key é `eventos/{uuid}.{ext}`, sem segmento de
> `eventoId` — mesma convenção plana de `mensagens/` e `agendas/`, ver
> `src/services/anexos/criarUploadUrlAnexo.ts`).
>
> **Sem `fotos[].criancasIds`.** A especificação original previa marcar quem
> aparece em cada foto para bloquear a publicação sem consentimento — decisão
> de produto (02/08/2026) descartou a marcação: custo de UX pro professor
> maior que o ganho, e o controle real já é o consentimento registrado em
> `criancas.consentimentoImagem` + o professor conhecer a própria turma. Não
> há, portanto, nenhum `422` de bloqueio de publicação por falta de
> consentimento — `POST /eventos/{id}/publicar` só falha se o evento não
> existir ou o requisitante não tiver acesso.

### `criancas` — campos novos do lote de 01/08/2026
```
consentimentoImagem?: {           // ✅ Épico M — REVOGÁVEL (≠ consentimentoLgpd)
  aceito: boolean, aceitoEm: Date, registradoPor: ObjectId
},
nascimentoDiaMes: string (idx),   // ✅ OPS-05 — "MM-DD" derivado de dataNascimento
ultimoAniversarioNotificadoEm: Date | null  // ✅ OPS-05 — idempotência do cron
```

> **`consentimentoImagem` é o oposto de `consentimentoLgpd` em ciclo de vida.**
> `consentimentoLgpd` é obrigatório no `POST /criancas` e **imutável** (fora de
> `IUpdateCriancaPayload`). `consentimentoImagem` é **opcional** — recusar não
> impede a matrícula — e **revogável a qualquer momento pelo responsável**
> (`PUT /criancas/{id}`, campo fora de `CAMPOS_EXCLUSIVOS_ADMIN`), o que é
> justamente o que a LGPD exige de consentimento para uso de imagem.
> **Revogar não tem efeito técnico retroativo sobre `eventos`** — como não há
> marcação por foto (`criancasIds` foi descartado, ver acima), não existe o
> que "desmarcar"; o registro é só histórico/jurídico.
>
> **`nascimentoDiaMes` existe para não varrer a coleção todo dia.** Casar
> aniversário por `$expr` com `$dayOfMonth`/`$month` + `timezone` funciona, mas
> não usa índice. O campo derivado (`"MM-DD"`, gravado no `POST`/`PUT` e
> preenchido no acervo por migração) resolve com um índice simples.

### `mensalidades` — campos novos do lote de 01/08/2026
```
inadimplenteDesde?: Date | null,  // COB-07 — null enquanto dentro da carência
cobrancas: [{                     // COB-03 — capado nas últimas 12 entradas
  enviadaEm: Date,
  canal: "push",
  gatilho: "dia05" | "dia20" | "manual"
}]
```

> **`inadimplenteDesde` não substitui `status`.** `status: "atrasado"` continua
> significando "vencimento passou" (transição feita por
> `atualizarMensalidadesAtrasadas`). `inadimplenteDesde` marca o **corte formal**
> depois da carência configurada em `configPrecos.inadimplencia` — é o que
> alimenta `GET /financeiro/inadimplentes` e o KPI do dashboard a partir de
> agora. Entre o vencimento e o corte a mensalidade é `atrasado` **e não**
> inadimplente. Baixa (PIX, webhook ou manual) limpa o campo na mesma transação.
>
> `cobrancas[]` é o que torna o cron dos dias 05/20 idempotente: mesma
> `(mensalidadeId, gatilho, competência do disparo)` não redispara. Capado em 12
> entradas pelo mesmo motivo de `criancas.auditoria` — histórico de notificação
> não justifica crescer sem limite dentro do documento.

### `agendasDiarias` — campos novos do lote de 01/08/2026
```
tarefaCasa?: { status: "feito"|"nao_feito"|"incompleto", observacao?: string },
presenca?: {
  status: "presente"|"falta"|"atrasado",
  horaChegada?: string,           // "HH:mm" — obrigatório quando status = "atrasado"
  justificativa?: string
},
anexos?: [{ key, nome, contentType, tamanho }],  // máx. 5, mesmo shape de mensagens.anexos[]
ultimoEnvioEm?: Date | null,      // AG2-01 — último (re)envio; enviadaEm segue sendo o 1º
enviosCount: number               // default 0
```

> `enviadaEm` **não muda de significado** — continua marcando o 1º envio, que é o
> que a tela do professor exibe. `ultimoEnvioEm`/`enviosCount` são o que sustenta
> o reenvio a cada edição (AG2-01) e o **debounce de 10 minutos** que evita
> transformar 5 saves seguidos em 5 pushes.
>
> `fotos?: [string]` (marcado como "S3 — fase 2" desde a v0.1) **continua sem
> uso** — AGD-10 foi descartado em 31/07/2026 e o anexo de agenda agora vive em
> `anexos[]`, com o mecanismo de presigned PUT do Épico K. Não reaproveitar
> `fotos` para isso.

### `configPrecos` — campo novo (COB-06)
```
inadimplencia: { diasCarencia: number }
// default { diasCarencia: 10 }; 0 ≤ diasCarencia ≤ 365
```

> **Formato novo desde 02/08/2026** — substitui `{ diaCorte, mesesCarencia }`,
> que era um corte de calendário comum a todas as crianças. Agora a carência é
> contada **a partir do `vencimento` de cada mensalidade**: com o default,
> vencimento 05/08 vira inadimplente em **15/08**.
>
> Não há script de migração: o documento antigo continua no banco, mas o schema
> do Mongoose descarta os campos que saíram e `getConfigPrecosService`
> reconstrói `inadimplencia` com o default. O formato velho some de vez no
> primeiro `PUT /config/precos`.

---

## 4. Índices (resumo)

| Coleção | Índice | Motivo |
|---|---|---|
| usuarios | `cognitoSub` unique, `email` unique | login/lookup |
| criancas | `cpfHash` unique, `turmaId` | busca e listagem por turma |
| agendasDiarias | `{criancaId, data}` unique; `{criancaId, data:-1}` | dia e histórico |
| mensalidades | `{criancaId, ano, mes}` unique; `status` | financeiro do pai/transição atrasado |
| pagamentos | `txid` unique | conciliação/idempotência |
| despesas | `data` | balanço por período |
| avisos | `{createdAt:-1}` | listagem por mais recente |
| dispositivos | `token` unique; `usuarioId` | resolver tokens do usuário no envio; upsert por token |
| mensagens | `{criancaId, createdAt:-1}` | thread da criança e fetch incremental (`desde`) |
| eventos | `{turmaId, data:-1}`; `{publicado, data:-1}` | mural por turma; listagem do responsável só do publicado |
| criancas | `nascimentoDiaMes` | cron de aniversário sem collection scan |
| turmas | `professorIds` | "minhas turmas" com mais de um professor por turma |
| mensalidades | `inadimplenteDesde` | lista de inadimplentes e KPI do dashboard |
| pagamentos | `{status, pagoEm}` | balanço em regime de caixa (agrega por data do pagamento) |
| relatoriosAnuais | `ano` unique | leitura do fechamento e upsert idempotente do cron anual |

---

## 5. Consultas-chave (padrões de acesso)

- **Agenda do dia (pai/professor):** `agendasDiarias.findOne({ criancaId, data })`.
- **Histórico:** `agendasDiarias.find({ criancaId, data: { $gte, $lte } }).sort({ data: -1 })`.
- **Meses do responsável:** `mensalidades.find({ criancaId, ano }).sort({ mes })`.
- **Inadimplentes:** `mensalidades.find({ inadimplenteDesde: { $ne: null } })` + join lógico com `criancas`.
- **Balanço mensal:** agregação de `mensalidades` pagas − `despesas` no período (`$group` por mês/ano).
- **Alunos da turma:** `criancas.find({ turmaId })`.

---

## 6. Integridade & regras
- **Hard delete** em todas as entidades — não existe soft delete/`ativo` no sistema. `criancas` remove em cadeia (agenda, mensalidades, pagamentos); `turmas` bloqueia a remoção enquanto houver crianças vinculadas. `relatoriosAnuais` é a exceção deliberada: sobrevive à remoção da criança, e por isso desnormaliza `nome`/`turmaNome`.
- **Transações** (replicaSet) ao gerar mensalidade + baixa de pagamento.
- Geração mensal de `mensalidades` por job agendado a partir de `configPrecos`/`criancas.financeiro`.
- **Anexo nunca vive no Mongo.** `mensagens.anexos[]`, `agendasDiarias.anexos[]` e
  `eventos.fotos[]` guardam só a `key` do S3 (bucket `FotosBucket`, privado). Todo
  hard delete que apaga o documento apaga os objetos correspondentes; objeto que
  subiu e nunca foi vinculado é limpo pelo cron diário `limparAnexosOrfaos`.
- **Inadimplência é derivada por cron, não calculada na leitura.**
  `mensalidades.inadimplenteDesde` é gravado por `marcarInadimplentes` (diário,
  00:05 GMT-3) a partir de `configPrecos.inadimplencia` — a leitura só filtra.
- Auditoria: `createdAt`/`updatedAt` em tudo; log de alterações no cadastro de criança e em baixas financeiras.

---

## 7. Retenção & LGPD
- Dados de saúde e documentos apenas enquanto a criança estiver ativa + período legal; anonimização/expurgo após o prazo.
- **Expurgo anual de histórico** (cron `limparDadosAnoAnterior`, ver `docs/03-Backend.md`): todo `agendasDiarias`, `mensagens` e `pagamentos` (+ os anexos no S3) de todas as crianças com mais de um ano é apagado em definitivo, todo 1º de janeiro. Pagamento sai por `pagoEm` (+ `status: "pago"`), não por `createdAt` — o mesmo critério da consolidação. Preserva o cadastro (`criancas`), `mensalidades` e `despesas`; `mensalidades` fica de fora também porque o cron `gerarMensalidadesAno` roda no mesmo horário criando as competências do ano novo. O fechamento financeiro do ano é gravado em `relatoriosAnuais` **antes** do expurgo — sem isso, apagar `pagamentos` zeraria o balanço histórico e o relatório anual.
- Consentimento dos responsáveis registrado no cadastro (`criancas.consentimentoLgpd`), obrigatório em `POST /criancas`, imutável depois.
- Backups criptografados; acesso segregado por papel na aplicação (o banco não expõe dados diretamente ao cliente).
