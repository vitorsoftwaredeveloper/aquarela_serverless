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
turmas   ──1:N── planosAula
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
  professorId: ObjectId (idx),
  capacidade?: number,
  createdAt, updatedAt }
```
> Contagem de crianças = query em `criancas` por `turmaId` (não duplicar).

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
{ _id, turmaId: ObjectId (idx), professorId: ObjectId,
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
Um usuário pode ter N dispositivos (celular + notebook). `token` é upsert idempotente — se reaparecer vinculado a outro `usuarioId`, o registro mais recente vence (dispositivo compartilhado por outro login). Hard delete real (não soft): token invalidado pelo FCM (`registration-token-not-registered`) ou removido pelo próprio usuário (logout) não tem valor de auditoria.

---

## 4. Índices (resumo)

| Coleção | Índice | Motivo |
|---|---|---|
| usuarios | `cognitoSub` unique, `email` unique | login/lookup |
| criancas | `cpfHash` unique, `turmaId` | busca e listagem por turma |
| agendasDiarias | `{criancaId, data}` unique; `{criancaId, data:-1}` | dia e histórico |
| mensalidades | `{criancaId, ano, mes}` unique; `status` | financeiro do pai/inadimplência |
| pagamentos | `txid` unique | conciliação/idempotência |
| despesas | `data` | balanço por período |
| avisos | `{createdAt:-1}` | listagem por mais recente |
| dispositivos | `token` unique; `usuarioId` | resolver tokens do usuário no envio; upsert por token |

---

## 5. Consultas-chave (padrões de acesso)

- **Agenda do dia (pai/professor):** `agendasDiarias.findOne({ criancaId, data })`.
- **Histórico:** `agendasDiarias.find({ criancaId, data: { $gte, $lte } }).sort({ data: -1 })`.
- **Meses do responsável:** `mensalidades.find({ criancaId, ano }).sort({ mes })`.
- **Inadimplentes:** `mensalidades.find({ status: "atrasado" })` + join lógico com `criancas`.
- **Balanço mensal:** agregação de `mensalidades` pagas − `despesas` no período (`$group` por mês/ano).
- **Alunos da turma:** `criancas.find({ turmaId })`.

---

## 6. Integridade & regras
- **Hard delete** em todas as entidades — não existe soft delete/`ativo` no sistema. `criancas` remove em cadeia (agenda, mensalidades, pagamentos); `turmas` bloqueia a remoção enquanto houver crianças vinculadas.
- **Transações** (replicaSet) ao gerar mensalidade + baixa de pagamento.
- Geração mensal de `mensalidades` por job agendado a partir de `configPrecos`/`criancas.financeiro`.
- Auditoria: `createdAt`/`updatedAt` em tudo; log de alterações no cadastro de criança e em baixas financeiras.

---

## 7. Retenção & LGPD
- Dados de saúde e documentos apenas enquanto a criança estiver ativa + período legal; anonimização/expurgo após o prazo.
- Consentimento dos responsáveis registrado no cadastro (`criancas.consentimentoLgpd`), obrigatório em `POST /criancas`, imutável depois.
- Backups criptografados; acesso segregado por papel na aplicação (o banco não expõe dados diretamente ao cliente).
