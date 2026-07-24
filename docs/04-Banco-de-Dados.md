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
  telefone?, ativo: boolean,
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
  foto?: string(S3),
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
  auditoria: [{ usuarioId: ObjectId, alteradoEm: Date, campos: [string] }],  // CAD-09
  ativo: boolean,
  createdAt, updatedAt
}
```
Índices: `cpfHash` (unique), `turmaId`, texto em `nome`.

> **Implementado com 3 divergências deliberadas desta especificação** (ver
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

### `professores`
```
{ _id, usuarioId: ObjectId, nome, cpf, telefone, email,
  formacao?, ativo: boolean, createdAt, updatedAt }
```

### `turmas`
```
{ _id, nome, descricao,
  faixaEtaria: { min: number, max: number },   // ex.: {1,3}
  professorId: ObjectId (idx),
  capacidade?: number, ativo: boolean,
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
  metodo: "pix",
  provedor: "mercadopago",
  txid: string (idx, unique), providerPaymentId?: string,
  valor: number,
  status: "pendente" | "pago" | "expirado" | "falhou",
  pixCopiaECola?: string, qrBase64?: string,
  reciboUrl?: string,               // S3
  pagoEm?: Date, createdAt, updatedAt
}
```

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
  ativo: boolean, createdAt, updatedAt }
```
Soft delete (`ativo:false`). Leitura: admin vê tudo; professor/responsável só `ativo:true` sem `turmaId` ou com `turmaId` de turma que lecionam/filho está matriculado.

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
| avisos | `{ativo, createdAt:-1}` | listagem por mais recente |

---

## 5. Consultas-chave (padrões de acesso)

- **Agenda do dia (pai/professor):** `agendasDiarias.findOne({ criancaId, data })`.
- **Histórico:** `agendasDiarias.find({ criancaId, data: { $gte, $lte } }).sort({ data: -1 })`.
- **Meses do responsável:** `mensalidades.find({ criancaId, ano }).sort({ mes })`.
- **Inadimplentes:** `mensalidades.find({ status: "atrasado" })` + join lógico com `criancas`.
- **Balanço mensal:** agregação de `mensalidades` pagas − `despesas` no período (`$group` por mês/ano).
- **Alunos da turma:** `criancas.find({ turmaId, ativo: true })`.

---

## 6. Integridade & regras
- **Soft delete** (`ativo: false`) para criança/turma/usuário — preserva histórico financeiro e de agenda.
- **Transações** (replicaSet) ao gerar mensalidade + baixa de pagamento.
- Geração mensal de `mensalidades` por job agendado a partir de `configPrecos`/`criancas.financeiro`.
- Auditoria: `createdAt`/`updatedAt` em tudo; log de alterações no cadastro de criança e em baixas financeiras.

---

## 7. Retenção & LGPD
- Dados de saúde e documentos apenas enquanto a criança estiver ativa + período legal; anonimização/expurgo após o prazo.
- Consentimento dos responsáveis registrado no cadastro.
- Backups criptografados; acesso segregado por papel na aplicação (o banco não expõe dados diretamente ao cliente).
