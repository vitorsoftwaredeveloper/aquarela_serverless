# Aquarela Kids — Front End

> Arquitetura do cliente web. Versão 0.1 — 16/07/2026

---

## 1. Stack

| Item | Escolha |
|---|---|
| Framework | Next.js 16.2 (App Router) |
| UI | React 19.2 |
| Linguagem | TypeScript 5 |
| Estilo | CSS Modules (`*.module.css` co-locado) + tema via `ThemeContext` |
| Autenticação | `aws-amplify` v6 (Cognito) |
| HTTP | `axios` + `axios-retry` |
| Formulários | `react-hook-form` + `yup` (`@hookform/resolvers`) |
| Ícones | `lucide-react` |
| PIX / QR | `qrcode.react` |
| Planilhas | `xlsx` (SheetJS) — exportação de relatórios |
| Estado global | Context API |
| Persistência local | `localStorage` (`@/storage/localStorage`) |

---

## 2. Estrutura de pastas (App Router)

```
src/
├─ app/
│  ├─ (public)/
│  │  ├─ page.tsx                 # landing
│  │  ├─ simulador/page.tsx
│  │  └─ login/page.tsx
│  ├─ (responsavel)/
│  │  ├─ layout.tsx               # guard: role=responsavel
│  │  ├─ inicio/page.tsx          # lista de filhos
│  │  ├─ agenda/[criancaId]/page.tsx
│  │  ├─ historico/[criancaId]/page.tsx
│  │  └─ financeiro/page.tsx
│  ├─ (professor)/
│  │  ├─ layout.tsx               # guard: role=professor
│  │  ├─ turmas/page.tsx
│  │  ├─ turmas/[turmaId]/page.tsx
│  │  ├─ agenda/[criancaId]/page.tsx
│  │  └─ planos-aula/page.tsx
│  ├─ (admin)/
│  │  ├─ layout.tsx               # guard: role=admin
│  │  ├─ dashboard/page.tsx
│  │  ├─ criancas/…               # lista + [id] + nova
│  │  ├─ turmas/… professores/… usuarios/…
│  │  └─ financeiro/…             # balanço, despesas, relatórios
│  └─ layout.tsx                  # providers globais
├─ components/                    # design system (Button, Input, Card, QRCode…)
├─ features/                      # componentes por domínio (agenda, financeiro…)
├─ contexts/                      # Auth, Theme, Dashboard, Charge, Birthday, Topbar, Coach
├─ services/                      # api.ts (axios), criancas.ts, agenda.ts, financeiro.ts…
├─ hooks/                         # useAuth, useCriancas, useAgenda…
├─ schemas/                       # yup schemas
├─ storage/localStorage.ts
├─ types/                         # tipos de domínio
└─ styles/                        # tokens.css, globals.css
```

> Grupos de rota `(responsavel)`, `(professor)`, `(admin)` isolam layouts e guardas por papel.

---

## 3. Autenticação (Cognito via Amplify v6)

- `AuthContext` encapsula `signIn`, `signOut`, `getCurrentUser`, sessão e o `role` do usuário (claim/grupo do Cognito).
- Cada `layout.tsx` de grupo verifica o papel e redireciona para `/login` ou para a home do papel correto.
- O token JWT do Cognito é anexado automaticamente às requisições (ver interceptor abaixo).

```ts
// services/api.ts
import axios from "axios";
import axiosRetry from "axios-retry";
import { fetchAuthSession } from "aws-amplify/auth";

export const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });
axiosRetry(api, { retries: 2, retryDelay: axiosRetry.exponentialDelay });

api.interceptors.request.use(async (config) => {
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

---

## 4. Camada de estado (Context API)

| Context | Responsabilidade |
|---|---|
| `AuthContext` | usuário, papel, sessão Cognito |
| `ThemeContext` | tema claro/escuro, tokens |
| `DashboardContext` | dados agregados do admin (entradas, despesas, KPIs) |
| `ChargeContext` | cobranças/mensalidades e status de pagamento PIX |
| `TopbarContext` | título/ações da barra superior por página |
| `BirthdayContext` | aniversariantes do dia (widget lúdico) |
| `CoachContext` | dicas/onboarding contextual |

Regra: Context para estado compartilhado entre telas; estado local (`useState`) para o que é da própria tela. Dados de servidor passam por `services/*` e são cacheados no context quando fizer sentido.

---

## 5. Formulários e validação

- `react-hook-form` para todos os formulários (cadastro de criança, turma, professor, usuário; registro de agenda).
- `yup` + `@hookform/resolvers` para schemas — reaproveitar validações de CPF, e-mail, campos obrigatórios.
- Formulários longos (cadastro de criança) em **stepper** (identificação → responsáveis → saúde/cuidados → financeiro).

```ts
// schemas/crianca.ts
import * as yup from "yup";
export const criancaSchema = yup.object({
  nome: yup.string().required(),
  dataNascimento: yup.date().required(),
  cpf: yup.string().length(11).required(),
  responsaveis: yup.array().min(1).required(),
  restricoesAlimentares: yup.string().optional(),
  medicacoes: yup.array().optional(),
});
```

---

## 6. Telas técnicas por domínio

- **Agenda diária (professor):** formulário otimista — salva rápido, chips para valores comuns, faixa fixa de alergias/medicações vinda do cadastro da criança.
- **Portal do pai:** somente leitura da agenda + histórico paginado por data. **Exceção:** o responsável edita o cadastro do próprio filho em `/crianca/{id}/editar` (`EditarCriancaScreen`) — nome, nascimento, responsáveis, saúde e foto. Sem `financeiro`, `turma` e `cpf`: o backend responde `403`/rejeita o `PUT`, e a tela nem oferece os campos (faixa explicativa apontando a secretaria). **E-mail de responsável com `usuarioId` é `readOnly`** — o `PUT` não propaga para o Cognito nem para `usuarios`, então editar ali só criaria divergência entre o e-mail exibido e o de login (ver aviso em docs/03-Backend §5).
- **Foto da criança:** `components/FotoField` (admin no passo "Identificação" do stepper, responsável na tela de edição). O upload vai em **base64 no corpo** do `POST`/`PUT /criancas` e o front **sempre** redimensiona antes (`utils/imagem.ts` — 800px de lado maior, JPEG 0.8, teto de 2MB decodificados; a API corta em `422` acima disso). O preview é **controlado pelo pai** (`previewUrl`), para que um salvamento bem-sucedido volte a exibir a imagem gravada em vez do rascunho local. Exibição via `components/Avatar` (foto com fallback de iniciais + cor).
- **Financeiro (pai):** grade de meses (`ChargeContext`); botão "Pagar via PIX" abre modal com `qrcode.react` (QR) e copia-e-cola; faz polling do status até "pago".
- **Etapa financeiro do cadastro de criança (`CriancaStepper.tsx`):** toggle **Plano fixo** × **Valor personalizado**. "Plano fixo" mantém o seletor de `GET /config/precos/planos` (preenche `valorMensalidade` a partir do plano e manda `financeiro.planoId` junto). "Valor personalizado" troca o seletor por um campo numérico livre (acordo fechado com os responsáveis, fora dos planos) e **omite `planoId`** do payload — o backend nunca recalcula `valorMensalidade` a partir de plano (`docs/03-Backend.md` §5), então o valor enviado é o que fica gravado, e os dois nunca são mandados como se fossem consistentes entre si.
- **Financeiro (admin) — pagamento manual em dinheiro:** ícone de carteira na lista de crianças (`CriancasScreen.tsx`) abre `FinanceiroCriancaModal.tsx` com a grade de meses da criança (mesma rota `GET /mensalidades?criancaId=&ano=` do portal do pai). Clicar num mês `aberto`/`atrasado` troca o modal para um formulário de valor recebido; confirmar chama `POST /pagamentos/manual` (`docs/03-Backend.md` §7.1) e a mensalidade passa a aparecer `pago`, igual a uma paga por PIX.
- **Simulador:** cálculo no cliente a partir dos valores configurados; gráfico de barras comparando períodos.
- **Remover turma (`turmas/[turmaId]/page.tsx`):** `DELETE /turmas/{id}` apaga em cascata **avisos** e **planos de aula** (`planos-aula/page.tsx`) daquela turma — hard delete, sem confirmação extra do backend. O front deve avisar o admin disso antes de confirmar a remoção, e invalidar/recarregar a listagem de planos de aula em cache após o `DELETE` (`docs/03-Backend.md` §5).
- **Relatórios (admin):** exportação `.xlsx` com `xlsx` (SheetJS) a partir dos dados do `DashboardContext`.
- **Redefinir senha (admin):** ícone `KeyRound` na lista de usuários (`UsuariosScreen.tsx`, ao lado de Editar/Remover) abre `RedefinirSenhaForm` — o admin digita e confirma a nova senha (`schemas/usuario.ts` → `redefinirSenhaSchema`, mín. 8 caracteres) e o front chama `UsuariosService.redefinirSenha` (`PUT /usuarios/{id}/senha`, `docs/03-Backend.md` §5). Sucesso fecha o form e abre `SenhaRedefinidaModal` — mesmo padrão copia-e-cola do `CredencialModal` do cadastro (e-mail + senha em destaque, botão "Copiar tudo"), avisando que ela só aparece nessa hora. Assim como no cadastro, o usuário é obrigado a trocá-la no próximo login — o front não coleta a senha atual nem oferece esse fluxo para o próprio usuário se autoatender.

---

## 6.1 Telas e regras do lote de 01/08/2026 (Épicos J–N)

Contrato completo em [`docs/03-Backend.md`](./03-Backend.md); tarefas e AC em
[`docs/06-Backlog.md`](./06-Backlog.md).

### Upload de anexo — novo padrão, coexistindo com o base64

O front passa a ter **dois** caminhos de upload, e escolher errado quebra:

| Caso | Mecanismo | Teto |
|---|---|---|
| Foto de **criança** e de **professor** | base64 no corpo do `POST`/`PUT` (`utils/imagem.ts`) — **sem mudança** | 2MB decodificados |
| Anexo de **recado**, **agenda** e **mural** | `POST /anexos/upload-url` → `PUT` direto no S3 | 10MB por arquivo |

Componente novo `components/UploadAnexo`:

1. Pede `POST /anexos/upload-url` com `{ escopo, nome, contentType, tamanho }`.
2. `PUT` direto na `uploadUrl` com **barra de progresso** (`XMLHttpRequest`/
   `fetch` com `ReadableStream` — `axios` com `onUploadProgress` também serve;
   **não** usar a instância `api`, que injeta o `Authorization` do Cognito e
   invalida a assinatura do S3).
3. Só depois manda a `key` no `POST /mensagens` / `PUT /agenda/{id}` /
   `POST /eventos/{id}/fotos`.

Regras:

- **Imagem passa por `utils/imagem.ts` antes do PUT** (mesmo resize da foto de
  criança). PDF sobe cru.
- `Content-Type` do `PUT` tem que ser **exatamente** o `contentType` declarado —
  a assinatura fixa o header; qualquer divergência devolve 403 do próprio S3.
- Falha de rede é retentável **sem perder o texto já digitado** — o upload é uma
  etapa separada do envio da mensagem, não um submit único.
- Anexo já vinculado é lido por `url` presigned de 1h que vem na resposta da API.
  **Não cachear essa URL em `localStorage`** — expira e não é PII que deva
  persistir.

### Recados (Épico K)

- **Responsável** — `/crianca/[criancaId]/recados`: thread desc paginada por
  cursor (`antesDe`), campo de texto + `UploadAnexo`, badge de não lidas na
  entrada da tela da criança e no bottom-tab.
- **Professor** — `/professor/turmas/[turmaId]/recados`: lista por aluno com
  contador de não lidas; abrir a thread chama `POST /mensagens/{id}/lida`.
  `AlunosScreen` ganha o contador por aluno (`GET /mensagens/nao-lidas`).
- Admin **não envia** recado — só lê, para suporte.
- O push do recado é **genérico** ("Novo recado sobre a Sofia"). O texto da
  mensagem nunca aparece na notificação; o `onMessage` em primeiro plano
  (NOT-14) segue a mesma regra no toast.

### Mural de fotos (Épico M)

- **Professor** — `/professor/turmas/[turmaId]/mural`: criar evento, seleção
  múltipla de fotos com resize + progresso, reordenar, legenda, alternar
  rascunho × publicado. **Aviso fixo no topo com os nomes das crianças da turma
  sem `consentimentoImagem`** — é o controle real de quem não pode aparecer;
  a marcação por foto (`criancasIds`) é opcional e serve de reforço.
- **Responsável** — `/mural`: grid por evento/data, lightbox navegável por
  teclado, download da foto original. Só vê `publicado: true`.
- **Consentimento de imagem** é um checkbox **separado** do consentimento LGPD
  no `CriancaStepper` (admin) e **revogável** pelo responsável em
  `EditarCriancaScreen` — ao contrário do `consentimentoLgpd`, que só aparece na
  criação e é imutável. Não confundir os dois na UI.

### Agenda diária v2 (Épico L)

- **Tarefa de casa:** 3 chips (`feito` / `não feito` / `incompleto`) + observação
  opcional. Leitura do responsável com **ícone + texto**, nunca só cor.
- **Presença:** seletor `presente` / `falta` / `atrasado`. `atrasado` **exige**
  hora de chegada (o backend valida com `if/then` no ajv). `falta` **colapsa** os
  blocos de alimentação/sono/atividade — não faz sentido preencher.
- **Anexos na agenda:** professor anexa via `UploadAnexo`, responsável baixa na
  tela de agenda e no histórico. Máx. 5 por dia.
- ⚠️ **`PUT /agenda/{id}` não é patch parcial** (regra já vigente, agora com mais
  campos em jogo): campo omitido no corpo é lido como **esvaziado**. O formulário
  continua mandando o **estado completo** a cada `Salvar` — incluindo
  `tarefaCasa`, `presenca` e `anexos`.
- ⚠️ **`409 AGENDA_JA_ENVIADA` deixou de existir.** `RegistrarAgendaScreen`
  continua chamando `POST /agenda/{id}/enviar` automaticamente depois de salvar,
  mas agora **toda edição renotifica** o responsável ("agenda atualizada"). O
  branch que tratava `409` pode ser **removido**. A resposta traz
  `{ notificado, motivo? }` — `motivo: "DEBOUNCE"` significa salvamento dentro da
  janela de 10 min, e a tela deve mostrar "salvo" sem prometer que notificou.

### Cobrança e inadimplência (Épico J)

- **Responsável:** badge/faixa de pendência no bottom-tab e na Início — quem não
  recebe push (iPhone sem PWA instalado) precisa ver a cobrança ao abrir o app.
  O push de cobrança leva `dados.tipo = "cobranca"` e deve abrir `/financeiro`.
- **Admin:** botão "Disparar cobranças agora" na tela de financeiro, com
  **prévia via `dryRun: true`** antes de confirmar — mostra quem seria notificado
  e **quantos estão sem token válido** (o buraco de cobertura do canal push).
- **"Inadimplente" ≠ "atrasado" na UI.** Mês vencido e não pago continua vermelho
  na grade do responsável; "Inadimplente" é o estado **depois da carência**
  (`inadimplenteDesde`) e é o que alimenta o KPI do dashboard e o badge na lista
  de crianças. Usar rótulos diferentes — tratar os dois como a mesma coisa foi
  exatamente o que motivou a mudança.
- Configuração do corte (`diaCorte`, `mesesCarencia`) entra na tela de
  configuração de preços (`ConfigSimuladorScreen`).

### Dashboard — regime de caixa (OPS-02)

O card "Entradas do mês" e o gráfico de 12 meses passam a somar **pagamentos por
data de pagamento**, não mensalidades por competência. Um pagamento feito em
31/07 de uma mensalidade de agosto passa a aparecer em **julho** — que é o que o
admin esperava ver.

- Rotular explicitamente: **"Entradas (regime de caixa — data do pagamento)"**
  no card e no tooltip do gráfico. Sem o rótulo, o número parece divergir da
  grade de competências que o responsável vê em `/financeiro` — que continua por
  competência, de propósito.
- Nada muda em `BalancoChart.tsx` além do rótulo: a forma da resposta de
  `GET /financeiro/balanco` é a mesma.

### Múltiplos professores por turma (OPS-03)

- O formulário de turma vive dentro de `features/admin/turmas/TurmasScreen.tsx`
  (não há `TurmaForm` separado): o `Select` de professora vira **multi-select**
  (mínimo 1).
- `TurmasScreen` e `AlunosScreen` listam os professores da turma (plural).
- `GET /turmas` devolve `professores: [...]` **e** mantém `professor`
  (= `professores[0]`) por um release — migrar o front para `professores` e não
  criar código novo em cima do campo deprecado.
- A mesma turma agora pode aparecer em "Minhas turmas" de mais de um professor.

### Ficha de cadastro para impressão (OPS-04)

- Rota `/admin/criancas/[id]/ficha`, botão "Imprimir ficha" na lista e no detalhe.
- **Sem endpoint novo** (`GET /criancas/{id}` já traz tudo) e **sem lib de PDF** —
  impressão nativa do browser (`window.print()`), que já oferece "Salvar como
  PDF". Evita mais uma dependência e mais um caminho de código.
- CSS: `@page { size: A4; margin: 12mm }` + `@media print` escondendo nav,
  bottom-tabs, botões e o próprio botão de imprimir.
- Conteúdo: foto, identificação, responsáveis **com destaque de quem tem
  `podeRetirar`**, saúde completa, turma, financeiro, consentimentos, rodapé com
  data de emissão + aviso de documento confidencial (LGPD).

### Responsável não adiciona nem autoriza retirada (✅ OPS-01)

Em `EditarCriancaScreen` (responsável) o toggle "Pode retirar a criança" fica
`disabled` (checkbox não respeita `readOnly` em nenhum browser), com faixa
explicativa ("Só a secretaria autoriza quem pode retirar a criança"). O botão
"Adicionar responsável" **não existe** nessa tela — responsável não inclui
gente nova na lista, só edita nome/telefone/CPF de quem já está lá; no lugar
do botão, uma nota fixa explica que é a secretaria quem adiciona. Também não
pode remover uma entrada que já tem `podeRetirar: true`. No admin
(`CriancaStepper`) segue tudo editável e livre.

> O bloqueio no front é **UX**: o backend responde
> `403 PODE_RETIRAR_EXCLUSIVO_ADMIN` de qualquer jeito, e é ele que vale.

### Aniversário (OPS-05)

⚠️ `BirthdayContext` está listado em §4 como contexto planejado, mas **não existe
em `src/contexts/`** (só `Auth`, `Notifications`, `Responsavel`, `Theme`). Nesta
escala não vale criar um contexto só para isso: o card de aniversariante lê
direto do `GET /criancas` já carregado na Início do responsável e na lista de
alunos do professor. O push é disparado por cron no backend (08:00 GMT-3); o
front só exibe.

---

## 7. Pagamento PIX no cliente

```tsx
import { QRCodeSVG } from "qrcode.react";
// 1) POST /pagamentos → retorna { pixCopiaECola, txid }
// 2) exibe <QRCodeSVG value={pixCopiaECola} /> + botão copiar
// 3) polling GET /pagamentos/:txid até status === "pago" (ou push/webhook no futuro)
```

---

## 8. Padrões e qualidade
- **Componentização:** design system em `components/`, domínios em `features/`.
- **Tipagem forte:** `types/` compartilha contratos com o back (idealmente gerados do schema da API).
- **Acessibilidade:** rótulos, foco, contraste (ver doc de Design).
- **Env vars:** `NEXT_PUBLIC_API_URL`, IDs do Cognito (User Pool, Client) — sem segredos no cliente.
- **Testes:** React Testing Library para componentes críticos (agenda, pagamento).

---

## 9. Pontos de atenção
- App Router: preferir **Server Components** para páginas de leitura e **Client Components** onde há estado/formulário (`"use client"`).
- Sessão Cognito: renovar token expirado antes de chamadas (o `fetchAuthSession` já cuida do refresh).
- `localStorage` apenas para preferências/rascunhos — nunca dados sensíveis de saúde.
