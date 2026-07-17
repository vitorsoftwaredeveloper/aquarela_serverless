# Aquarela Kids — Design & UX

> Diretrizes de experiência, inventário de telas e wireframes descritos.
> Versão 0.1 — 16/07/2026

---

## 1. Princípios de design

1. **Registro em segundos.** O professor preenche a agenda dezenas de vezes por dia — cada tela de registro deve priorizar toques rápidos, valores pré-definidos (chips/toggles) e o mínimo de digitação.
2. **Confiança para os pais.** A agenda é sobre o filho deles. Clareza, tom acolhedor, destaque para saúde/intercorrências e nada de jargão.
3. **Mobile-first.** Professores usam tablet/celular; pais usam celular. Admin usa mais desktop.
4. **Segurança visível.** Alergias, medicações e restrições sempre com destaque (cor/ícone) onde a criança aparece.
5. **Acessível e caloroso.** Contraste adequado (WCAG AA), alvos de toque ≥ 44px, linguagem simples, identidade lúdica ("aquarela").

---

## 2. Identidade visual (base para o Design System)

- **Conceito:** aquarela infantil — cores suaves, cantos arredondados, ilustrações leves.
- **Paleta sugerida:**
  - Primária: azul-aquarela `#4C9BE8`
  - Secundária: verde-menta `#5FC9A6`
  - Acento/alerta suave: coral `#FF8A65`
  - Alerta crítico (saúde): vermelho `#E5484D`
  - Neutros: `#1F2933` (texto), `#6B7280` (secundário), `#F7F9FC` (fundo)
- **Tipografia:** uma família amigável e legível (ex.: Nunito/Poppins para títulos, Inter para texto).
- **Tokens:** cores, espaçamentos (4/8/12/16/24/32), raios (8/12/16), sombras. Implementados como variáveis CSS e expostos via `ThemeContext` (tema claro/escuro).
- **Ícones:** `lucide-react` (consistência com o front-end).

---

## 3. Componentes-base (Design System)

Botão, Input, Select, DatePicker, Chip/Tag, Toggle, Card, Modal, Tabela, Badge de status (pago/em aberto/atrasado), Avatar da criança, Alerta de saúde, Empty state, Toast/Notificação, Tabs, Stepper (simulador/cadastro em etapas), QRCode (pagamento).

---

## 4. Mapa de navegação por papel

```
Visitante ──► Landing ──► Simulador ──► CTA "Agende uma visita"
                       └► Login

Responsável ─► Home (meus filhos) ─► Agenda do dia / Histórico
                                  └► Financeiro (meses pagos/abertos → PIX)

Professor ───► Minhas turmas ─► Alunos da turma ─► Registrar agenda
                             └► Planos de aula

Admin ───────► Dashboard ─► Crianças · Turmas · Professores · Usuários
                         └► Financeiro (balanço, despesas, relatórios, inadimplentes)
                         └► Simulador (config. de valores)
```

---

## 5. Inventário de telas

| # | Tela | Papel | Prioridade |
|---|---|---|---|
| T-01 | Landing / apresentação | Visitante | MVP |
| T-02 | Simulador de mensalidade | Visitante/Admin | MVP |
| T-03 | Login | Todos | MVP |
| T-04 | Home do responsável (lista de filhos) | Responsável | MVP |
| T-05 | Agenda diária do filho (dia) | Responsável | MVP |
| T-06 | Histórico da criança | Responsável | MVP |
| T-07 | Financeiro do responsável (meses) | Responsável | MVP |
| T-08 | Pagamento PIX (QR/copia-e-cola) | Responsável | MVP |
| T-09 | Minhas turmas | Professor | MVP |
| T-10 | Alunos da turma | Professor | MVP |
| T-11 | Registrar/editar agenda diária | Professor | MVP |
| T-12 | Plano de aula | Professor | Fase 2 |
| T-13 | Dashboard admin | Admin | MVP |
| T-14 | Cadastro/edição de criança | Admin | MVP |
| T-15 | Cadastro de turmas | Admin | MVP |
| T-16 | Cadastro de professores | Admin | MVP |
| T-17 | Gestão de usuários | Admin | MVP |
| T-18 | Financeiro admin (balanço/despesas/relatórios) | Admin | MVP |

---

## 6. Wireframes descritos (telas-chave)

### T-11 · Registrar agenda diária (professor) — a mais usada
```
┌─────────────────────────────────────────┐
│ ‹ Turma Girassóis   ▸ Ana Clara (2a)  📅 hoje │
├─────────────────────────────────────────┤
│ ⚠ Alergia: amendoim  · 💊 09h Dipirona    │  ← faixa de cuidado sempre visível
├─────────────────────────────────────────┤
│ 🍽 Alimentação                            │
│  [Café ✓] [Almoço ✓] [Lanche ○] [Janta ○]│  ← chips de toque
│  Aceitação: ( ) tudo (•) parte ( ) recusou │
│ 😴 Sono   [ 12:30 – 14:00 ]  + adicionar   │
│ 🎨 Atividades  [pintura] [música] [+]      │
│ 🙂 Humor   ( ) 😀 (•) 🙂 ( ) 😐 ( ) 😢     │
│ 🚼 Higiene  fraldas: [ - 3 + ]             │
│ 💊 Medicação  + registrar (nome/dose/hora) │
│ 🌡 Intercorrência  [ + febre/queda/... ]   │  ← dispara alerta ao pai
│ 📝 Observações  [__________________]       │
│                        [ Salvar agenda ]   │
└─────────────────────────────────────────┘
```
Objetivo: preencher em < 2 min. Valores pré-definidos, campos livres só quando necessário. Faixa de cuidado (alergia/medicação) fixa no topo.

### T-05 · Agenda do dia (responsável)
```
┌─────────────────────────────────────────┐
│  Ana Clara · Terça, 16 jul       [histórico]│
├─────────────────────────────────────────┤
│ 🍽 Comeu bem no almoço, recusou o lanche   │
│ 😴 Dormiu 12:30–14:00                       │
│ 🎨 Pintura e música                         │
│ 🙂 Humor: tranquila                         │
│ ⚠ 10h: leve febre (37,8°). Medicada 💊     │  ← destaque
│ 📝 "Dia ótimo, participou de tudo."         │
│           — registrado por Prof. Alice      │
└─────────────────────────────────────────┘
```

### T-07/T-08 · Financeiro do responsável + PIX
```
Meses 2026            2026 ▾
Jan ✅  Fev ✅  Mar ✅  Abr ✅  Mai ✅
Jun ⚠ atrasado R$ 890   [Pagar via PIX]
Jul ⏳ em aberto R$ 890  [Pagar via PIX]
   ──────────────────────────
   [ QR Code ]   copia-e-cola: 000201...
   Status: aguardando pagamento…  → ✅ Pago
```

### T-02 · Simulador
```
Quanto ficaria?  (sem compromisso)
Período:  [ 1 ][ 3 ][ 6 ][ 12 ] meses     ← ou dias
Plano:    (•) Integral  ( ) Meio período
────────────────────────────────────────
  Por mês:      R$ 890
  Total (6m):   R$ 5.340   💧 economia no plano semestral
  [ Barras comparando 1 / 3 / 6 / 12 meses ]
        [ Agende uma visita ]
```

### T-13 · Dashboard admin
```
Entradas do mês  R$ 42.300 ▲   Despesas R$ 18.900
Inadimplentes: 4  ·  Crianças ativas: 58  ·  Turmas: 6
[ gráfico entradas x despesas (12 meses) ]
Atalhos: [Crianças] [Turmas] [Professores] [Usuários] [Relatórios]
```

---

## 7. Estados e microcopy
- **Empty states** acolhedores ("Nenhuma anotação ainda hoje — que tal começar pelo café da manhã?").
- **Confirmações** para ações sensíveis (remover usuário/criança).
- **Loading/otimista** no salvar da agenda (o professor não espera).
- **Erros** claros e orientados à ação, sem códigos técnicos ao usuário final.

---

## 8. Acessibilidade
- Contraste AA; foco visível; navegação por teclado no admin.
- Alvos de toque ≥ 44px (mobile).
- Ícones sempre com rótulo textual.
- Alertas de saúde não dependem só de cor (ícone + texto).

---

## 9. Entregáveis de design (próximos passos)
1. Protótipo navegável (Figma) das telas MVP.
2. Biblioteca de componentes com tokens.
3. Testes de usabilidade rápidos com 1 professor e 2 pais.
