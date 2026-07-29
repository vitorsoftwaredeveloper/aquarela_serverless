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
- **Relatórios (admin):** exportação `.xlsx` com `xlsx` (SheetJS) a partir dos dados do `DashboardContext`.

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
