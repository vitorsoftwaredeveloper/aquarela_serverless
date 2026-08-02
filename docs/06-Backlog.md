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

Épicos: **0** Fundação · **A** Cadastros · **B** Agenda diária · **C** Portal dos pais · **D** Financeiro/PIX · **E** Simulador · **F** Pedagógico · **G** Qualidade/Go-live · **H** Mural de avisos · **I** Notificações push · **J** Cobrança/inadimplência · **K** Recados com anexo · **L** Agenda v2 · **M** Mural de fotos · **N** Ajustes de cadastro/dashboard.

> **Épicos J–N entraram em 01/08/2026**, depois do MVP fechado. São 14 pedidos
> da operação (lista original preservada no mapa abaixo). A coluna "MVP" não se
> aplica a eles — o MVP já foi definido nos épicos 0–I.

| # do pedido | Vira | # do pedido | Vira |
| --- | --- | --- | --- |
| 1 · cobrança automática dias 05 e 20 | COB-01…COB-05 | 8 · professor lê os recados | MSG-10 |
| 2 · corte de inadimplência no dia 10 | COB-06…COB-09 | 9 · tarefa de casa na agenda | AG2-03, AG2-04 |
| 3 · responsável não concede `podeRetirar` | OPS-01 | 10 · falta / chegou atrasado | AG2-05, AG2-06 |
| 4 · pagamento de 31/07 caiu em agosto | OPS-02 | 11 · imprimir ficha de cadastro | OPS-04 |
| 5 · mais de um professor por turma | OPS-03 | 12 · anexar documento na agenda | AG2-07, AG2-08 |
| 6 · toda edição de agenda renotifica | AG2-01, AG2-02 | 13 · notificar aniversário | OPS-05 |
| 7 · responsável manda recado com anexo | MSG-01…MSG-09 | 14 · mural de fotos com eventos | FOT-01…FOT-08 |

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

> **Escopo = CRUD completo** (create/read/update/**delete**) de `usuarios`, `professores`, `turmas` e `criancas`, mais os **vínculos** criança↔turma e criança↔responsável. Todo `DELETE` é **hard delete** — não existe soft delete/`ativo` no sistema; `criancas`/`usuarios` removem em cadeia o que só pertence a eles, `turmas` bloqueia a remoção enquanto houver crianças vinculadas.

| ID     | Tarefa                                                                                             | Prio | Pts | Camada | Dep.           | AC                                                                                        |
| ------ | -------------------------------------------------------------------------------------------------- | ---- | --- | ------ | -------------- | ----------------------------------------------------------------------------------------- |
| CAD-01 | ✅ Modelo + CRUD **usuários** (BE): criar, listar, remover, papéis                                  | 🔴   | 5   | BE     | INF-06         | Admin cria/remove usuário; papel gravado; espelha `cognitoSub`                            |
| CAD-02 | ✅ Provisionamento no Cognito ao criar usuário (convite/senha) — `src/libs/cognito.ts`              | 🔴   | 5   | BE     | CAD-01         | Novo usuário recebe acesso; vínculo Cognito↔`usuarios`                                    |
| CAD-03 | ✅ Tela admin de **gestão de usuários** (lista, criar, remover) — `UsuariosScreen.tsx` (aquarela_app) | 🔴   | 5   | FE     | CAD-01, INF-10 | Admin gerencia usuários; confirmação ao remover                                           |
| CAD-04 | ✅ Modelo + CRUD **professores** (BE)                                                               | 🔴   | 3   | BE     | INF-06         | CRUD completo; vínculo `usuarioId`                                                        |
| CAD-05 | ✅ Tela admin **cadastro de professores** (FE) — `ProfessoresScreen.tsx` (aquarela_app)            | 🔴   | 3   | FE     | CAD-04, INF-10 | Formulário com validação; lista e edição                                                  |
| CAD-06 | ✅ Modelo + CRUD **turmas** (BE): nome, descrição, faixa etária, professora                         | 🔴   | 5   | BE     | CAD-04         | Turma vincula 1 professora; faixa etária validada                                         |
| CAD-07 | ✅ Tela admin **cadastro de turmas** (FE) — `TurmasScreen.tsx` (aquarela_app)                      | 🔴   | 3   | FE     | CAD-06, INF-10 | Criar/editar turma; selecionar professora                                                 |
| CAD-08 | ✅ Modelo **criança** completo (BE): identificação, responsáveis, saúde, financeiro                 | 🔴   | 8   | BE     | INF-06         | Todos os campos da seção 6 do PRD; validação de CPF                                       |
| CAD-09 | ✅ Endpoint editar/atualizar criança + auditoria de alterações                                      | 🔴   | 5   | BE     | CAD-08         | Edição registra quem/quando; histórico de mudanças em saúde                               |
| CAD-10 | ✅ Tela **cadastro/edição de criança** em stepper (identificação → responsáveis → saúde → financeiro) — `CriancaStepper.tsx` (aquarela_app) | 🔴   | 8   | FE     | CAD-08, INF-10 | Stepper com validação por etapa; salva parcial; edição; etapa financeiro tem seletor de plano fixo **e** campo de valor personalizado (acordo fechado), este último sobrepõe o plano e omite `planoId` no payload |
| CAD-11 | ✅ Vínculo criança ↔ turma e criança ↔ responsável(is)                                              | 🔴   | 3   | FS     | CAD-06, CAD-08 | Criança aparece na turma; responsável enxerga o filho                                     |
| CAD-12 | ✅ Upload de foto da criança (S3) — `src/services/shared/fotoUpload.ts`, `src/libs/s3.ts`           | 🟡   | 3   | FS     | CAD-08         | Foto salva em S3; exibida no cadastro/agenda                                              |
| CAD-13 | ✅ Busca/filtro de crianças (por nome, turma, status)                                              | 🟡   | 3   | FS     | CAD-08         | Lista filtrável e paginada                                                                |
| CAD-14 | ✅ Atualizar/remover **usuário** e **professor** (update + hard delete)                             | 🔴   | 3   | FS     | CAD-01, CAD-04 | `PUT`/`DELETE`; remover professor com turma → aviso/409; UI de editar/remover             |
| CAD-15 | ✅ **Remover criança** (hard delete em cadeia — apaga agenda/mensalidades/pagamentos próprios, desvincula responsáveis) | 🔴   | 3   | FS     | CAD-09         | `DELETE /criancas/{id}`; `src/services/criancas/removeCrianca.ts`; confirmação na UI      |
| CAD-16 | ✅ **Remover turma** com regra de turma não-vazia (bloquear) — `src/services/turmas/removeTurma.ts` | 🔴   | 3   | FS     | CAD-06, CAD-11 | `DELETE /turmas/{id}` bloqueia se houver crianças vinculadas (409 `TURMA_COM_CRIANCAS_VINCULADAS`) |
| CAD-17 | ✅ **Vincular / desvincular / mover** criança ↔ turma — `src/services/criancas/moverCriancaTurma.ts` | 🔴   | 5   | FS     | CAD-06, CAD-08 | `POST`/`DELETE /turmas/{id}/criancas`; `PATCH /criancas/{id}/turma`; UI de mover de turma |

**Subtotal Épico A:** 73 pts (MVP: ~67 pts).

---

## Épico B — Agenda diária (AGD)

| ID     | Tarefa                                                                                        | Prio | Pts | Camada | Dep.           | AC                                                      |
| ------ | --------------------------------------------------------------------------------------------- | ---- | --- | ------ | -------------- | ------------------------------------------------------- |
| AGD-01 | ✅ Modelo `agendasDiarias` (BE) + índice único `{criancaId, data}`                             | 🔴   | 5   | BE     | CAD-08         | 1 registro por criança/dia; estrutura da seção do banco |
| AGD-02 | ✅ Endpoints criar/editar registro do dia (professor)                                          | 🔴   | 5   | BE     | AGD-01, INF-06 | Professor da turma cria/edita; validação ajv            |
| AGD-03 | ✅ Endpoint ler agenda por dia + histórico por intervalo                                       | 🔴   | 3   | BE     | AGD-01         | Filtro por criança/data e por período (ordenado desc)   |
| AGD-04 | ✅ Autorização de acesso: professor só da sua turma; pai só do filho                           | 🔴   | 5   | BE     | AGD-02, CAD-11 | 403 em acesso indevido; ownership validado              |
| AGD-05 | ✅ Tela **registrar agenda** (professor): chips de alimentação, sono, atividades, humor, higiene — `RegistrarAgendaScreen.tsx` (aquarela_app) | 🔴   | 8   | FE     | AGD-02, INF-10 | Preenchível em < 2 min; salvamento otimista             |
| AGD-06 | ✅ Faixa fixa de **cuidado** (alergias/medicações contínuas) no topo da agenda — `RegistrarAgendaScreen.tsx` (aquarela_app) | 🔴   | 3   | FE     | AGD-05, CAD-08 | Alergias/medicações da criança sempre visíveis          |
| AGD-07 | ✅ Registro de **medicação administrada** (nome, dose, hora, por quem)                         | 🔴   | 3   | FS     | AGD-02, AGD-05 | Registro estruturado; aparece na agenda do pai          |
| AGD-08 | ✅ Registro de **intercorrência** (febre, queda, doença) com flag de notificação — flag `notificado` gravada; disparo automático de push descartado por decisão do produto (ver NOT-09) | 🔴   | 5   | FS     | AGD-02, AGD-05 | Intercorrência destacada; marca `notificado`            |
| AGD-09 | ✅ Tela **histórico** navegável por data (professor) — `HistoricoScreen.tsx` (aquarela_app)     | 🟡   | 3   | FE     | AGD-03         | Navegar dias anteriores; ver registro completo          |
| AGD-10 | ⚪ Anexar **fotos** ao registro do dia (S3) — descartado (decisão do produto, 31/07/2026) | ⚪ | 5 | FS | AGD-02, CAD-12 | Até N fotos por dia; exibidas ao pai — _Fase 2_         |

**Subtotal Épico B:** 45 pts (MVP: ~40 pts).

---

## Épico C — Portal dos pais (PAI)

| ID     | Tarefa                                                      | Prio | Pts | Camada | Dep.           | AC                                                                             |
| ------ | ----------------------------------------------------------- | ---- | --- | ------ | -------------- | ------------------------------------------------------------------------------ |
| PAI-01 | ✅ **Home do responsável**: lista de filhos vinculados — `InicioScreen.tsx` (aquarela_app)   | 🔴   | 3   | FE     | INF-08, CAD-11 | Mostra só filhos do responsável logado                                         |
| PAI-02 | ✅ Tela **agenda do dia** (somente leitura) do filho — `AgendaScreen.tsx` (aquarela_app)     | 🔴   | 5   | FE     | AGD-03, PAI-01 | Exibe alimentação, sono, atividades, medicação, obs.; intercorrência destacada |
| PAI-03 | ✅ Tela **histórico** do filho (navegação por data) — `HistoricoScreen.tsx` (aquarela_app)   | 🔴   | 3   | FE     | AGD-03, PAI-01 | Paginação por dia; acesso só ao próprio filho                                  |
| PAI-04 | ✅ Destaque visual de **intercorrências/medicação** na leitura — `agendaVisual.tsx` (aquarela_app) | 🔴   | 2   | FE     | PAI-02         | Ícone + cor + texto (não só cor)                                               |
| PAI-05 | ✅ Suporte a **múltiplos filhos** (troca de criança)         | 🟡   | 3   | FE     | PAI-01         | Alterna entre filhos; contexto correto                                         |
| PAI-06 | ✅ Alerta/aviso ao pai quando há intercorrência (in-app) — banner vermelho no topo de "Agenda de hoje" (`InicioScreen.tsx`, aquarela_app), some quando não há intercorrência no dia | 🟡   | 3   | FS     | AGD-08, PAI-02 | Badge/aviso ao abrir; base para push da Fase 2                                 |

**Subtotal Épico C:** 19 pts (MVP: ~13 pts).

---

## Épico D — Financeiro & pagamentos (FIN)

| ID     | Tarefa                                                                        | Prio | Pts | Camada | Dep.                   | AC                                                             |
| ------ | ----------------------------------------------------------------------------- | ---- | --- | ------ | ---------------------- | -------------------------------------------------------------- |
| FIN-01 | ✅ Modelo `mensalidades` (BE) + índice único `{criancaId, ano, mes}`          | 🔴   | 3   | BE     | CAD-08                 | Estrutura da doc de banco; status                              |
| FIN-02 | ✅ Geração de mensalidades por criança/competência (job)                     | 🔴   | 5   | BE     | FIN-01, CAD-11         | Gera mês a partir de `financeiro`/`configPrecos`; sem duplicar |
| FIN-03 | ✅ Endpoint listar mensalidades (pai/admin) por ano com status               | 🔴   | 3   | BE     | FIN-01                 | Retorna pago/aberto/atrasado por competência                   |
| FIN-04 | ✅ Modelo `pagamentos` + integração **MercadoPago PIX** (criar cobrança)     | 🔴   | 8   | BE     | FIN-01, INF-05         | `POST /pagamentos` retorna copia-e-cola, QR, txid              |
| FIN-05 | ✅ **Webhook** MercadoPago: confirmar pagamento + baixa idempotente          | 🔴   | 5   | BE     | FIN-04                 | Assinatura validada; mensalidade → pago; sem dupla baixa       |
| FIN-06 | ⚪ Geração de **recibo** e armazenamento em S3 — **descartado** (decisão do produto, 30/07/2026); campo reservado no model `Pagamento` fica sem uso | ⚪   | 3   | BE     | FIN-05                 | Recibo gerado no pagamento; URL disponível                     |
| FIN-07 | ✅ Tela **financeiro do responsável**: grade de meses (pago × aberto × atrasado) — `FinanceiroScreen.tsx` (aquarela_app) | 🔴   | 5   | FE     | FIN-03, INF-10         | Grade por ano; destaque de vencidos                            |
| FIN-08 | ✅ Tela/modal **pagamento PIX** (QRCode + copia-e-cola + polling de status) — `FinanceiroScreen.tsx` (aquarela_app) | 🔴   | 5   | FE     | FIN-04, FIN-07         | Exibe QR (`qrcode.react`); status atualiza para pago           |
| FIN-09 | ✅ Modelo + CRUD **despesas** (BE)                                           | 🔴   | 3   | BE     | INF-06                 | Lançar/listar/editar despesa por categoria/data                |
| FIN-10 | ✅ Tela admin **lançamento de despesas** — `FinanceiroAdminScreen.tsx` (aquarela_app) | 🔴   | 3   | FE     | FIN-09, INF-10         | Formulário com categoria, valor, data, anexo                   |
| FIN-11 | ✅ Endpoint **balanço** mensal/anual (entradas − despesas)                   | 🔴   | 5   | BE     | FIN-03, FIN-09         | Agregação por período; entradas vs despesas                    |
| FIN-12 | ✅ Endpoint **inadimplentes**                                                | 🔴   | 3   | BE     | FIN-03                 | Lista mensalidades atrasadas + criança/responsável             |
| FIN-13 | ✅ Tela **dashboard financeiro** admin (KPIs + gráfico 12 meses) — `DashboardScreen.tsx`/`BalancoChart.tsx` (aquarela_app) | 🔴   | 8   | FE     | FIN-11, FIN-12, INF-10 | Entradas, despesas, inadimplentes, crianças ativas             |
| FIN-14 | ✅ **Exportação de relatórios** em Excel (SheetJS) — `src/utils/exportXlsx.ts` (aquarela_app), usado em `FinanceiroAdminScreen.tsx` | 🟡   | 3   | FE     | FIN-11                 | Exporta balanço/inadimplentes em `.xlsx`                       |
| FIN-15 | ✅ Endpoint **pagamento manual** (admin, dinheiro físico)                     | 🔴   | 3   | BE     | FIN-01, FIN-04         | `POST /pagamentos/manual` baixa mensalidade; audita admin (`recebidoPor`) |
| FIN-16 | ✅ Tela admin: registrar pagamento em dinheiro no mês em aberto               | 🔴   | 3   | FE     | FIN-15, FIN-07         | Clique no mês aberto/atrasado abre modal de valor recebido     |

**Subtotal Épico D:** 68 pts (MVP: ~62 pts).

---

## Épico E — Simulador de mensalidade (SIM)

| ID     | Tarefa                                                               | Prio | Pts | Camada | Dep.           | AC                                                     |
| ------ | -------------------------------------------------------------------- | ---- | --- | ------ | -------------- | ------------------------------------------------------ |
| SIM-01 | ✅ Modelo `configPrecos` (singleton) + endpoint admin de preços      | 🔴   | 3   | BE     | INF-06         | Admin define valores/planos/descontos                  |
| SIM-02 | ✅ Tela admin de **configuração de preços** — `PlanosTab.tsx` (aba dentro de `FinanceiroAdminScreen.tsx`, aquarela_app) | 🟡   | 3   | FE     | SIM-01, INF-10 | Editar planos, valores mensal/diário, descontos        |
| SIM-03 | ✅ Tela pública **simulador**: período (meses/dias) + plano + resultado — `SimuladorScreen.tsx` (aquarela_app) | 🔴   | 5   | FE     | SIM-01         | Sem login; total e por mês; comparação visual (barras) |
| SIM-04 | ✅ Cálculo com descontos por período (semestral/anual) — `src/services/simulador/simularMensalidade.ts` | 🔴   | 3   | FS     | SIM-01, SIM-03 | Aplica descontos configurados; feedback claro          |
| SIM-05 | ⚪ CTA "Agende uma visita" / captura de lead — descartado (decisão do produto, 31/07/2026); `FinalCta.tsx` (aquarela_app) segue só com botão pro simulador + link direto de WhatsApp, sem form estruturado | ⚪ | 3 | FS | SIM-03         | Captura contato do interessado — _Fase 2/3_            |

**Subtotal Épico E:** 17 pts (MVP: ~11 pts).

---

## Épico F — Pedagógico (PED) — majoritariamente Fase 2

| ID     | Tarefa                                          | Prio | Pts | Camada | Dep.           | AC                                  |
| ------ | ----------------------------------------------- | ---- | --- | ------ | -------------- | ----------------------------------- |
| PED-01 | ✅ Modelo + CRUD **planos de aula** por turma (BE) — `src/handlers/planosAula` | 🟡   | 3   | BE     | CAD-06         | CRUD vinculado a turma/professor    |
| PED-02 | ✅ Tela **planos de aula** (professor)             | 🟡   | 5   | FE     | PED-01, INF-10 | Criar/editar/listar planos da turma (`PlanosAulaScreen`/`PlanoAulaFormScreen`); `NEXT_PUBLIC_USE_MOCKS=true` segue disponível pra preview |
| PED-03 | ✅ Visão do professor: **minhas turmas → alunos** — `TurmasScreen.tsx`/`AlunosScreen.tsx` (professor, aquarela_app) | 🔴   | 3   | FE     | CAD-06, CAD-11 | Professor vê suas turmas e alunos   |
| PED-04 | ⚪ Calendário pedagógico de atividades — descartado (decisão do produto, 31/07/2026) | ⚪ | 5 | FS | PED-01         | Atividades por data — _Fase 3_      |

**Subtotal Épico F:** 16 pts (MVP: apenas PED-03 = 3 pts).

---

## Épico G — Qualidade, segurança e go-live (QA)

| ID    | Tarefa                                                             | Prio | Pts | Camada | Dep.           | AC                                                                |
| ----- | ------------------------------------------------------------------ | ---- | --- | ------ | -------------- | ----------------------------------------------------------------- |
| QA-01 | Testes unitários de services/validações (Jest) — cobertura crítica | 🔴   | 5   | BE     | Épicos A–D     | Cobertura em agenda, financeiro, auth                             |
| QA-02 | ✅ Testes de componentes críticos (agenda, pagamento) (aquarela_app) | 🟡   | 3   | FE     | AGD-05, FIN-08 | RTL nos fluxos-chave                                              |
| QA-03 | ✅ Revisão **LGPD**: consentimento, acesso, criptografia, retenção | 🔴   | 5   | FS     | CAD-08         | Consentimento no cadastro; acesso por papel; política de retenção |
| QA-04 | ✅ Trilha de auditoria (cadastro de criança + baixas financeiras)  | 🟡   | 3   | BE     | CAD-09, FIN-05 | Log de quem alterou o quê e quando                                |
| QA-05 | ⚪ Seeds e dados de demonstração — descartado (decisão do produto, 31/07/2026) | ⚪ | 2 | BE | Épicos A–B | Turmas/crianças fictícias para demo                               |
| QA-06 | ✅ Teste de usabilidade com 1 professor + 2 pais — validado (31/07/2026), sem ajustes necessários | 🟡 | 3 | UX | Épicos B–C     | Ajustes de UX priorizados a partir do teste                       |
| QA-07 | ✅ Hardening de segurança (IAM por Lambda, secrets, webhook assinado) | 🔴 | 5   | INFRA  | Épico D        | Menor privilégio; segredos em SSM; webhook verificado             |
| QA-08 | ⚪ Go-live: deploy prod, monitoramento, runbook — descartado (decisão do produto, 31/07/2026) | ⚪ | 3 | INFRA | INF-11, INF-12 | Prod estável; alarmes; plano de rollback                          |

> QA-03: consentimento no cadastro **implementado** — checkbox obrigatório
> no último step do stepper (`aquarela_app`) + `criancas.consentimentoLgpd`
> (`POST /criancas`, `422 CONSENTIMENTO_LGPD_OBRIGATORIO` se ausente,
> imutável após criação) em `aquarela_serverless`. Restam de QA-03: revisão
> de acesso por papel e política de retenção/expurgo.
>
> QA-04: cadastro de criança já coberto por CAD-09 (`criancas.auditoria`:
> quem/quando/campos alterados, capado em 50 entradas). Para baixas
> financeiras, decisão de produto (31/07/2026): `pagamentos.updatedAt`
> (baixa automática via webhook) + `pagamentos.recebidoPor` (baixa manual)
> + `mensalidades.pagamentoId` já bastam como AC — sem trilha própria.
>
> QA-05 e QA-08 descartados (decisão do produto, 31/07/2026): seeds de
> demonstração e runbook/monitoramento de go-live saem do escopo.
>
> QA-07 (31/07/2026): `encryption_key`/`kms:Decrypt` saiu do
> `iamRoleStatements` global do `provider` — ficou só `db`, que toda função
> precisa. Criado `custom.encryptionKeyIamStatements`, concedido função a
> função só onde o código de fato decifra `criancas.cpf`/`responsaveis[].cpf`/`saude.*`
> (rastreado até `CriancaRepository`/`agendaAccess`/`financeiroAccess`/
> `vincularCriancaTurma`): todas as funções de `criancas`, a maioria de
> `agendas` e `turmas`, `financeiro/getInadimplentes`, `mensalidades`
> (geração de mensalidade e listagem) e `pagamentos` (criação/consulta de
> PIX). Endpoints sem nenhum vínculo com `Crianca` — `configPrecos`,
> `despesas`, `dispositivos`, `planosAula`, `simulador` (único endpoint
> público, sem `cognitoAuthorizer`), `professores`, a maior parte de
> `usuarios` e o webhook do MercadoPago — não recebem mais essa permissão.
> `s3:GetObject`/Cognito/MercadoPago/Firebase já eram por função (sem
> mudança). `npm run typecheck` e `npm test` seguem verdes (2 falhas em
> `listTurmas.test.ts` são bug pré-existente, não relacionado — reproduzido
> também sem esta mudança).

**Subtotal Épico G:** 29 pts (MVP: ~23 pts).

---

## Épico H — Mural de avisos (AVI) — ✅ concluído

Front (`aquarela_app`) tem tela de criação (`AvisosScreen.tsx`, admin) e leitura (responsável, via `AgendaService.getAvisos()`). Back (`aquarela_serverless`) tem modelo, validação, RBAC e endpoints. Contrato em `docs/03-Backend.md` §5 (Avisos) e `docs/04-Banco-de-Dados.md`.

| ID     | Tarefa                                                    | Prio | Pts | Camada | Dep.    | AC                                                                              |
| ------ | ---------------------------------------------------------- | ---- | --- | ------ | ------- | -------------------------------------------------------------------------------- |
| AVI-01 | ✅ Modelo `avisos` (BE) + índice `{ativo, createdAt}`      | 🔴   | 2   | BE     | INF-06  | Campos: título, corpo, autorId, turmaId?, ativo, timestamps                      |
| AVI-02 | ✅ Schema ajv + endpoint `POST /avisos` (criar)             | 🔴   | 3   | BE     | AVI-01  | Só `admin`; validação de payload; 201 + id gerado                                |
| AVI-03 | ✅ Endpoint `GET /avisos` (listar)                          | 🔴   | 3   | BE     | AVI-01  | `admin` vê `ativo:true` por padrão; `professor`/`responsavel` só os globais/das próprias turmas, ordenado por data |
| AVI-04 | ✅ Endpoint `PUT`/`DELETE /avisos/{id}` (editar/remover)    | 🟡   | 3   | BE     | AVI-01  | Só `admin`; `DELETE` é **hard delete** (apaga o documento — ver correção abaixo) |
| AVI-05 | ✅ Atualizar `docs/03-Backend.md` e `docs/04-Banco-de-Dados.md` com contrato | 🔴 | 1 | BE | AVI-01…04 | Contrato de `/avisos` documentado p/ o front não sair do combinado |

**Subtotal Épico H:** 12 pts (MVP: 12 pts) — 12/12 concluídos.

> **Correção pós-implementação (29/07/2026):** `DELETE /avisos/{id}` nasceu como soft delete (`ativo:false`), mas a listagem do admin (`GET /avisos`) não filtrava `ativo` por padrão — um aviso "removido" continuava aparecendo pro admin, e a 2ª tentativa de remover virava no-op silencioso (já estava `ativo:false`). Criar um novo aviso com o mesmo título então parecia "duplicar" o antigo na tela. Corrigido trocando `DELETE` pra hard delete de verdade (`removeAviso.ts`) e o default da listagem do admin pra `ativo:true` (`listAvisos.ts`) — ver `docs/03-Backend.md` §5.

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
| NOT-07 | ⚪ Coleção `notificacoes` — log de envio/erro para auditoria — **descartado** (decisão do produto, 30/07/2026)             | ⚪   | 2   | BE     | NOT-05                 | Registro por envio com status e motivo da falha; sem PII no log                                  |
| NOT-08 | ✅ `agendasDiarias.enviadaEm` + `POST /agenda/{id}/enviar` (idempotente)                       | 🔴   | 5   | BE     | AGD-02, AGD-04, NOT-05 | Só professor da turma (mesma regra de escrita de `createAgenda`/`updateAgenda` — sem admin); 2º disparo → 409; notifica todos os responsáveis da criança |
| NOT-09 | ⚪ Disparo imediato em **intercorrência** (ignora o botão de envio) — **descartado** (decisão do produto, 30/07/2026); segue só reenvio genérico via `updateAgenda`  | ⚪   | 3   | BE     | AGD-08, NOT-05         | Febre/queda notifica na hora; corpo genérico ("a professora registrou um aviso")                 |
| NOT-10 | ✅ PWA no front: `manifest.json` (`display: standalone`) + ícones + `firebase-messaging-sw.js` | 🔴 | 3 | FE | INF-07 | Service worker servido na **raiz** do domínio; app instalável; HTTPS |
| NOT-11 | ✅ Onboarding de instalação (detecta iOS não-instalado e **webview de app** → sai para o browser) | 🔴 | 5 | UX/FE | NOT-10 | Guia passo a passo no iPhone; detecta webview (WhatsApp/Instagram, confirmado no spike que não suporta push) e instrui "Abrir no Safari/Chrome"; estado "instalado" detectado |
| NOT-12 | ✅ Fluxo de permissão contextualizado + `getToken` + registro no back (`POST /dispositivos`) | 🔴 | 5 | FE | NOT-10, NOT-04 | Explica o benefício **antes** de `requestPermission()` — o browser só pergunta uma vez; token enviado ao back |
| NOT-13 | ✅ Ciclo de vida do token: reenvio no login, `onTokenRefresh`, `DELETE /dispositivos/{token}` no logout | 🔴 | 2 | FE | NOT-12 | Token nunca fica órfão nem obsoleto; logout limpa o dispositivo |
| NOT-14 | ✅ `onMessage` em primeiro plano → toast in-app | 🟡 | 2 | FE | NOT-12, INF-10 | App aberto não perde o aviso (SO não exibe notificação nesse caso) |
| NOT-15 | ✅ Botão **"Enviar para os pais"** na tela de agenda do professor (`POST /agenda/{id}/enviar`) + estado "enviada" | 🔴 | 3 | FE | NOT-08, AGD-05 | Professor vê se já enviou (`enviadaEm`); botão bloqueia reenvio acidental; back responde 409 se já enviado |
| NOT-16 | ✅ Tela de preferências: status da notificação, reativar, diagnosticar permissão bloqueada | 🟡 | 3 | FE | NOT-12 | Responsável que negou a permissão recebe instrução de como reverter no browser |
| NOT-17 | ⚪ Opt-in registrado + payload **sem PII/saúde** (LGPD) — **descartado** (decisão do produto, 30/07/2026)                    | ⚪   | 3   | FS     | NOT-05, NOT-12         | Consentimento com timestamp do servidor; corpo genérico auditado; detalhe só no app autenticado  |
| NOT-18 | ✅ Teste em dispositivos reais (Android, iPhone c/ PWA, desktop) antes do go-live — **concluído e funcional (30/07/2026)** | 🔴   | 3   | QA     | NOT-15                 | Matriz de plataformas validada com app fechado; casos de falha documentados                      |
| NOT-19 | ⚪ Observabilidade: taxa de entrega + **% de responsáveis sem token válido** — **descartado** (decisão do produto, 30/07/2026) | ⚪   | 3   | INFRA  | NOT-07                 | Admin enxerga quem está no escuro; alarme quando a cobertura cai                                 |
| NOT-20 | ✅ Atualizar `docs/03-Backend.md` e `docs/04-Banco-de-Dados.md` com o contrato                | 🔴   | 1   | BE     | NOT-01…NOT-09          | `/dispositivos`, `/agenda/{id}/enviar`, `dispositivos` documentados                               |

**Subtotal Épico I:** 62 pts (MVP: ~49 pts sem os Should) — épico fechado: NOT-18 concluído (teste em dispositivo real, funcional); NOT-07, NOT-09, NOT-17, NOT-19 descartados por decisão do produto (30/07/2026), não entram mais no escopo.

> **NOT-10…NOT-16 implementados no front.** `src/contexts/NotificationsContext.tsx`
> concentra permissão/token/toast (SDK modular do `firebase/messaging` não tem
> mais `onTokenRefresh` — o substituto é chamar `getToken()` de novo no login,
> idempotente no back). `src/utils/device.ts` isola a detecção de
> plataforma/iOS/webview/PWA-instalado (testado em `device.test.ts`, sem DOM).
> Onboarding (`src/features/notificacoes/NotificationOnboarding.tsx`) só
> aparece pro responsável, na `InicioScreen`; a tela de preferências
> (`NotificacoesScreen.tsx`) é reusada nas duas rotas
> (`/perfil/notificacoes` e `/professor/perfil/notificacoes`). Botão "Enviar
> para os pais" ficou em `RegistrarAgendaScreen.tsx` (não na lista de alunos)
> — só aparece depois que a agenda do dia já foi salva. Ícones do manifest
> foram gerados (gota em gradiente, mesma identidade do `Logo.tsx`) já que não
> havia asset PNG da marca no repo. **NOT-18 (teste em dispositivo real) segue
> em aberto** — QA manual, fora do que dá pra automatizar.

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

## Épico J — Cobrança automática e inadimplência (COB)

> Fecha duas lacunas do Épico D: hoje a mensalidade é gerada e fica esperando o
> responsável lembrar de pagar, e "inadimplente" é só `status: "atrasado"`
> (vencimento + 1 dia), sem carência nenhuma. Este épico coloca **lembrete
> automático nos dias 05 e 20** e um **corte formal de inadimplência**
> configurável, com o dia 10 como padrão.

**Decisões travadas (01/08/2026):**

1. **Canal = push (FCM) + badge in-app.** Reusa o motor `enviarNotificacao`
   (NOT-05) e o canal `canalFcm`. Nada de e-mail/WhatsApp nesta fase — o motor
   já nasceu plugável, então trocar/adicionar canal depois não muda quem chama.
   Limitação herdada e conhecida: **iPhone só recebe com o PWA instalado**
   (NOT-11), cobertura realista 75–85%. Por isso o badge in-app é parte do
   escopo, não polimento: quem não recebe push precisa ver a pendência ao abrir.
2. **Corpo da notificação sem valor em reais.** Nome da criança e competência
   podem aparecer (mesmo padrão do "A agenda de hoje da Sofia já está
   disponível"); **valor devido, não** — a notificação aparece na tela de
   bloqueio. Valor só dentro do app autenticado.
3. **Inadimplência = vencimento da criança + carência até o dia de corte.** O
   `diaVencimento` individual continua mandando; o dia 10 é o **corte**, não um
   vencimento global. Regra: a mensalidade vira inadimplente no **dia 10 do mês
   seguinte ao da competência**, se ainda não estiver `pago`.
   - ⚠️ **Consequência a conferir com a escola:** mensalidade com vencimento em
     05/08 só entra na lista de inadimplentes em **10/09** — 36 dias de carência.
     Se o corte tiver que ser mais curto, `configPrecos.inadimplencia.mesesCarencia = 0`
     joga o corte para 10/08. É por isso que a regra nasce **configurável**
     (COB-06) em vez de constante no código.
   - Entre o vencimento e o corte a mensalidade continua `atrasado` (cobrável,
     aparece em vermelho para o responsável) mas **fora** da lista de
     inadimplentes e do KPI do dashboard.

| ID     | Tarefa                                                                                       | Prio | Pts | Camada | Dep.            | AC                                                                                                       |
| ------ | -------------------------------------------------------------------------------------------- | ---- | --- | ------ | --------------- | --------------------------------------------------------------------------------------------------------- |
| COB-01 | ✅ Cron `dispararCobrancas` nos dias **05 e 20** (`cron(0 12 5,20 * ? *)` = 09:00 GMT-3)       | 🔴   | 5   | BE     | FIN-01, NOT-05  | Seleciona só mensalidades `aberto`/`atrasado` com `vencimento` **até o fim do mês corrente** — nunca cobra competência futura pré-gerada por `gerarMensalidadesAno` |
| COB-02 | ✅ Agregar por responsável (1 push por pessoa, não por mensalidade) + deep link para `/financeiro` | 🔴   | 3   | BE     | COB-01          | Responsável com 3 filhos × 4 meses em aberto recebe **1** notificação, não 12; `dados.tipo = "cobranca"`; 1 chamada de `enviarNotificacao` por responsável (motor não mudou de assinatura) |
| COB-03 | ✅ `mensalidades.cobrancas[]` + idempotência por `(gatilho, disparado hoje)`                   | 🔴   | 2   | BE     | COB-01          | Cron reexecutado no mesmo dia não redispara; histórico capado nas últimas 12 entradas                    |
| COB-04 | ✅ `POST /financeiro/cobrancas/disparar` (admin) com `dryRun`                                  | 🟡   | 3   | BE     | COB-01          | `dryRun:true` devolve **contagens** (notificados/sem token) sem enviar nada; `false` dispara e grava em `cobrancas[]`. `GET /financeiro/cobrancas` (histórico) **não implementado** — fora do escopo desses IDs |
| COB-05 | Tela admin: botão "Disparar cobranças agora" + prévia da lista                                | 🟡   | 3   | FE     | COB-04          | Prévia (dryRun) antes de confirmar; feedback de quantos foram notificados e quantos **sem token válido**  |
| COB-06 | ✅ `configPrecos.inadimplencia { diaCorte, mesesCarencia }` + campo na tela de config           | 🔴   | 3   | FS     | SIM-01          | Admin edita o corte (default `{ diaCorte: 10, mesesCarencia: 1 }`); validação `1 ≤ diaCorte ≤ 28`         |
| COB-07 | ✅ Cron diário `marcarInadimplentes` + `mensalidades.inadimplenteDesde`                        | 🔴   | 5   | BE     | COB-06          | Roda 00:05 GMT-3 (`cron(5 3 * * ? *)`); cron só **marca** (pagar é quem limpa `inadimplenteDesde`, na mesma transação da baixa — ver `docs/03-Backend.md`) |
| COB-08 | ✅ `GET /financeiro/inadimplentes` passa a filtrar `inadimplenteDesde` (não mais `status`) + KPI | 🔴   | 3   | FS     | COB-07, FIN-12  | Mensalidade `atrasado` dentro da carência **some** da lista; KPI do dashboard conta **crianças distintas** (automático — front já agrupa por `criancaId` antes de contar) |
| COB-09 | ✅ Badge "Inadimplente" na lista de crianças + faixa no financeiro do responsável (`aquarela_app`) | 🟡   | 3   | FE     | COB-08          | Ícone + texto (nunca só cor); responsável vê desde quando está inadimplente e o valor total; também: pontinho na tab "Financeiro" e banner na Início |

**Subtotal Épico J:** 30 pts.

---

## Épico K — Recados com anexo entre responsável e professor (MSG)

> Itens 7 e 8 da lista de 01/08/2026. Hoje a única comunicação escola→casa é a
> agenda diária (mão única) e o mural de avisos (broadcast do admin). Falta o
> canal **casa→escola**: o responsável mandar um recado com documento anexo
> (atestado, receita, autorização) e o professor ler.
>
> **Escopo é thread por criança, não chat livre.** Toda mensagem nasce ligada a
> uma `criancaId` — é isso que resolve a autorização (responsável só do próprio
> filho, professor só de criança da sua turma) sem inventar um modelo de
> conversa. Sem indicador de digitação, sem tempo real, sem edição de mensagem
> enviada.

**Decisão travada — anexo sobe direto para o S3 por URL pré-assinada.** O
mecanismo base64-no-corpo usado hoje pela foto de criança/professor
(`fotoUpload.ts`) tem teto rígido de **2MB decodificados** (payload síncrono de
Lambda = 6MB, base64 infla 33%) — inviável para PDF de atestado e para o mural
de fotos (Épico M). O padrão novo, usado por MSG/AG2/FOT:

1. Front pede `POST /anexos/upload-url` com `{ escopo, nome, contentType, tamanho }`.
2. Back devolve `{ key, uploadUrl, expiraEm }` — presigned **PUT** de 5 min, com
   `Content-Type` e `Content-Length` **fixados na assinatura** (o browser não
   consegue subir outra coisa que não o que foi declarado).
3. Front faz o `PUT` direto no S3 (com barra de progresso) e depois manda só a
   `key` no `POST /mensagens`.
4. O back **nunca vê o arquivo**, então valida por `HeadObject` na hora de
   vincular: objeto existe, `ContentType`/`ContentLength` batem com o declarado,
   e a `key` tem o prefixo que ele mesmo emitiu. Não bateu → `422 ANEXO_INVALIDO`.
5. Objeto que subiu e nunca foi vinculado é lixo — cron diário `limparAnexosOrfaos`
   apaga o que tem mais de 24h sem referência em nenhuma coleção.

Whitelist: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`. Teto
**10MB por arquivo**, máx. 5 anexos por mensagem. Bucket é o **`FotosBucket` que
já existe** (privado, SSE-AES256, TLS obrigatório) — prefixo por escopo, sem
provisionar bucket novo.

| ID     | Tarefa                                                                                | Prio | Pts | Camada | Dep.           | AC                                                                                                  |
| ------ | ------------------------------------------------------------------------------------- | ---- | --- | ------ | -------------- | ----------------------------------------------------------------------------------------------------- |
| MSG-01 | `POST /anexos/upload-url` — presigned PUT + whitelist de tipo + teto de 10MB          | 🔴   | 5   | BE     | CAD-12         | `Content-Type`/`Content-Length` na assinatura; 5 min de validade; tipo fora da whitelist → `422`      |
| MSG-02 | Validação `HeadObject` no vínculo + cron diário `limparAnexosOrfaos`                  | 🔴   | 3   | BE     | MSG-01         | Key forjada/de outro escopo → `422 ANEXO_INVALIDO`; órfão > 24h é apagado do bucket                  |
| MSG-03 | Modelo `mensagens` + índice `{criancaId, createdAt:-1}`                              | 🔴   | 3   | BE     | CAD-08         | Estrutura da doc de banco; `turmaId` derivado da criança no back, **nunca** do payload               |
| MSG-04 | `POST /mensagens` e `GET /mensagens?criancaId=&desde=` com ownership                   | 🔴   | 5   | BE     | MSG-03, MSG-02 | Responsável só do próprio filho, professor só de criança da sua turma, admin tudo; senão `403`; `desde` filtra por `createdAt >` para fetch incremental pós-push |
| ~~MSG-05~~ | ~~`POST /mensagens/{id}/lida` + `GET /mensagens/nao-lidas`~~ — **removido (01/08/2026)** | ⚪ | – | – | – | Quem leu não é dado de negócio; badge vira cálculo local no cliente (ver MSG-10). Sem write nem query extra por abertura de thread |
| MSG-06 | `DELETE /mensagens/{id}` (autor ou admin) apagando o anexo no S3                       | 🟡   | 2   | BE     | MSG-04         | Hard delete; objeto do S3 removido junto; terceiro → `403`                                           |
| MSG-07 | Push ao professor quando o responsável envia (e vice-versa)                            | 🔴   | 2   | BE     | MSG-04, NOT-05 | Corpo genérico ("Novo recado sobre a Sofia"), **sem** o conteúdo da mensagem — LGPD, tela de bloqueio |
| MSG-08 | Componente `UploadAnexo` (presigned PUT + progresso + resize de imagem)                | 🔴   | 5   | FE     | MSG-01, INF-10 | Reusa `utils/imagem.ts` para imagem; PDF sobe cru; erro de rede é retentável sem perder o texto      |
| MSG-09 | Tela **Recados** do responsável (thread por filho + anexo), push-driven                | 🔴   | 5   | FE     | MSG-04, MSG-08 | Entrada pela tela da criança; lista desc paginada; sem polling — busca em `desde` ao abrir/receber push; anexo baixa por URL pré-assinada |
| MSG-10 | Tela **Recados** do professor + badge de não lidas na lista de alunos                  | 🔴   | 5   | FE     | MSG-09         | `AlunosScreen` mostra contador por aluno calculado **no cliente** (mensagens com `createdAt` após a última abertura salva localmente); abrir a thread atualiza a marca |
| MSG-11 | Atualizar `docs/03-Backend.md` e `docs/04-Banco-de-Dados.md` com o contrato            | 🔴   | 1   | BE     | MSG-01…MSG-07  | `/anexos/upload-url`, `/mensagens` e a coleção `mensagens` documentados                              |

**Subtotal Épico K:** 36 pts.

---

## Épico L — Agenda diária v2 (AG2)

> Itens 6, 9, 10 e 12. Evolução do Épico B com o que a operação pediu depois de
> usar a agenda de verdade.

**⚠️ Mudança de contrato (item 6) — `409 AGENDA_JA_ENVIADA` deixa de existir.**
Hoje `POST /agenda/{id}/enviar` é "envie uma vez": o 2º disparo responde `409` e
**não notifica**. Como o front chama essa rota automaticamente depois de todo
`save`, uma correção feita às 17h nunca chega ao responsável — ele leu a versão
das 11h e não sabe que mudou. A rota passa a ser **"notificar (re)envio"**:

- 1º envio → `enviadaEm` gravado, corpo "A agenda de hoje da Sofia já está disponível".
- Envios seguintes → corpo "A agenda de hoje da Sofia foi **atualizada**",
  `ultimoEnvioEm` e `enviosCount` atualizados. `enviadaEm` **não** é sobrescrito
  (continua sendo o 1º envio, que é o que a tela do professor mostra).
- **Debounce de 10 minutos por agenda**, sem o qual a mudança vira spam: o
  professor salva 5 vezes em 3 minutos e o responsável leva 5 pushes. Reenvio
  dentro da janela responde `200 { notificado: false, motivo: "DEBOUNCE" }` —
  sucesso, só não notificou.
- O front deixa de tratar `409` nesse fluxo (o branch atual pode ser removido).

| ID     | Tarefa                                                                              | Prio | Pts | Camada | Dep.            | AC                                                                                            |
| ------ | ----------------------------------------------------------------------------------- | ---- | --- | ------ | --------------- | ------------------------------------------------------------------------------------------------ |
| AG2-01 | ✅ `enviarAgenda` renotifica em toda edição + debounce de 10 min; remove o `409`        | 🔴   | 5   | BE     | NOT-08          | 2º envio após 10 min notifica "atualizada"; dentro da janela responde 200 sem notificar        |
| AG2-02 | ✅ Front: novo contrato (sem `409`) + estado "atualização enviada" na tela do professor | 🔴   | 2   | FE     | AG2-01, NOT-15  | Professor vê 1º envio e último reenvio; falha de envio não bloqueia o salvamento (best-effort) |
| AG2-03 | ✅ `agendasDiarias.tarefaCasa { status, observacao? }` + schema ajv                     | 🔴   | 2   | BE     | AGD-01          | `status ∈ feito \| nao_feito \| incompleto`; campo ausente no `PUT` = esvaziado (regra vigente) |
| AG2-04 | ✅ Chips de **tarefa de casa** no registro + destaque na leitura do responsável         | 🔴   | 3   | FE     | AG2-03, AGD-05  | 3 estados com ícone + texto (nunca só cor); observação opcional                                |
| AG2-05 | ✅ `agendasDiarias.presenca { status, horaChegada?, justificativa? }` + validação       | 🔴   | 3   | BE     | AGD-01          | `status ∈ presente \| falta \| atrasado`; `horaChegada` **obrigatório** se `atrasado` (ajv `if/then`) |
| AG2-06 | ✅ Seletor de presença/atraso na agenda + destaque na leitura                           | 🔴   | 3   | FE     | AG2-05, AGD-05  | `falta` colapsa os blocos de alimentação/sono/atividade na UI (não faz sentido preencher)      |
| AG2-07 | ✅ `agendasDiarias.anexos[]` + `GET /agenda` devolvendo URL pré-assinada                | 🔴   | 3   | BE     | MSG-01, AGD-01  | Máx. 5 anexos/dia; mesma whitelist e teto do Épico K; leitura por presigned de 1h              |
| AG2-08 | ✅ Anexar documento na agenda (professor) e baixar (responsável)                        | 🔴   | 5   | FE     | AG2-07, MSG-08  | Reusa `UploadAnexo`; responsável baixa da tela de agenda e do histórico                        |
| AG2-09 | `GET /agenda/frequencia?criancaId=&de=&ate=` (presente/falta/atrasado no período)    | 🟢   | 3   | FS     | AG2-05          | Contagem por status; usado no histórico e num futuro relatório de frequência — **adiado** (decisão do usuário, sem tela consumidora ainda) |
| AG2-10 | ✅ Atualizar `docs/03-Backend.md` e `docs/04-Banco-de-Dados.md`                         | 🔴   | 1   | BE     | AG2-01…AG2-07   | Novo contrato de `/agenda/{id}/enviar` + campos novos documentados                             |

**Subtotal Épico L:** 30 pts (MVP deste épico: 27 pts sem AG2-09).

> **MVP do épico (AG2-01…AG2-08, AG2-10) concluído em 02/08/2026.** AG2-09
> segue adiado — decisão do usuário, sem tela consumidora definida ainda.

---

## Épico M — Mural de fotos por evento (FOT)

> Item 14. Diferente do Épico H (mural de **avisos**, texto do admin): aqui o
> **professor** publica um álbum de um evento (festa junina, passeio, dia do
> brinquedo) e os responsáveis daquele escopo veem as fotos.
>
> Reaproveita o épico K inteiro para upload (presigned PUT, whitelist, teto de
> 10MB) e o motor de notificação do épico I para avisar que saiu álbum novo.

**🔴 Ponto de LGPD que precisa de decisão da escola antes de codar.** Foto de
criança é dado pessoal de menor, e o mural expõe a imagem de uma criança a
**outros responsáveis** da turma — é um tratamento diferente do
`consentimentoLgpd` genérico que já existe (aquele cobre cadastro/saúde). Por
isso:

- Nasce `criancas.consentimentoImagem { aceito, aceitoEm, registradoPor }`,
  coletado no cadastro em checkbox **separado** e — ao contrário do
  `consentimentoLgpd` — **revogável a qualquer momento** pelo responsável.
  Recusar não impede a matrícula.
- A tela de upload do professor mostra, fixa no topo, **os nomes das crianças da
  turma sem consentimento de imagem** — quem não pode aparecer na foto.
- Marcação de quem aparece (`fotos[].criancasIds`) é **opcional**; quando
  preenchida, o back **bloqueia a publicação** se alguma criança marcada não tem
  consentimento (`422 SEM_CONSENTIMENTO_IMAGEM`).
- Revogação posterior remove retroativamente as fotos em que a criança foi
  marcada e notifica o admin do que saiu do ar.

> O bloqueio duro só funciona onde há marcação — a marcação por foto é
> trabalhosa e o professor vai pular. **Trate o aviso na tela + o consentimento
> registrado como o controle real, e a marcação como reforço.** Se a escola
> quiser garantia forte, o caminho é tornar `criancasIds` obrigatório na
> publicação, com o custo de UX que isso traz. Confirmar antes do FOT-05.

| ID     | Tarefa                                                                    | Prio | Pts | Camada | Dep.           | AC                                                                                               |
| ------ | ------------------------------------------------------------------------- | ---- | --- | ------ | -------------- | --------------------------------------------------------------------------------------------------- |
| FOT-01 | Modelo `eventos` + índices `{turmaId, data:-1}` e `{publicado, data:-1}`  | 🔴   | 3   | BE     | CAD-06         | Estrutura da doc de banco; `turmaId` ausente = evento da escola inteira (mesma regra de `avisos`) |
| FOT-02 | CRUD `/eventos` com escopo por papel                                      | 🔴   | 5   | BE     | FOT-01         | Professor só das próprias turmas; responsável só `publicado:true` no escopo dele; admin tudo     |
| FOT-03 | `POST /eventos/{id}/fotos` e `DELETE /eventos/{id}/fotos/{fotoKey}`       | 🔴   | 3   | BE     | FOT-02, MSG-01 | Máx. 50 fotos/evento; `DELETE` apaga o objeto no S3; ordem preservada                            |
| FOT-04 | `POST /eventos/{id}/publicar` + notificação idempotente                   | 🔴   | 3   | BE     | FOT-02, NOT-05 | 2ª chamada não renotifica (usa `publicadoEm`); corpo "Novas fotos do evento X"                   |
| FOT-05 | `criancas.consentimentoImagem` (revogável) + regra de bloqueio            | 🔴   | 5   | FS     | CAD-08, FOT-03 | Checkbox separado no cadastro; revogação pelo responsável; lista de "não podem aparecer" na UI   |
| FOT-06 | Tela do professor: criar evento + upload múltiplo com resize e progresso  | 🔴   | 8   | FE     | FOT-03, MSG-08 | Seleção múltipla, resize no canvas antes do PUT, reordenar, legenda, rascunho × publicado        |
| FOT-07 | Tela do responsável: mural (grid + lightbox + download)                   | 🔴   | 5   | FE     | FOT-02         | Agrupado por evento/data; lightbox com teclado; baixa a foto original                            |
| FOT-08 | Atualizar `docs/03-Backend.md` e `docs/04-Banco-de-Dados.md`              | 🔴   | 1   | BE     | FOT-01…FOT-05  | `/eventos`, coleção `eventos` e `consentimentoImagem` documentados                               |

**Subtotal Épico M:** 33 pts.

---

## Épico N — Ajustes de cadastro, dashboard e operação (OPS)

> Itens 3, 4, 5, 11 e 13 — tarefas independentes entre si, sem tema comum além
> de "corrigir/completar o que já existe". **OPS-01 e OPS-02 são correção, não
> feature**, e deveriam entrar antes do resto do lote.

| ID     | Tarefa                                                                    | Prio | Pts | Camada | Dep.           | AC                                                                                             |
| ------ | ------------------------------------------------------------------------- | ---- | --- | ------ | -------------- | ------------------------------------------------------------------------------------------------- |
| OPS-01 | ✅ **Responsável não adiciona nem concede `podeRetirar`** (add é admin-only; edit/remove trava `podeRetirar`) | 🔴 | 5 | FS | CAD-09 | Ver regra detalhada abaixo; comparação por `usuarioId`/CPF normalizado, **nunca por índice do array** |
| OPS-02 | ✅ **Balanço em regime de caixa + fuso GMT-3** (back pronto; rótulo do card no `aquarela_app` segue pendente) | 🔴   | 5   | FS     | FIN-11         | Pagamento de 31/07 23:00 GMT-3 aparece em **julho**; despesa lançada 31/07 22h idem            |
| OPS-03 | **Múltiplos professores por turma** (`professorIds[]`)                    | 🔴   | 8   | FS     | CAD-06         | Migração sem downtime; todo ownership por turma passa a usar `includes`                        |
| OPS-04 | **Ficha de cadastro da criança para impressão** (A4, `@media print`)      | 🟡   | 5   | FE     | CAD-08         | Sem endpoint novo e sem lib de PDF — impressão nativa do browser                               |
| OPS-05 | **Notificação de aniversário** da criança                                 | 🟡   | 5   | FS     | NOT-05         | Cron 08:00 GMT-3; responsáveis + professores da turma; idempotente no mesmo dia                |

**Subtotal Épico N:** 28 pts.

### OPS-01 — `podeRetirar` é decisão da secretaria (✅ furo de segurança corrigido)

Até aqui `PUT /criancas/{id}` aceitava papel `responsavel` e a única trava era
`CAMPOS_EXCLUSIVOS_ADMIN = ["financeiro"]`. O array `responsaveis` inteiro
passava livre — **um responsável conseguia adicionar qualquer pessoa com
`podeRetirar: true`** e essa pessoa passava a constar como autorizada a tirar a
criança da escola. É segurança física de menor, não regra administrativa.

Regra em `assertMutacaoResponsaveis`
(`src/services/shared/criancaAccess.ts`), chamada logo depois de
`assertPodeEditarCrianca` em `updateCriancaService`, aplicada só quando o
requester **não é admin**:

| Ação sobre `responsaveis` | Admin | Responsável                                                     |
| ------------------------- | ----- | --------------------------------------------------------------- |
| Adicionar uma nova entrada (pessoa nova) | livre | **bloqueado** (`403 RESPONSAVEL_EXCLUSIVO_ADMIN`) — independe de `podeRetirar`, é a secretaria quem inclui gente nova |
| Alterar `podeRetirar` de entrada existente | livre | **bloqueado** nos dois sentidos (`true→false` também), `403 PODE_RETIRAR_EXCLUSIVO_ADMIN` |
| Remover entrada com `podeRetirar: true`    | livre | **bloqueado** (`403 PODE_RETIRAR_EXCLUSIVO_ADMIN`) — não derruba quem a escola autorizou |
| Remover entrada com `podeRetirar: false`   | livre | permitido |
| Alterar `usuarioId` de qualquer entrada    | livre | **bloqueado** (`403 PODE_RETIRAR_EXCLUSIVO_ADMIN`) |
| Editar nome/telefone/parentesco/CPF de entrada já existente | livre | permitido |

Detalhes que fazem a regra valer de fato:

- A comparação entre o array do banco e o do payload é feita **casando por
  CPF normalizado (só dígitos) e, quando existe, `usuarioId`** — nunca por
  posição no array. Comparar por índice deixa o bypass trivial: basta
  reordenar o array para uma entrada com `podeRetirar: true` "virar" outra.
  Não existe `cpfHash` por entrada de `responsaveis` (só `criancas.cpfHash`,
  da própria criança) — a comparação usa o CPF já decifrado em memória, sem
  tocar `src/libs/crypto.ts`.
- Toda mutação de `responsaveis` feita por responsável entra em
  `criancas.auditoria` (CAD-09) com os campos alterados — é o registro de quem
  mexeu em quê. Reusa o `appendAuditoria` que já existia, sem mecanismo novo.
- **Front (`EditarCriancaScreen`, responsável):** o toggle "Pode retirar a
  criança" fica `disabled` (checkbox não respeita `readOnly` em nenhum
  browser), com nota explicativa ("Só a secretaria autoriza quem pode retirar
  a criança"). O botão "Adicionar responsável" **não existe** nessa tela — no
  lugar, uma nota fixa explica que só a secretaria adiciona alguém novo. No
  admin (`CriancaStepper`) segue tudo livre: botão de adicionar, toggle
  editável, sem nenhuma trava. O bloqueio do front é UX — a fonte da verdade é
  o `403` do backend.

### OPS-02 — Balanço em regime de caixa (bug relatado em 01/08/2026)

**Sintoma:** pagamento feito em 31/07 não apareceu nas entradas de julho nem no
card "Entradas do mês"; apareceu em **agosto**, e só ficou visível em 01/08.

**Causa:** `getBalancoService` agrega `mensalidades` com
`{ $match: { ano, mes, status: "pago" } }` e agrupa por `$mes` — ou seja, por
**competência**, não por data do pagamento. A mensalidade paga em 31/07 era a
competência de **agosto** (o sistema pré-gera as 12 competências do ano em
`gerarMensalidadesAno`), então caiu em agosto por design. Somam-se dois erros de
fuso menores: `$month: "$data"` nas despesas usa **UTC** (despesa lançada dia 31
às 22h GMT-3 cai no mês seguinte) e a janela do período é montada com
`Date.UTC`, deslocada 3h.

**Correção (decisão travada: regime de caixa):**

1. Entradas passam a vir de `pagamentos`, não de `mensalidades`:
   `{ $match: { status: "pago", pagoEm: { $gte, $lt } } }` +
   `$group: { _id: { $month: { date: "$pagoEm", timezone: "America/Sao_Paulo" } } }`.
2. O valor somado passa a ser **`pagamentos.valor`** (o que entrou no caixa), não
   `mensalidades.valor` — casa com a baixa manual em dinheiro, que aceita valor
   diferente do da mensalidade (`POST /pagamentos/manual`, §7.1).
3. Despesas ganham o mesmo `timezone: "America/Sao_Paulo"` no `$month`.
4. A janela `inicioPeriodo`/`fimPeriodo` passa a ser calculada em GMT-3
   (reusar `utils/date.ts`, que já tem `hojeMeiaNoiteBrasil`), não `Date.UTC`.
5. O KPI "Entradas do mês" do dashboard usa o mesmo cálculo (mês corrente GMT-3).
6. **Estorno já está coberto:** o webhook remove o `pagamento` do banco quando o
   MercadoPago reporta `refunded`, então ele some do balanço sozinho.
7. **Front:** rotular o card e o eixo como "Entradas (regime de caixa — data do
   pagamento)", para não parecer inconsistente com a grade de competências que o
   responsável vê em `/financeiro`.
8. **Teste de regressão obrigatório:** pagamento com `pagoEm = 2026-07-31T23:00-03:00`
   de uma mensalidade `{ano:2026, mes:8}` → entra em **julho** no balanço.

### OPS-03 — Múltiplos professores por turma

`turmas.professorId: ObjectId` → **`turmas.professorIds: [ObjectId]`** (mínimo 1),
índice em `professorIds`.

- **Migração** (`scripts/migrations/2026-08-turmas-professorIds.ts`):
  `professorIds = [professorId]` para toda turma. `professorId` fica por **um
  release** como campo derivado somente-leitura (`= professorIds[0]`) para o
  front antigo não quebrar durante o deploy; some no release seguinte.
- **API:** `POST`/`PUT /turmas` passam a aceitar `professorIds: string[]` (≥1).
  `GET /turmas` devolve `professores: [{_id, nome, email}]` e mantém
  `professor` (= `professores[0]`) durante a janela de compatibilidade.
- **Ownership — todo ponto que hoje compara `turma.professorId === requester.professorId`
  vira `turma.professorIds.includes(...)`.** Pontos conhecidos a varrer:
  `services/shared/agendaAccess.ts`, `services/turmas/listTurmas.ts`,
  `services/turmas/listCriancasDaTurma.ts`, os services de `planosAula`
  (create/update/list), o escopo por turma de `listAvisos.ts` — e, quando
  existirem, `mensagens` (K) e `eventos` (M).
- **`planosAula.professorId` muda de significado:** hoje é derivado de
  `turma.professorId` ("o professor da turma"); passa a ser o **autor** (o
  `professorId` do requester; admin cai em `turma.professorIds[0]`).
- **`DELETE /professores/{id}`** hoje bloqueia com `409` se houver qualquer turma
  vinculada. Passa a bloquear só se o professor for o **único** de alguma turma;
  caso contrário é removido do array.
- **Front:** o formulário de turma vive dentro de `features/admin/turmas/TurmasScreen.tsx`
  (não há `TurmaForm` separado) — o `Select` de professora vira multi-select
  (mínimo 1); `TurmasScreen`/`AlunosScreen` listam os professores; a tela do professor
  continua mostrando "minhas turmas" — agora uma turma pode aparecer para mais
  de um professor.

### OPS-04 — Ficha de cadastro para impressão

100% front, **sem endpoint novo** (`GET /criancas/{id}` já devolve tudo) e **sem
lib de PDF** — a impressão nativa do browser gera PDF via "Salvar como PDF", o
que evita mais uma dependência e mais um caminho de código.

- Rota `/admin/criancas/[id]/ficha`, botão "Imprimir ficha" na lista e no detalhe.
- CSS: `@page { size: A4; margin: 12mm }` + `@media print` escondendo nav,
  bottom-tabs, botões e o próprio botão de imprimir.
- Conteúdo: foto, identificação (nome, nascimento, CPF, turma), responsáveis
  **com destaque de quem tem `podeRetirar`**, saúde (alergias, restrições,
  medicações contínuas, condições atípicas, cuidados), financeiro (valor e dia
  de vencimento), consentimentos e rodapé com data de emissão + aviso de
  documento confidencial (LGPD).
- Acesso: admin. Responsável imprimir a ficha do próprio filho fica como 🟢 Could.

### OPS-05 — Notificação de aniversário

- Cron `notificarAniversariantes`, diário às 08:00 GMT-3 (`cron(0 11 * * ? *)`).
- **Campo derivado indexado `criancas.nascimentoDiaMes: "MM-DD"`**, preenchido no
  `POST`/`PUT /criancas` + migração para o acervo. Alternativa (`$expr` com
  `$dayOfMonth`/`$month`) força collection scan diário — aceitável no volume
  atual, mas o campo derivado custa quase nada e resolve de vez.
- **Quem recebe:** responsáveis da criança ("Hoje é aniversário da Sofia! 🎉") e
  professores da turma ("Hoje é aniversário de 2 alunos da Turma Azul", 1 push
  agregado). Admin não recebe push — vê um card no dashboard.
- **Idempotência:** `criancas.ultimoAniversarioNotificadoEm` — cron reexecutado
  no mesmo dia não duplica.
- **Front:** `BirthdayContext` aparece em `docs/02-Frontend.md` §4 como contexto
  planejado, mas **não existe em `src/contexts/`** (só `Auth`, `Notifications`,
  `Responsavel`, `Theme`). Ou se cria o contexto, ou — mais simples nesta escala —
  o card de aniversariante lê direto do `GET /criancas` já carregado na Início do
  responsável e na lista de alunos do professor.

---

## Ordem de execução sugerida (lote de 01/08/2026)

| Fase | Tarefas                                        | Por quê                                                                              |
| ---- | ---------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1    | OPS-01, OPS-02, AG2-01, AG2-02                 | Correções: furo de segurança, número errado no dashboard e agenda editada que não avisa |
| 2    | MSG-01, MSG-02, MSG-08                         | Infra de anexo — destrava K, L e M de uma vez                                         |
| 3    | COB-06, COB-07, COB-08, COB-09                 | Inadimplência precisa estar definida antes de cobrar                                  |
| 4    | COB-01…COB-05                                  | Cobrança automática nos dias 05 e 20                                                  |
| 5    | AG2-03…AG2-08, OPS-03                          | Agenda v2 + múltiplos professores                                                     |
| 6    | MSG-03…MSG-07, MSG-09…MSG-11                   | Recados com anexo                                                                     |
| 7    | FOT-01…FOT-08                                  | Mural de fotos (maior e o único com pendência jurídica aberta)                        |
| 8    | OPS-04, OPS-05, AG2-09                         | Impressão, aniversário e frequência                                                   |

## Pendências de decisão antes de codar

| # | Pendência                                                                 | Bloqueia | Default se ninguém decidir                       |
| - | ------------------------------------------------------------------------- | -------- | ------------------------------------------------ |
| 1 | Carência de 36 dias até virar inadimplente é o que a escola quer?         | COB-07   | `{ diaCorte: 10, mesesCarencia: 1 }`, configurável |
| 2 | Marcação de criança por foto é obrigatória na publicação do mural?        | FOT-05   | Opcional — aviso na tela + consentimento registrado |
| 3 | Cobrança precisa alcançar quem não instalou o PWA (e-mail/WhatsApp)?      | COB-01   | Só push + badge in-app nesta fase                 |

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
| J — Cobrança/inadimplência | 30     | —         |
| K — Recados com anexo | 39          | —         |
| L — Agenda diária v2  | 30          | —         |
| M — Mural de fotos    | 33          | —         |
| N — Ajustes cadastro/dashboard | 28 | —         |
| **Total**             | **544**     | **315**   |

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
