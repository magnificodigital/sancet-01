# Refactor: fluxos Particular vs Convênio separados na entrada

Objetivo: paciente escolhe TIPO antes de ver catálogo, contexto persiste no header, carrinho de convênio não mostra preço, checkout não pede tipo de novo.

## 1. Store global (`src/stores/sacola.ts`)

Estender o Zustand atual (mantém UM store, como o usuário pediu):

```ts
tipo: 'particular' | 'convenio' | null;
convenio_id, convenio_nome, convenio_codigo_shift: string | null;
plano_codigo, plano_descricao, numero_carteirinha: string | null;
itens: ItemSacola[];

setTipo(tipo)       // se diferente do atual e itens > 0 → caller mostra AlertDialog antes
setConvenio(dados)
limparContexto()    // zera tudo (tipo, convênio, itens)
```

Persistência localStorage (já existe via `persist`). Mantém todas as funções atuais (`adicionar`, `remover`, `total`, `quantidade`).

## 2. Rotas (`src/App.tsx`)

```
/exames                              → SelecaoTipoCompra (novo)
/exames/particular                   → catálogo com preços (Exames atual renomeado)
/exames/convenio/escolher-convenio   → step 0 (selecionar convênio + plano + carteirinha)
/exames/convenio/catalogo            → catálogo sem preços
/vacinas                             → mantém (sem mudança nesse sprint)
/sacola, /enviar-pedido, /pagamento  → guards de tipo
```

## 3. Componentes novos

- `src/pages/SelecaoTipoCompra.tsx` — 2 cards (Particular / Convênio) + texto de aviso
- `src/pages/EscolherConvenio.tsx` — combobox convênio + combobox plano + input carteirinha, alerta amarelo, botão "Continuar"
- `src/pages/ExamesParticular.tsx` — wrapper do catálogo atual + header sticky "💰 Particular [Trocar]"
- `src/pages/ExamesConvenio.tsx` — wrapper do catálogo + header sticky "🛡️ Convênio X — Plano Y | ****1234 [Trocar]"
- `src/components/catalogo/HeaderContexto.tsx` — barra sticky com info + botão trocar (dispara AlertDialog se carrinho tem itens)
- `src/components/catalogo/AlertTrocarTipo.tsx` — AlertDialog reutilizável
- `src/components/catalogo/BreadcrumbCatalogo.tsx` — breadcrumb dinâmico

## 4. Mudanças em componentes existentes

- `ListaExames.tsx`: aceita prop `mostrarPreco` (default true). Se false, esconde preço e exibe badge verde "Coberto pelo convênio (sujeito à autorização)" sob cada card. Ao adicionar item, valida que `tipo` do store está setado.
- `Sacola.tsx`: header mostra contexto (mesmo HeaderContexto). Particular mostra total; convênio mostra badge "Coberto pelo convênio" no lugar do total.
- `CardEscolhaTipo.tsx` (sacola): substituir — agora apenas mostra resumo do tipo já escolhido e botão "Ir para checkout" (vai direto pra /enviar-pedido sem `?tipo=`).
- `EnviarPedido.tsx`: lê `tipo`, `convenio_*`, `numero_carteirinha` do store em vez de `?tipo=`. Sem step de tipo (já existia direto). Guard: tipo null → `/exames`.
- `EtapaConfirmacao.tsx`: quando `tipo === 'convenio'`, pré-popula convênio/plano/carteirinha do store (modo readonly compacto) e só pede UPLOAD da imagem da carteirinha. Esconde combobox de convênio/plano se já vier do store.

## 5. Guards

`useEffect` em cada rota que precisa de tipo:
- `/sacola`, `/enviar-pedido`, `/pagamento` com `tipo == null` → `navigate('/exames')`
- `/exames/convenio/catalogo` com `convenio_id == null` → `navigate('/exames/convenio/escolher-convenio')`

## 6. Header global (`Header.tsx`)

Link "Exames" continua apontando pra `/exames` — agora é a tela de escolha (não muda nada na nav). Idem mobile sheet.

## 7. Trocar tipo — UX

`HeaderContexto` recebe `onTrocar`. Click:
- Se `itens.length === 0` → limparContexto() + navigate
- Se `itens.length > 0` → AlertDialog "Você tem N itens. Trocar de tipo vai esvaziar seu carrinho. Continuar?" → confirm: limparContexto() + navigate

## 8. Voucher / Pagamento / Pronto / RPC

Sem mudanças. Pedido já grava `tipo_solicitacao` e campos de convênio.

## 9. Visual

Mantém vermelho Sancet (`#C8102E`), azul secondary (`#1B3A6B`), shadcn, ícones lucide. Badge verde para "Coberto pelo convênio". Badge amarela para alerta de prazo.

## Arquivos a criar/editar (resumo técnico)

Criar:
- `src/pages/SelecaoTipoCompra.tsx`
- `src/pages/EscolherConvenio.tsx`
- `src/pages/ExamesParticular.tsx`
- `src/pages/ExamesConvenio.tsx`
- `src/components/catalogo/HeaderContexto.tsx`
- `src/components/catalogo/AlertTrocarTipo.tsx`

Editar:
- `src/stores/sacola.ts` (adicionar campos de contexto)
- `src/App.tsx` (rotas)
- `src/pages/Exames.tsx` (vira redirect/wrapper pra SelecaoTipoCompra)
- `src/components/catalogo/ListaExames.tsx` (prop `mostrarPreco`)
- `src/components/sacola/CardEscolhaTipo.tsx` (vira resumo + botão checkout)
- `src/pages/Sacola.tsx` (HeaderContexto + total condicional)
- `src/pages/EnviarPedido.tsx` (lê do store, sem `?tipo=`, guard)
- `src/components/envio/EtapaConfirmacao.tsx` (pre-popula convênio do store)

## Fora de escopo

- Vacinas (mantém fluxo atual — usuário não pediu separação)
- Schema do banco (já está pronto)
- Backend / RPC / edge functions
