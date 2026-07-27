# Aquarela Kids — Backlog detalhado por épico

> Backlog de desenvolvimento derivado do PRD. Versão 0.1 — 16/07/2026
> Complementa: [00-Visao-Produto-PRD](./00-Visao-Produto-PRD.md)

---

## Como ler este backlog

- **ID:** `EPICO-NN` (ex.: `AGD-03`).
- **Prioridade (MoSCoW):** 🔴 Must · 🟡 Should · 🟢 Could · ⚪ Won't (fase futura).
- **Estimativa:** story points (escala Fibonacci: 1, 2, 3, 5, 8, 13). Referência: 1 pt ≈ meio dia; 8 pt ≈ 1 tarefa grande a quebrar.
- **Camada:** `INFRA` · `BE` (back) · `FE` (front) · `UX` · `FS` (full-stack).
- **Dep.:** tarefas que precisam estar prontas antes.
- **AC:** critérios de aceite resumidos.

Épicos: **0** Fundação · **A** Cadastros · **B** Agenda diária · **C** Portal dos pais · **D** Financeiro/PIX · **E** Simulador · **F** Pedagógico · **G** Qualidade/Go-live · **H** Mural de avisos.

Resumo de esforço do MVP no fim do documento.

---

## Épico 0 — Fundação técnica (INFRA)

Base para todos os demais épicos. Não entrega valor ao usuário final, mas destrava o desenvolvimento.

| ID     | Tarefa                                                                               | Prio | Pts | Camada | Dep.           | AC                                                                        |
| ------ | ------------------------------------------------------------------------------------ | ---- | --- | ------ | -------------- | ------------------------------------------------------------------------- |
| INF-01 | Setup do monorepo/repos (front e back) + convenções (lint, prettier, commit)         | 🔴   | 3   | INFRA  | —              | Repo com CI de lint/build; padrão de branch e PR definido                 |
| INF-02 | Provisionar AWS: Cognito User Pool + grupos (admin/professor/responsavel)            | 🔴   | 5   | INFRA  | —              | User Pool criado; 3 grupos; app client; login de teste funciona           |
| INF-03 | Base Serverless v3 (esbuild, offline, prune) + estrutura de handlers                 | 🔴   | 5   | BE     | INF-01         | `serverless-offline` sobe local;                                          |
| INF-04 | Conexão MongoDB (Atlas + docker-compose local com replicaSet) reutilizável em Lambda | 🔴   | 3   | BE     | INF-03         | Conexão cacheada entre invocações; `callbackWaitsForEmptyEventLoop=false` |
| INF-05 | SSM Parameter Store por stage (`config/<stage>.json`) para segredos                  | 🔴   | 2   | BE     | INF-03         | Segredos lidos de SSM; nada sensível no repo                              |
| INF-06 | Middlewares base: auth JWT, roleGuard, validação ajv, errorHandler                   | 🔴   | 5   | BE     | INF-03, INF-02 | Rota protegida exige token; papel errado → 403; erro padronizado          |
| INF-07 | Base Next.js 16 (App Router) + ThemeContext + tokens/CSS Modules                     | 🔴   | 3   | FE     | INF-01         | App sobe; tema claro/escuro; tokens aplicados                             |
| INF-08 | AuthContext + integração Amplify v6 (login/logout/sessão/role)                       | 🔴   | 5   | FE     | INF-07, INF-02 | Login real no Cognito; guardas por grupo de rota funcionam                |
| INF-09 | Camada `services/api.ts` (axios + axios-retry + interceptor JWT)                     | 🔴   | 2   | FE     | INF-08         | Token anexado automaticamente; retry em falha transitória                 |
| INF-10 | Design System base (Button, Input, Select, Card, Modal, Toast, Badge)                | 🔴   | 8   | UX/FE  | INF-07         | Componentes documentados e reutilizáveis                                  |
| INF-11 | Pipeline CI/CD (deploy dev/staging/prod)                                             | 🟡   | 5   | INFRA  | INF-03, INF-07 | Merge na main → deploy automático em staging                              |
| INF-12 | Observabilidade: logs estruturados + CloudWatch + alarmes básicos                    | 🟡   | 3   | INFRA  | INF-03         | Logs em JSON por request; alarme de erro 5xx                              |

**Subtotal Épico 0:** 49 pts (MVP: ~41 pts sem os Should).

---

## Épico A — Cadastros base (CAD)

> **Escopo = CRUD completo** (create/read/update/**delete**) de `usuarios`, `professores`, `turmas` e `criancas`, mais os **vínculos** criança↔turma e criança↔responsável. Todo `DELETE` é **soft delete** (`ativo:false`) para preservar histórico.

| ID     | Tarefa                                                                                             | Prio | Pts | Camada | Dep.           | AC                                                                                        |
| ------ | -------------------------------------------------------------------------------------------------- | ---- | --- | ------ | -------------- | ----------------------------------------------------------------------------------------- |
| CAD-01 | Modelo + CRUD **usuários** (BE): criar, listar, remover, papéis                                    | 🔴   | 5   | BE     | INF-06         | Admin cria/remove usuário; papel gravado; espelha `cognitoSub`                            |
| CAD-02 | Provisionamento no Cognito ao criar usuário (convite/senha)                                        | 🔴   | 5   | BE     | CAD-01         | Novo usuário recebe acesso; vínculo Cognito↔`usuarios`                                    |
| CAD-03 | Tela admin de **gestão de usuários** (lista, criar, remover)                                       | 🔴   | 5   | FE     | CAD-01, INF-10 | Admin gerencia usuários; confirmação ao remover                                           |
| CAD-04 | Modelo + CRUD **professores** (BE)                                                                 | 🔴   | 3   | BE     | INF-06         | CRUD completo; vínculo `usuarioId`                                                        |
| CAD-05 | Tela admin **cadastro de professores** (FE)                                                        | 🔴   | 3   | FE     | CAD-04, INF-10 | Formulário com validação; lista e edição                                                  |
| CAD-06 | Modelo + CRUD **turmas** (BE): nome, descrição, faixa etária, professora                           | 🔴   | 5   | BE     | CAD-04         | Turma vincula 1 professora; faixa etária validada                                         |
| CAD-07 | Tela admin **cadastro de turmas** (FE)                                                             | 🔴   | 3   | FE     | CAD-06, INF-10 | Criar/editar turma; selecionar professora                                                 |
| CAD-08 | Modelo **criança** completo (BE): identificação, responsáveis, saúde, financeiro                   | 🔴   | 8   | BE     | INF-06         | Todos os campos da seção 6 do PRD; validação de CPF                                       |
| CAD-09 | Endpoint editar/atualizar criança + auditoria de alterações                                        | 🔴   | 5   | BE     | CAD-08         | Edição registra quem/quando; histórico de mudanças em saúde                               |
| CAD-10 | Tela **cadastro/edição de criança** em stepper (identificação → responsáveis → saúde → financeiro) | 🔴   | 8   | FE     | CAD-08, INF-10 | Stepper com validação por etapa; salva parcial; edição                                    |
| CAD-11 | Vínculo criança ↔ turma e criança ↔ responsável(is)                                                | 🔴   | 3   | FS     | CAD-06, CAD-08 | Criança aparece na turma; responsável enxerga o filho                                     |
| CAD-12 | Upload de foto da criança (S3)                                                                     | 🟡   | 3   | FS     | CAD-08         | Foto salva em S3; exibida no cadastro/agenda                                              |
| CAD-13 | Busca/filtro de crianças (por nome, turma, status)                                                 | 🟡   | 3   | FS     | CAD-08         | Lista filtrável e paginada                                                                |
| CAD-14 | Atualizar/remover **usuário** e **professor** (update + soft delete)                               | 🔴   | 3   | FS     | CAD-01, CAD-04 | `PUT`/`DELETE`; remover professor com turma → aviso/409; UI de editar/remover             |
| CAD-15 | **Remover criança** (soft delete) preservando agenda/financeiro                                    | 🔴   | 3   | FS     | CAD-09         | `DELETE /criancas/{id}`; some das listas; histórico intacto; confirmação na UI            |
| CAD-16 | **Remover turma** com regra de turma não-vazia (realocar/bloquear)                                 | 🔴   | 3   | FS     | CAD-06, CAD-11 | `DELETE /turmas/{id}` bloqueia se houver crianças ativas (409); opção de mover todos      |
| CAD-17 | **Vincular / desvincular / mover** criança ↔ turma                                                 | 🔴   | 5   | FS     | CAD-06, CAD-08 | `POST`/`DELETE /turmas/{id}/criancas`; `PATCH /criancas/{id}/turma`; UI de mover de turma |

**Subtotal Épico A:** 73 pts (MVP: ~67 pts).

---

## Épico B — Agenda diária (AGD)

| ID     | Tarefa                                                                                        | Prio | Pts | Camada | Dep.           | AC                                                      |
| ------ | --------------------------------------------------------------------------------------------- | ---- | --- | ------ | -------------- | ------------------------------------------------------- |
| AGD-01 | Modelo `agendasDiarias` (BE) + índice único `{criancaId, data}`                               | 🔴   | 5   | BE     | CAD-08         | 1 registro por criança/dia; estrutura da seção do banco |
| AGD-02 | Endpoints criar/editar registro do dia (professor)                                            | 🔴   | 5   | BE     | AGD-01, INF-06 | Professor da turma cria/edita; validação ajv            |
| AGD-03 | Endpoint ler agenda por dia + histórico por intervalo                                         | 🔴   | 3   | BE     | AGD-01         | Filtro por criança/data e por período (ordenado desc)   |
| AGD-04 | Autorização de acesso: professor só da sua turma; pai só do filho                             | 🔴   | 5   | BE     | AGD-02, CAD-11 | 403 em acesso indevido; ownership validado              |
| AGD-05 | Tela **registrar agenda** (professor): chips de alimentação, sono, atividades, humor, higiene | 🔴   | 8   | FE     | AGD-02, INF-10 | Preenchível em < 2 min; salvamento otimista             |
| AGD-06 | Faixa fixa de **cuidado** (alergias/medicações contínuas) no topo da agenda                   | 🔴   | 3   | FE     | AGD-05, CAD-08 | Alergias/medicações da criança sempre visíveis          |
| AGD-07 | Registro de **medicação administrada** (nome, dose, hora, por quem)                           | 🔴   | 3   | FS     | AGD-02, AGD-05 | Registro estruturado; aparece na agenda do pai          |
| AGD-08 | Registro de **intercorrência** (febre, queda, doença) com flag de notificação                 | 🔴   | 5   | FS     | AGD-02, AGD-05 | Intercorrência destacada; marca `notificado`            |
| AGD-09 | Tela **histórico** navegável por data (professor)                                             | 🟡   | 3   | FE     | AGD-03         | Navegar dias anteriores; ver registro completo          |
| AGD-10 | Anexar **fotos** ao registro do dia (S3)                                                      | 🟢   | 5   | FS     | AGD-02, CAD-12 | Até N fotos por dia; exibidas ao pai — _Fase 2_         |

**Subtotal Épico B:** 45 pts (MVP: ~40 pts).

---

## Épico C — Portal dos pais (PAI)

| ID     | Tarefa                                                      | Prio | Pts | Camada | Dep.           | AC                                                                             |
| ------ | ----------------------------------------------------------- | ---- | --- | ------ | -------------- | ------------------------------------------------------------------------------ |
| PAI-01 | **Home do responsável**: lista de filhos vinculados         | 🔴   | 3   | FE     | INF-08, CAD-11 | Mostra só filhos do responsável logado                                         |
| PAI-02 | Tela **agenda do dia** (somente leitura) do filho           | 🔴   | 5   | FE     | AGD-03, PAI-01 | Exibe alimentação, sono, atividades, medicação, obs.; intercorrência destacada |
| PAI-03 | Tela **histórico** do filho (navegação por data)            | 🔴   | 3   | FE     | AGD-03, PAI-01 | Paginação por dia; acesso só ao próprio filho                                  |
| PAI-04 | Destaque visual de **intercorrências/medicação** na leitura | 🔴   | 2   | FE     | PAI-02         | Ícone + cor + texto (não só cor)                                               |
| PAI-05 | Suporte a **múltiplos filhos** (troca de criança)           | 🟡   | 3   | FE     | PAI-01         | Alterna entre filhos; contexto correto                                         |
| PAI-06 | Alerta/aviso ao pai quando há intercorrência (in-app)       | 🟡   | 3   | FS     | AGD-08, PAI-02 | Badge/aviso ao abrir; base para push da Fase 2                                 |

**Subtotal Épico C:** 19 pts (MVP: ~13 pts).

---

## Épico D — Financeiro & pagamentos (FIN)

| ID     | Tarefa                                                                        | Prio | Pts | Camada | Dep.                   | AC                                                             |
| ------ | ----------------------------------------------------------------------------- | ---- | --- | ------ | ---------------------- | -------------------------------------------------------------- |
| FIN-01 | Modelo `mensalidades` (BE) + índice único `{criancaId, ano, mes}`             | 🔴   | 3   | BE     | CAD-08                 | Estrutura da doc de banco; status                              |
| FIN-02 | Geração de mensalidades por criança/competência (job)                         | 🔴   | 5   | BE     | FIN-01, CAD-11         | Gera mês a partir de `financeiro`/`configPrecos`; sem duplicar |
| FIN-03 | Endpoint listar mensalidades (pai/admin) por ano com status                   | 🔴   | 3   | BE     | FIN-01                 | Retorna pago/aberto/atrasado por competência                   |
| FIN-04 | Modelo `pagamentos` + integração **MercadoPago PIX** (criar cobrança)         | 🔴   | 8   | BE     | FIN-01, INF-05         | `POST /pagamentos` retorna copia-e-cola, QR, txid              |
| FIN-05 | **Webhook** MercadoPago: confirmar pagamento + baixa idempotente              | 🔴   | 5   | BE     | FIN-04                 | Assinatura validada; mensalidade → pago; sem dupla baixa       |
| FIN-06 | Geração de **recibo** e armazenamento em S3                                   | 🟡   | 3   | BE     | FIN-05                 | Recibo gerado no pagamento; URL disponível                     |
| FIN-07 | Tela **financeiro do responsável**: grade de meses (pago × aberto × atrasado) | 🔴   | 5   | FE     | FIN-03, INF-10         | Grade por ano; destaque de vencidos                            |
| FIN-08 | Tela/modal **pagamento PIX** (QRCode + copia-e-cola + polling de status)      | 🔴   | 5   | FE     | FIN-04, FIN-07         | Exibe QR (`qrcode.react`); status atualiza para pago           |
| FIN-09 | Modelo + CRUD **despesas** (BE)                                               | 🔴   | 3   | BE     | INF-06                 | Lançar/listar/editar despesa por categoria/data                |
| FIN-10 | Tela admin **lançamento de despesas**                                         | 🔴   | 3   | FE     | FIN-09, INF-10         | Formulário com categoria, valor, data, anexo                   |
| FIN-11 | Endpoint **balanço** mensal/anual (entradas − despesas)                       | 🔴   | 5   | BE     | FIN-03, FIN-09         | Agregação por período; entradas vs despesas                    |
| FIN-12 | Endpoint **inadimplentes**                                                    | 🔴   | 3   | BE     | FIN-03                 | Lista mensalidades atrasadas + criança/responsável             |
| FIN-13 | Tela **dashboard financeiro** admin (KPIs + gráfico 12 meses)                 | 🔴   | 8   | FE     | FIN-11, FIN-12, INF-10 | Entradas, despesas, inadimplentes, crianças ativas             |
| FIN-14 | **Exportação de relatórios** em Excel (SheetJS)                               | 🟡   | 3   | FE     | FIN-11                 | Exporta balanço/inadimplentes em `.xlsx`                       |

**Subtotal Épico D:** 62 pts (MVP: ~56 pts).

---

## Épico E — Simulador de mensalidade (SIM)

| ID     | Tarefa                                                               | Prio | Pts | Camada | Dep.           | AC                                                     |
| ------ | -------------------------------------------------------------------- | ---- | --- | ------ | -------------- | ------------------------------------------------------ |
| SIM-01 | Modelo `configPrecos` (singleton) + endpoint admin de preços         | 🔴   | 3   | BE     | INF-06         | Admin define valores/planos/descontos                  |
| SIM-02 | Tela admin de **configuração de preços**                             | 🟡   | 3   | FE     | SIM-01, INF-10 | Editar planos, valores mensal/diário, descontos        |
| SIM-03 | Tela pública **simulador**: período (meses/dias) + plano + resultado | 🔴   | 5   | FE     | SIM-01         | Sem login; total e por mês; comparação visual (barras) |
| SIM-04 | Cálculo com descontos por período (semestral/anual)                  | 🔴   | 3   | FS     | SIM-01, SIM-03 | Aplica descontos configurados; feedback claro          |
| SIM-05 | CTA "Agende uma visita" / captura de lead                            | 🟢   | 3   | FS     | SIM-03         | Captura contato do interessado — _Fase 2/3_            |

**Subtotal Épico E:** 17 pts (MVP: ~11 pts).

---

## Épico F — Pedagógico (PED) — majoritariamente Fase 2

| ID     | Tarefa                                          | Prio | Pts | Camada | Dep.           | AC                                  |
| ------ | ----------------------------------------------- | ---- | --- | ------ | -------------- | ----------------------------------- |
| PED-01 | Modelo + CRUD **planos de aula** por turma (BE) | 🟡   | 3   | BE     | CAD-06         | CRUD vinculado a turma/professor    |
| PED-02 | Tela **planos de aula** (professor)             | 🟡   | 5   | FE     | PED-01, INF-10 | Criar/editar/listar planos da turma |
| PED-03 | Visão do professor: **minhas turmas → alunos**  | 🔴   | 3   | FE     | CAD-06, CAD-11 | Professor vê suas turmas e alunos   |
| PED-04 | Calendário pedagógico de atividades             | 🟢   | 5   | FS     | PED-01         | Atividades por data — _Fase 3_      |

**Subtotal Épico F:** 16 pts (MVP: apenas PED-03 = 3 pts).

---

## Épico G — Qualidade, segurança e go-live (QA)

| ID    | Tarefa                                                             | Prio | Pts | Camada | Dep.           | AC                                                                |
| ----- | ------------------------------------------------------------------ | ---- | --- | ------ | -------------- | ----------------------------------------------------------------- |
| QA-01 | Testes unitários de services/validações (Jest) — cobertura crítica | 🔴   | 5   | BE     | Épicos A–D     | Cobertura em agenda, financeiro, auth                             |
| QA-02 | Testes de componentes críticos (agenda, pagamento)                 | 🟡   | 3   | FE     | AGD-05, FIN-08 | RTL nos fluxos-chave                                              |
| QA-03 | Revisão **LGPD**: consentimento, acesso, criptografia, retenção    | 🔴   | 5   | FS     | CAD-08         | Consentimento no cadastro; acesso por papel; política de retenção |
| QA-04 | Trilha de auditoria (cadastro de criança + baixas financeiras)     | 🟡   | 3   | BE     | CAD-09, FIN-05 | Log de quem alterou o quê e quando                                |
| QA-05 | Seeds e dados de demonstração                                      | 🟡   | 2   | BE     | Épicos A–B     | Turmas/crianças fictícias para demo                               |
| QA-06 | Teste de usabilidade com 1 professor + 2 pais                      | 🟡   | 3   | UX     | Épicos B–C     | Ajustes de UX priorizados a partir do teste                       |
| QA-07 | Hardening de segurança (IAM por Lambda, secrets, webhook assinado) | 🔴   | 5   | INFRA  | Épico D        | Menor privilégio; segredos em SSM; webhook verificado             |
| QA-08 | Go-live: deploy prod, monitoramento, runbook                       | 🔴   | 3   | INFRA  | INF-11, INF-12 | Prod estável; alarmes; plano de rollback                          |

> QA-03: consentimento no cadastro **implementado** — checkbox obrigatório
> no último step do stepper (`aquarela_app`) + `criancas.consentimentoLgpd`
> (`POST /criancas`, `422 CONSENTIMENTO_LGPD_OBRIGATORIO` se ausente,
> imutável após criação) em `aquarela_serverless`. Restam de QA-03: revisão
> de acesso por papel e política de retenção/expurgo.

**Subtotal Épico G:** 29 pts (MVP: ~23 pts).

---

## Épico H — Mural de avisos (AVI)

Front (`aquarela_app`) já tem tela de criação (admin) e leitura (responsável). Falta o back: modelo, validação, RBAC e endpoints.

| ID     | Tarefa                                                    | Prio | Pts | Camada | Dep.    | AC                                                                              |
| ------ | ---------------------------------------------------------- | ---- | --- | ------ | ------- | -------------------------------------------------------------------------------- |
| AVI-01 | Modelo `avisos` (BE) + índice `{ativo, createdAt}`        | 🔴   | 2   | BE     | INF-06  | Campos: título, corpo, autorId, publicoAlvo, ativo, timestamps                   |
| AVI-02 | Schema ajv + endpoint `POST /avisos` (criar)               | 🔴   | 3   | BE     | AVI-01  | Só `admin`; validação de payload; 201 + id gerado                                |
| AVI-03 | Endpoint `GET /avisos` (listar)                             | 🔴   | 3   | BE     | AVI-01  | `admin` vê todos; `professor`/`responsavel` só `ativo:true`, ordenado por data   |
| AVI-04 | Endpoint `PUT`/`DELETE /avisos/{id}` (editar/soft delete)  | 🟡   | 3   | BE     | AVI-01  | Só `admin`; `DELETE` marca `ativo:false`, não remove documento                   |
| AVI-05 | Atualizar `docs/03-Backend.md` e `docs/04-Banco-de-Dados.md` com contrato | 🔴 | 1 | BE | AVI-01…04 | Contrato de `/avisos` documentado p/ o front não sair do combinado |

**Subtotal Épico H:** 12 pts (MVP: 12 pts).

---

## Resumo de esforço

| Épico                 | Total (pts) | MVP (pts) |
| --------------------- | ----------- | --------- |
| 0 — Fundação          | 49          | 41        |
| A — Cadastros         | 73          | 67        |
| B — Agenda diária     | 45          | 40        |
| C — Portal dos pais   | 19          | 13        |
| D — Financeiro/PIX    | 62          | 56        |
| E — Simulador         | 17          | 11        |
| F — Pedagógico        | 16          | 3         |
| G — Qualidade/Go-live | 29          | 23        |
| H — Mural de avisos   | 12          | 12        |
| **Total**             | **322**     | **266**   |

> Ordem de grandeza (não compromisso). Com um time de 2–3 devs a ~20–25 pts/sprint de 2 semanas, o MVP (~254 pts) fica em torno de **5 a 6 sprints (10–12 semanas)**. Refine as estimativas em planning com o time.

---

## Sequenciamento sugerido (sprints do MVP)

| Sprint | Foco                                   | Tarefas âncora                              |
| ------ | -------------------------------------- | ------------------------------------------- |
| 1      | Fundação                               | INF-01…INF-10                               |
| 2      | Cadastros base                         | CAD-01…CAD-08, PED-03                       |
| 3      | Cadastro criança + Agenda (BE)         | CAD-09…CAD-11, AGD-01…AGD-04                |
| 4      | Agenda (FE) + Portal dos pais          | AGD-05…AGD-08, PAI-01…PAI-04                |
| 5      | Financeiro + PIX                       | FIN-01…FIN-08                               |
| 6      | Financeiro admin + Simulador + Go-live | FIN-09…FIN-13, SIM-01/03/04, QA-01/03/07/08 |

---

## Definition of Ready (DoR)

Uma tarefa está pronta para entrar no sprint quando: tem AC claros, dependências resolvidas, design definido (se houver UI) e estimativa acordada.

## Definition of Done (DoD)

Código revisado (PR aprovado), testes passando, sem erros de lint, deploy em staging validado, AC atendidos e — quando aplicável — checagem de LGPD/segurança feita.
