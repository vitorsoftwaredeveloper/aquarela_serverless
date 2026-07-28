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

Épicos: **0** Fundação · **A** Cadastros · **B** Agenda diária · **C** Portal dos pais · **D** Financeiro/PIX · **E** Simulador · **F** Pedagógico · **G** Qualidade/Go-live · **H** Mural de avisos · **I** Notificações push.

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
| CAD-10 | Tela **cadastro/edição de criança** em stepper (identificação → responsáveis → saúde → financeiro) | 🔴   | 8   | FE     | CAD-08, INF-10 | Stepper com validação por etapa; salva parcial; edição; etapa financeiro tem seletor de plano fixo **e** campo de valor personalizado (acordo fechado), este último sobrepõe o plano e omite `planoId` no payload |
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
| FIN-15 | Endpoint **pagamento manual** (admin, dinheiro físico)                        | 🔴   | 3   | BE     | FIN-01, FIN-04         | `POST /pagamentos/manual` baixa mensalidade; audita admin (`recebidoPor`) |
| FIN-16 | Tela admin: registrar pagamento em dinheiro no mês em aberto                  | 🔴   | 3   | FE     | FIN-15, FIN-07         | Clique no mês aberto/atrasado abre modal de valor recebido     |

**Subtotal Épico D:** 68 pts (MVP: ~62 pts).

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

## Épico I — Notificações push (NOT)

> Substitui o "Push via Firebase — fase 2" genérico por um escopo fechado: **Web Push (FCM)** entregue no celular do responsável quando o professor conclui a agenda do dia. A aplicação é web (Next.js), então o canal é o **padrão Web Push do browser**, não app nativo.
>
> **Alcance esperado:** Android/Chrome e desktop funcionam em aba comum. **iPhone só recebe se o responsável instalar o PWA na tela inicial** (iOS 16.4+) — daí o peso do onboarding (NOT-11) e do diagnóstico (NOT-16/NOT-19). Cobertura realista ≈ 75–85% dos responsáveis; o restante fica coberto quando o canal WhatsApp entrar (fora deste épico, ver NOT-05: o motor já nasce com canal plugável).
>
> **Gatilho adotado:** ação explícita do professor (**"Enviar para os pais"**), não `save`. A agenda é preenchida ao longo do dia — disparar a cada gravação geraria ~8 notificações/dia/filho e mataria o canal. Exceção: intercorrência dispara na hora (NOT-09).
>
> **LGPD:** o corpo da notificação aparece na tela de bloqueio. Nunca leva dado de saúde, alimentação ou nome de medicação — só "agenda disponível" + link. Detalhe só dentro do app autenticado (NOT-17).

| ID     | Tarefa                                                                                      | Prio | Pts | Camada | Dep.                   | AC                                                                                              |
| ------ | ------------------------------------------------------------------------------------------- | ---- | --- | ------ | ---------------------- | ----------------------------------------------------------------------------------------------- |
| NOT-00 | ✅ **Spike:** validar entrega em dispositivo real (Android, iPhone c/ PWA, desktop)          | 🔴   | 1   | INFRA  | —                      | **Concluído em 28/07/2026** — ver veredito abaixo                                                |
| NOT-01 | ✅ Provisionar projeto Firebase (Cloud Messaging) + par VAPID + service account no SSM         | 🔴   | 2   | INFRA  | INF-05                 | Projeto `aquarela-kids-60bec` criado, VAPID gerada (usadas no spike NOT-00). Service account em `/aquarela_serverless/staging/firebase_service_account` (`SecureString`, validado em 28/07/2026 — JSON íntegro, `private_key` em formato PEM). Falta replicar em `/aquarela_serverless/firebase_service_account` (dev) e `/prod/` quando esses ambientes forem provisionados |
| NOT-02 | ✅ `src/libs/firebase.ts` — Admin SDK com init **global** reutilizado entre invocações         | 🔴   | 3   | BE     | NOT-01                 | Credencial lida em runtime (nunca `${ssm:}`); sem re-init a cada request                         |
| NOT-03 | ✅ Modelo `dispositivos` + índice único em `token`                                             | 🔴   | 3   | BE     | INF-04                 | `{usuarioId, token, plataforma, ultimoUsoEm}`; mesmo usuário com N dispositivos                  |
| NOT-04 | ✅ Endpoints `POST /dispositivos` e `DELETE /dispositivos/{token}`                             | 🔴   | 3   | BE     | NOT-03, INF-06         | Upsert idempotente por token; usuário só mexe nos próprios dispositivos                          |
| NOT-05 | ✅ Motor `services/notificacoes/enviarNotificacao.ts` com **canal plugável**                   | 🔴   | 5   | BE     | NOT-02, NOT-04         | Recebe `usuarioIds` + payload, resolve tokens, envia via FCM; adapter permite plugar WhatsApp    |
| NOT-06 | ✅ Poda de token morto (`messaging/registration-token-not-registered`)                         | 🔴   | 2   | BE     | NOT-05                 | Resposta por token; token inválido é removido, não retentado                                     |
| NOT-07 | Coleção `notificacoes` — log de envio/erro para auditoria                                    | 🟡   | 2   | BE     | NOT-05                 | Registro por envio com status e motivo da falha; sem PII no log                                  |
| NOT-08 | ✅ `agendasDiarias.enviadaEm` + `POST /agenda/{id}/enviar` (idempotente)                       | 🔴   | 5   | BE     | AGD-02, AGD-04, NOT-05 | Só professor da turma (mesma regra de escrita de `createAgenda`/`updateAgenda` — sem admin); 2º disparo → 409; notifica todos os responsáveis da criança |
| NOT-09 | Disparo imediato em **intercorrência** (ignora o botão de envio)                             | 🟡   | 3   | BE     | AGD-08, NOT-05         | Febre/queda notifica na hora; corpo genérico ("a professora registrou um aviso")                 |
| NOT-10 | PWA no front: `manifest.json` (`display: standalone`) + ícones + `firebase-messaging-sw.js`  | 🔴   | 3   | FE     | INF-07                 | Service worker servido na **raiz** do domínio; app instalável; HTTPS                             |
| NOT-11 | Onboarding de instalação (detecta iOS não-instalado e **webview de app** → sai para o browser) | 🔴   | 5   | UX/FE  | NOT-10                 | Guia passo a passo no iPhone; detecta webview (WhatsApp/Instagram) e instrui "Abrir no Safari/Chrome"; estado "instalado" detectado |
| NOT-12 | Fluxo de permissão contextualizado + `getToken` + registro no back                           | 🔴   | 5   | FE     | NOT-10, NOT-04         | Explica o benefício **antes** de `requestPermission()`; token enviado ao back                    |
| NOT-13 | Ciclo de vida do token: reenvio no login, `onTokenRefresh`, `DELETE` no logout               | 🔴   | 2   | FE     | NOT-12                 | Token nunca fica órfão nem obsoleto; logout limpa o dispositivo                                  |
| NOT-14 | `onMessage` em primeiro plano → toast in-app                                                 | 🟡   | 2   | FE     | NOT-12, INF-10         | App aberto não perde o aviso (SO não exibe notificação nesse caso)                               |
| NOT-15 | Botão **"Enviar para os pais"** na tela de agenda do professor + estado "enviada"            | 🔴   | 3   | FE     | NOT-08, AGD-05         | Professor vê se já enviou; botão bloqueia reenvio acidental                                      |
| NOT-16 | Tela de preferências: status da notificação, reativar, diagnosticar permissão bloqueada      | 🟡   | 3   | FE     | NOT-12                 | Responsável que negou a permissão recebe instrução de como reverter no browser                   |
| NOT-17 | Opt-in registrado + payload **sem PII/saúde** (LGPD)                                         | 🔴   | 3   | FS     | NOT-05, NOT-12         | Consentimento com timestamp do servidor; corpo genérico auditado; detalhe só no app autenticado  |
| NOT-18 | Teste em dispositivos reais (Android, iPhone c/ PWA, desktop) antes do go-live               | 🔴   | 3   | QA     | NOT-15                 | Matriz de plataformas validada com app fechado; casos de falha documentados                      |
| NOT-19 | Observabilidade: taxa de entrega + **% de responsáveis sem token válido**                    | 🟡   | 3   | INFRA  | NOT-07                 | Admin enxerga quem está no escuro; alarme quando a cobertura cai                                 |
| NOT-20 | Atualizar `docs/03-Backend.md` e `docs/04-Banco-de-Dados.md` com o contrato                  | 🔴   | 1   | BE     | NOT-01…NOT-09          | `/dispositivos`, `/agenda/{id}/enviar`, `dispositivos`, `notificacoes` documentados              |

**Subtotal Épico I:** 62 pts (MVP: ~49 pts sem os Should).

### Veredito do NOT-00 (28/07/2026) — ✅ **aprovado, seguir com o épico**

Spike executado com página estática (`public/spike-push.html` + `public/firebase-messaging-sw.js` no `aquarela_app`, branch `feat/notify`), projeto Firebase `aquarela-kids-60bec` e disparo manual por `scripts/spike-push.mjs` (`firebase-admin`).

| Plataforma                     | Chegou? | App fechado / tela travada | Observação                                                             |
| ------------------------------ | ------- | -------------------------- | ---------------------------------------------------------------------- |
| **Android / Chrome**           | ✅      | ✅ tela de bloqueio         | Funciona em aba comum, sem instalar PWA                                 |
| **iPhone / PWA na tela inicial** | ✅      | ✅ bloqueio + Central       | Só após "Adicionar à Tela de Início" e abrir pelo ícone                 |
| **iPhone / Safari em aba**     | ❌      | —                          | Esperado: `PushManager` indisponível fora do modo instalado             |
| **macOS / Safari**             | ✅      | —                          | Exibição confirmada                                                    |
| **macOS / Chrome**             | ❌      | —                          | Config local da máquina de teste (macOS não exibia); não é risco de produto |

**Conclusões que viram requisito:**

1. O caminho técnico está provado ponta a ponta — FCM → Push Service → service worker → tela de bloqueio. Nenhum bloqueio para a fase I.1.
2. O passo a passo de instalação no iOS é **condição de existência** do canal, não polimento. Confirma o peso de `NOT-11`.
3. 🔴 **Achado novo — webview de app não suporta push.** O link aberto dentro do WhatsApp (ou Instagram/Facebook) roda em webview sem `PushManager`: o diagnóstico acusou `Suporte a push: não` mesmo em iPhone. Como a escola tende a divulgar o link **por WhatsApp**, esse é o caminho mais provável do responsável — e o que mais silenciosamente falha. Requisito absorvido por `NOT-11`.

### Estado da fase I.1 e I.2 — back-end (28/07/2026)

`NOT-02`…`NOT-06` e `NOT-08` implementados e testados de ponta a ponta contra `serverless-offline` + Mongo local (seed próprio via repositórios da aplicação, não escrita direta no Mongo — evita o desvio de nome de coleção que o Mongoose faz por baixo):

- `POST/DELETE /dispositivos` — upsert idempotente, ownership por `usuarioId`, validação ajv, isolamento comprovado entre dois usuários reais (admin não remove dispositivo do professor).
- Motor `enviarNotificacao` com canal FCM isolado em `services/notificacoes/canais/canalFcm.ts` (trocar/adicionar canal não muda quem chama o motor) e poda automática de token morto.
- `POST /agenda/{id}/enviar` — 404 pra agenda inexistente, 200 marcando `enviadaEm` no caminho feliz, 409 no reenvio, e **500 sem marcar `enviadaEm`** quando o envio de fato falha (testado forçando um dispositivo real sem credencial do Firebase local) — garante que o professor pode tentar de novo em vez de ficar com um envio "fantasma".

`docs/03-Backend.md` e `docs/04-Banco-de-Dados.md` atualizados com os dois contratos. Testes existentes (40) e `typecheck` seguem verdes. Mocks do spike `NOT-00` removidos (`aquarela_app/public/spike-*`, `scripts/spike-push.mjs`) — não fazem parte do produto, e o `NOT-10` vai recriar o `firebase-messaging-sw.js`/manifest de verdade integrado ao app.

`NOT-01` também fechado — service account validado no SSM de staging em 28/07/2026. **Toda a fase I.1 e o back-end da I.2 (NOT-08) estão prontos.** Resto da I.2 (`NOT-10`, `NOT-12`, `NOT-13`, `NOT-15`) é front, no `aquarela_app`.

### Ordem de execução sugerida

| Fase | Tarefas                     | Entrega                                                        |
| ---- | --------------------------- | -------------------------------------------------------------- |
| I.0  | NOT-00                      | Prova em aparelho real antes de investir os outros 61 pts       |
| I.1  | NOT-01…NOT-06               | Back consegue notificar um `usuarioId` qualquer                 |
| I.2  | NOT-08, NOT-10, NOT-12, NOT-13, NOT-15 | Fluxo ponta a ponta: professor envia → pai recebe    |
| I.3  | NOT-11, NOT-17, NOT-18, NOT-20 | Alcance no iOS, LGPD e validação para go-live                |
| I.4  | NOT-07, NOT-09, NOT-14, NOT-16, NOT-19 | Robustez, auditoria e diagnóstico                    |

### Riscos

| Risco                                                        | Impacto                                       | Mitigação                                            |
| ------------------------------------------------------------ | --------------------------------------------- | ---------------------------------------------------- |
| Responsável em iPhone não instala o PWA                       | Não recebe nada e **não sabe disso**          | NOT-11 (onboarding) + NOT-19 (admin enxerga a lacuna) |
| Link aberto no **webview do WhatsApp** — sem `PushManager`     | Caminho mais provável do responsável, falha em silêncio | NOT-11 detecta webview e manda abrir no browser (confirmado no NOT-00) |
| Permissão negada — o browser só pergunta **uma vez**          | Canal morto para aquele usuário               | NOT-12 (pedir em contexto) + NOT-16 (como reverter)   |
| Gerenciamento agressivo de bateria (Xiaomi, Realme, Motorola) | Push atrasa 10–30 min                         | Documentar em NOT-18; não é bloqueante                |
| Disparo por `save` em vez do botão                            | Spam → responsável desliga tudo               | Decisão travada em NOT-08/NOT-15                      |
| Detalhe de saúde no corpo da notificação                      | Vazamento de dado sensível na tela de bloqueio | NOT-17 como critério de DoD do épico                  |

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
| I — Notificações push | 62          | 49        |
| **Total**             | **384**     | **315**   |

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
