# Guia de Design Unificado

Este guia consolida cores, bordas, sombras, tipografia, espaçamentos, organização de layout, componentes (cards, gráficos, tabelas, botões), responsividade e animações, tomando como referência os arquivos indicados:

- `Appteste.css`
- `indexteste.css`
- `ThemeToggleteste.jsx`
- `PageHeaderteste.jsx`
- `tailwind.configteste.js`
- `Monitoramento.jsx`
- `Home.jsx`
- `dash.jsx`

Objetivo: padronizar o visual e a ergonomia sem alterar funcionalidades existentes.

---

## Princípios

1. Consistência de cores e estados (claro/escuro).
2. Cards com bordas arredondadas, sombras suaves e hover sutil.
3. Layout com container centralizado e espaçamento vertical uniforme.
4. Tipografia legível (Inter/Poppins) com hierarquia clara.
5. Controles (inputs, selects, botões) com foco e feedback visual.
6. Tabelas com separação e realce de linha em hover.
7. Animações leves (fade/slide) para entrada de conteúdo.
8. Responsividade progressiva com pontos de corte práticos.

---

## Cores

Referências principais:

- `tailwind.configteste.js` (tokens):
  - Claro:
    - `light-primary: #0c6909ff`
    - `light-secondary: #64748b`
    - `light-accent: #0f172a`
    - `light-bg: #f8fafc`
    - `light-card: #ffffff`
    - `light-border: #e2e8f0`
    - `light-text: #1e293b`
  - Escuro:
    - `dark-primary: #24cc07ff`
    - `dark-bg: #0F0F0F`
    - `dark-card: #1e293b`
    - `dark-border: #334155`
    - `dark-text: #f8fafc`

- `Appteste.css` (verde corporativo e gradientes):
  - Verde principal: `#218838` com hover `#1b5e20`
  - Laranja: `#ff9800`
  - Vermelho: `#e53935`
  - Azul: `#1976d2`

Diretriz: Preferir tokens do Tailwind para tema e usar cores fixas do `Appteste.css` para componentes legados (badges, botões clássicos). Em modo escuro, condicionar por `isDarkMode` ou classe `dark`.

---

## Tipografia

- Fontes: `Inter` e `Poppins` (`indexteste.css`).
- Tamanhos comuns:
  - Títulos: 20–24px.
  - Subtítulos: 14–16px.
  - Corpo: 13–15px.
- Cor do texto:
  - Claro: `light-text`.
  - Escuro: `dark-text`.

Exemplo:

```jsx
<h1 className="text-xl sm:text-2xl font-bold leading-tight">Título</h1>
<p className="text-sm text-light-text dark:text-dark-text">Descrição</p>
```

---

## Containers e Espaçamento

- Container centralizado:
  - Largura: `max-width: 1200px` (ou 1400px em páginas com muitos cards/gráficos).
  - Padding vertical: `24px`.
  - Espaçamento vertical interno: `space-y-6`.

Exemplos:

```jsx
<div className="dashboard-container max-w-[1400px] mx-auto py-6 space-y-6">
  {/* cabeçalho, filtros, cards */}
</div>
```

---

## Cards

- Visual (`Appteste.css`):
  - Fundo claro: `#fff` (ou `light-card`).
  - Borda: `1px solid #e9ecef` (ou `light-border`).
  - Raio: `16px`.
  - Sombra: suave; hover eleva e intensifica.
  - Padding padrão: `p-6` (24px) ou `p-4` em telas menores.

Exemplo (via classe global `card`):

```jsx
<div className="card">
  <h3 className="text-base font-semibold mb-4">Título</h3>
  <div className="grid gap-4">...</div>
</div>
```

Exemplo (condicional tema):

```jsx
<div
  className="card"
  style={{
    background: isDarkMode
      ? 'linear-gradient(135deg, rgba(25,25,25,0.9) 0%, rgba(25,25,25,0.7) 100%)'
      : 'white',
    border: isDarkMode ? '1px solid #0F0F0F' : undefined,
    backdropFilter: isDarkMode ? 'blur(20px)' : 'none'
  }}
>
  ...
</div>
```

---

## Botões

- Base (`Appteste.css`): `.btn` com variantes `.btn-green`, `.btn-orange`, `.btn-red`, `.btn-blue`, `.btn-purple`, `.btn-outline`.
- Hover com gradiente e leve translação.

Exemplo:

```jsx
<button className="btn btn-green">Confirmar</button>
<button className="btn btn-outline">Cancelar</button>
```

---

## Inputs e Selects

- Borda `1–2px` cinza clara; foco destacado em verde.
- Em modo escuro, usar `dark-*` tokens (`tailwind.configteste.js`).

Exemplo:

```jsx
<select
  className={`
    w-full px-3 py-2 rounded-md border text-sm
    ${isDarkMode
      ? 'bg-dark-surface border-dark-border text-dark-text focus:border-dark-primary'
      : 'bg-light-surface border-light-border text-light-text focus:border-light-primary'}
  `}
>
  ...
</select>
```

---

## Tabelas

- `tabela-registros` (`Appteste.css`):
  - Cabeçalho com gradiente claro, borda inferior.
  - Linhas com espaçamento e hover sutil.
  - Células com padding consistente.

Exemplo:

```html
<table class="tabela-registros">
  <thead>
    <tr><th>Coluna</th>...</tr>
  </thead>
  <tbody>
    <tr><td>Valor</td>...</tr>
  </tbody>
  
</table>
```

---

## Gráficos

- Tooltips com fundo translúcido condicionado ao tema (`dash.jsx`).
- Paleta com gradientes (ver `COLORS` e `GRADIENT_COLORS` em `dash.jsx`).
- Animação de entrada: `animationDuration: 800`, `ease-out`.

Exemplo tooltip:

```jsx
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{
        background: isDarkMode ? 'rgba(31,41,55,0.95)' : 'rgba(255,255,255,0.95)',
        border: `1px solid ${isDarkMode ? '#4b5563' : '#e0e0e0'}`,
        borderRadius: 8, padding: 12, backdropFilter: 'blur(10px)'
      }}>
        <p style={{ margin: 0, fontWeight: 600 }}>{label}</p>
        {payload.map((e, i) => (
          <p key={i} style={{ margin: '4px 0 0', color: e.color }}>{e.name}: {e.value}</p>
        ))}
      </div>
    );
  }
  return null;
};
```

---

## Cabeçalhos de Página

- `PageHeaderteste.jsx`: gradiente, ícone em badge translúcido, animação leve.

Exemplo:

```jsx
<PageHeader
  title="Dashboard"
  subtitle="Visão geral dos indicadores logísticos"
  icon={BarChart3}
  className="mb-4"
/>
```

---

## Sombras e Bordas

- Sombras: suaves (`box-shadow` leve) com intensificação no hover.
- Bordas: 1px em containers e cards; radius 12–16px.

Diretriz:

```css
.card {
  border: 1px solid #e9ecef; /* ou var(--light-border) */
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
}
```

---

## Responsividade

- Pontos de corte práticos (`Appteste.css`): 1100px, 768px, 480px.
- Reduzir padding em cards e inputs em telas menores; ajustar larguras de sidebar/topbar.

Diretriz:

```css
@media (max-width: 768px) {
  .card { padding: 10px; }
}
```

---

## Animações e Motion

- Keyframes: `fadeIn`, `slideIn`, `spin`, `pulse` (`Appteste.css`).
- `framer-motion` para cabeçalhos e elementos interativos (`PageHeaderteste.jsx`).

Exemplo motion:

```jsx
<motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
  ...
</motion.div>
```

---

## Modo Escuro

- `ThemeToggleteste.jsx` define alternância via `useTheme()`.
- Condicionar estilos por `isDarkMode` ou pela classe `dark` no HTML.

Diretriz:

```jsx
const { isDarkMode } = useTheme();
const bg = isDarkMode ? 'bg-dark-card' : 'bg-light-card';
```

---

## Padrões de Uso por Página

- `Monitoramento.jsx`:
  - Manter filtros em `card` separado.
  - Tabela com `tabela-registros` e alertas com `alerta-problema`.
  - Botões com variantes `.btn-*`.

- `Home.jsx`:
  - Cards de resumo com espaçamento e grid.
  - Modais com backdrop e borda condicionada ao tema.

- `dash.jsx`:
  - Filtros em `card` com grid responsivo.
  - Gráficos com tooltips e paletas padronizadas.

---

## Exemplos de Padronização

1) Container unificado:

```jsx
<div className="dashboard-container max-w-[1400px] mx-auto py-6 space-y-6">
  <PageHeader ... />
  <div className="card p-6">...</div>
  <div className="card p-6">...</div>
</div>
```

2) Botões de ação:

```jsx
<div className="flex gap-3">
  <button className="btn btn-green">Salvar</button>
  <button className="btn btn-outline">Cancelar</button>
</div>
```

3) Input/Select com tema:

```jsx
<input
  className={`w-full px-3 py-2 rounded-md border text-sm
    ${isDarkMode ? 'bg-dark-surface border-dark-border text-dark-text' : 'bg-light-surface border-light-border text-light-text'}
  `}
  placeholder="Pesquisar"
/>
```

---

## Adoção Gradual (Sem alterar funcionalidades)

1. Garantir que cada página use o container unificado com `space-y-6`.
2. Trocar wrappers visuais para a classe global `card`, respeitando condicionais de tema onde necessário.
3. Unificar botões para variantes `.btn-*` já existentes.
4. Padronizar inputs/selects com as classes condicionadas por `isDarkMode`.
5. Nos gráficos, usar `CustomTooltip` e paletas de `dash.jsx`.
6. Revisar responsividade de grids e paddings com breakpoints do `Appteste.css`.

Observação: todas as mudanças acima são puramente visuais; não alteram lógica, dados ou eventos.

---

## Checklist de Revisão Visual

- Container centralizado e espaçamento vertical consistente.
- Cards com padding `p-6` e hover suave.
- Botões com variantes corretas e feedback em foco/hover.
- Tabelas com cabeçalho destacado e hover de linhas.
- Gráficos com tooltip polido e animação de entrada.
- Tipografia consistente (Inter/Poppins) e cores de texto por tema.
- Responsividade funcional à 1100px / 768px / 480px.
- Motion sutil em headers e entradas de conteúdo.

---

## Observações Finais

Este guia serve como referência prática: ao aplicar, priorize reutilização das classes já existentes (`card`, `btn`, `tabela-registros`, `dashboard-container`) e as cores do `tailwind.configteste.js`, mantendo os condicionais de tema do `useTheme()` nos componentes. A adoção deve ser incremental, validando visualmente após cada ajuste.