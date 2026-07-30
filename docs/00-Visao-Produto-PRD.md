# Aquarela Kids — Visão de Produto (PRD)

> Documento de Product Owner. Fonte da verdade para o **o quê** e o **porquê** do produto.
> Versão 0.1 — 16/07/2026 · Status: rascunho para validação

---

## 1. Visão do produto

**Aquarela Kids** é um sistema de gestão para berçário e hotelzinho infantil (crianças de 1 a 8 anos) que conecta três públicos — **administração**, **professores** e **pais/responsáveis** — em torno de duas necessidades centrais: acompanhar o dia a dia da criança com transparência e organizar a operação (turmas, cadastros, financeiro) sem papel e sem planilha solta.

**Frase-visão:**
> "Para famílias e educadores de berçário que hoje dependem de cadernos de recados e planilhas, o Aquarela Kids é uma plataforma web que dá visibilidade em tempo real do cuidado com a criança e simplifica a gestão financeira e pedagógica da instituição."

### Problema
- Pais não têm visibilidade do dia da criança (o que comeu, se dormiu, se tomou remédio, atividades).
- A instituição controla mensalidades, cadastros e informações de saúde em papel/planilhas, com risco de erro e retrabalho.
- Informações críticas de cuidado (alergias, medicações, restrições) ficam dispersas e nem sempre chegam ao professor certo.
- Cobrança e conciliação de pagamentos são manuais.

### Proposta de valor
| Público | O que ganha |
|---|---|
| **Pais/responsáveis** | Agenda diária da criança em tempo real, histórico, pagamento de mensalidade via PIX e comprovantes num só lugar. |
| **Professores** | Registro rápido da agenda diária, visão das turmas e alunos, planos de aula e alertas de cuidado por criança. |
| **Administração** | Cadastros centralizados, controle financeiro (entradas, despesas, inadimplência), relatórios e simulador de mensalidade para captar novas matrículas. |

---

## 2. Objetivos e métricas de sucesso

| Objetivo | Métrica (KPI) | Meta inicial |
|---|---|---|
| Engajar pais na plataforma | % de pais ativos/semana | ≥ 70% |
| Reduzir trabalho manual do professor | Tempo médio para preencher agenda diária | ≤ 2 min/criança |
| Melhorar conciliação financeira | % de mensalidades pagas via PIX no app | ≥ 80% |
| Reduzir inadimplência | % de mensalidades em atraso | ≤ 10% |
| Converter interessados | Simulações → matrículas | acompanhar taxa |

---

## 3. Personas

**1. Dona Marta — Administradora/Diretora (45)**
Dirige o Aquarela Kids. Precisa enxergar a saúde financeira do negócio (balanço mensal/anual, despesas, inadimplentes), cadastrar turmas e usuários, e não quer depender de planilhas. Pouca paciência com sistemas complicados.

**2. Professora Alice — Educadora (29)**
Cuida de uma ou mais turmas. Ao longo do dia registra alimentação, sono, atividades, humor, medicações e intercorrências de cada criança. Quer algo rápido, no celular ou tablet, com poucos toques. Precisa ver rapidamente os cuidados especiais de cada aluno.

**3. Ricardo & Juliana — Pais (34 e 32)**
Trabalham fora e deixam a filha o dia todo. Querem ver, do celular, como foi o dia dela e receber aviso se algo aconteceu (febre, queda, remédio). Pagam a mensalidade e querem fazer isso via PIX sem sair do app, com histórico de meses pagos/em aberto.

**4. Fernando — Pai interessado (38)**
Ainda não é cliente. Está pesquisando berçários e quer simular quanto pagaria por diferentes períodos antes de agendar uma visita.

---

## 4. Papéis e permissões (RBAC)

| Recurso | Admin | Professor | Responsável | Visitante |
|---|---|---|---|---|
| Simulador de mensalidade | ✅ | — | — | ✅ |
| Cadastro/edição de crianças | ✅ | leitura | leitura (do próprio filho) | — |
| Cadastro de turmas | ✅ | leitura | — | — |
| Cadastro de professores | ✅ | — | — | — |
| Cadastro de usuários | ✅ | — | — | — |
| Agenda diária — escrever | ✅ | ✅ (sua turma) | — | — |
| Agenda diária — ler | ✅ | ✅ (sua turma) | ✅ (próprio filho) | — |
| Planos de aula | ✅ | ✅ (sua turma) | — | — |
| Pagamento de mensalidade (PIX) | — | — | ✅ | — |
| Financeiro (balanço, despesas, relatórios) | ✅ | — | — | — |
| Remover usuários | ✅ | — | — | — |

> A criança **não** é usuário do sistema; ela é a entidade acompanhada. Os "usuários" são Admin, Professor e Responsável (mais o Visitante público do simulador).

---

## 5. Épicos e funcionalidades

### Épico A — Cadastros base
**CRUD completo** (criar, listar, editar e **remover**) de crianças, turmas, professores e usuários. Remoção é sempre **hard delete** (definitiva).
- **Crianças:** cadastro/edição com dados completos (ver seção 6), remoção definitiva (em cadeia: apaga agenda, mensalidades e pagamentos vinculados).
- **Turmas:** cadastro/edição (nome, descrição, faixa etária, professora vinculada) e remoção (bloqueada se a turma tiver crianças ativas — realocar antes).
- **Professores:** cadastro/edição/remoção (remoção bloqueada se houver turma vinculada).
- **Usuários** (admin, professor, responsável): cadastro/edição/remoção e definição de papel.
- **Vínculos:** criança ↔ turma (vincular, desvincular e **mover** de turma — uma turma por vez) e responsável ↔ criança.

### Épico B — Agenda diária
- Professor registra por criança/dia: alimentação, sono, atividades, humor, higiene, medicação administrada, intercorrências (febre, doença, queda), observações.
- Anexos (fotos do dia) — *opcional fase 2*.
- Histórico navegável por data.
- Notificação ao responsável quando há intercorrência relevante.

### Épico C — Portal dos pais
- Login do responsável para ver a agenda do dia e o histórico do filho.
- Visualização dos cuidados/observações registrados.
- Aviso de intercorrências.

### Épico D — Financeiro & pagamentos
- Geração de mensalidades por criança/mês.
- Pagamento via **PIX** (QR Code / copia-e-cola) pelo responsável.
- Painel de meses **pagos** × **em aberto** para o responsável.
- Para o admin: entradas mensais, despesas, balanço mensal e anual, lista de inadimplentes, exportação de relatórios (Excel).

### Épico E — Simulador de mensalidade
- Interface pública onde o interessado informa período (nº de meses ou dias) e recebe o valor total estimado, com feedback visual (comparação entre planos).

### Épico F — Pedagógico
- Planos de aula por turma.
- Visão do professor: minhas turmas → meus alunos → agenda/anotações.

---

## 6. Modelo de informação da criança (regra de negócio)

Cadastro de uma criança deve conter:
- **Identificação:** nome completo, data de nascimento, CPF da criança, foto.
- **Responsáveis:** pai e mãe (ou responsáveis legais) — nome, CPF, telefone, e-mail, parentesco, quem pode retirar a criança.
- **Turma:** turma atual (vinculada por faixa etária).
- **Saúde e cuidados:** medicações de uso contínuo (nome, dose, horário), alergias, restrições alimentares, condições/necessidades atípicas, cuidados especiais e observações.
- **Financeiro:** plano/valor da mensalidade, dia de vencimento.

Faixas etárias de referência: 1–3 anos, 3–5 anos, 5–7/8 anos.

---

## 7. User stories (amostra priorizada)

Formato: *Como <papel>, quero <ação> para <benefício>.* — com critérios de aceite resumidos.

**US-01 (Must) — Registrar agenda diária**
Como professora, quero registrar alimentação, sono, atividades e medicação de cada criança, para que os pais acompanhem o dia.
*Aceite:* consigo registrar por criança; campos obrigatórios mínimos; salva com data/hora; editável no mesmo dia.

**US-02 (Must) — Ver agenda do filho**
Como responsável, quero ver a agenda do dia e o histórico do meu filho, para acompanhar o cuidado.
*Aceite:* vejo apenas meu(s) filho(s); posso navegar por datas; vejo intercorrências destacadas.

**US-03 (Must) — Pagar mensalidade via PIX**
Como responsável, quero pagar a mensalidade por PIX no app e ver o status, para não precisar de boleto.
*Aceite:* gero QR/copia-e-cola; após confirmação, mês fica "pago"; comprovante disponível.

**US-04 (Must) — Ver meses pagos/em aberto**
Como responsável, quero ver quais meses estão pagos e quais em aberto, para me organizar.
*Aceite:* lista por ano com status e valores; destaque de vencidos.

**US-05 (Must) — Cadastrar/editar criança**
Como admin, quero cadastrar e editar todos os dados da criança, para manter informações de saúde e responsáveis corretas.
*Aceite:* todos os campos da seção 6; validação de CPF; histórico de alterações.

**US-06 (Must) — Cadastrar turma com professora**
Como admin, quero criar turmas com nome, descrição e professora vinculada, para organizar as crianças.
*Aceite:* vínculo turma↔professora; vínculo criança↔turma.

**US-07 (Must) — Simular mensalidade**
Como visitante, quero simular quanto pagaria por N meses, para decidir matricular meu filho.
*Aceite:* informo período; vejo total e comparação visual; sem necessidade de login.

**US-08 (Must) — Balanço financeiro**
Como admin, quero ver balanço mensal/anual, entradas, despesas e inadimplentes, para gerir o negócio.
*Aceite:* filtros por período; exportação em Excel.

**US-09 (Should) — Alerta de intercorrência**
Como responsável, quero ser avisado quando meu filho passar mal ou tomar remédio, para agir rápido.
*Aceite:* notificação quando o professor marca intercorrência.

**US-10 (Should) — Plano de aula**
Como professor, quero registrar planos de aula por turma, para organizar as atividades.

**US-11 (Could) — Gestão de usuários**
Como admin, quero criar e remover usuários e definir papéis, para controlar o acesso.

---

## 8. Escopo do MVP × versões futuras

**MVP (fase 1)**
- Autenticação e papéis (Admin, Professor, Responsável).
- Cadastros: criança, turma, professor, usuário.
- Agenda diária (escrita pelo professor, leitura pelos pais) + histórico.
- Financeiro básico: mensalidades, PIX, meses pagos/em aberto, despesas simples e balanço mensal.
- Simulador de mensalidade.

**Fase 2**
- Notificações push (intercorrências, avisos).
- Fotos na agenda diária.
- Relatórios avançados e balanço anual detalhado.
- Planos de aula.

**Fase 3+**
- Comunicação (mural/chat instituição↔pais).
- Cardápio semanal, controle de vagas/lista de espera.
- App mobile nativo.

---

## 9. Riscos e premissas

| Risco | Mitigação |
|---|---|
| Dados sensíveis de crianças (LGPD) | Consentimento no cadastro, controle de acesso rígido, criptografia, política de retenção. |
| Conciliação de PIX (confirmação de pagamento) | Usar webhook do provedor (MercadoPago) para confirmar automaticamente. |
| Adoção pelos professores | UX de registro rápido; funcionar bem em tablet/celular. |
| Erros em dados de saúde | Campos estruturados + validação; destaque visual de alergias/medicações. |

**Premissas:** cada criança tem 1+ responsáveis com login próprio; um professor pode ter várias turmas; mensalidade pode variar por criança/plano.

---

## 10. Roadmap resumido

```
Fase 1 (MVP)      Fase 2                 Fase 3+
├ Auth/RBAC       ├ Push notifications   ├ Mural/chat pais
├ Cadastros       ├ Fotos na agenda      ├ Cardápio semanal
├ Agenda diária   ├ Relatórios avançados ├ Lista de espera
├ Financeiro PIX  └ Planos de aula       └ App mobile nativo
└ Simulador
```

---

## 11. Glossário
- **Agenda diária:** registro do dia da criança (alimentação, sono, atividades, saúde).
- **Turma:** grupo de crianças por faixa etária, com professora responsável.
- **Responsável:** pai/mãe/tutor com acesso à agenda e ao financeiro do próprio filho.
- **Intercorrência:** evento de saúde/segurança (febre, doença, queda, medicação).
- **Simulador:** ferramenta pública de estimativa de mensalidade.
