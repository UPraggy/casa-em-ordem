# Diagnóstico do Git e da publicação

Verificação feita em **10 de novembro de 2026**.

## Estado confirmado

- Branch local: `main`.
- Branch remota consultada: `origin/main`.
- `HEAD` e `origin/main` apontavam para o mesmo commit: `1723ccfe5305e33bae103816ddeaa3f4232ca6d4` (`fix: corrigir inicializacao do catalogo e interacoes`).
- O worktree estava limpo antes destas alterações de documentação.
- O GitHub Actions registrou o workflow gerenciado `pages build and deployment` para esse commit como **completed / success**, em 10 nov 2026 às 02:25 UTC.
- O domínio `https://casa.rafaelmr.com.br/` respondeu **HTTP 200**.
- `app.js` publicado e `app.js` servido pelo GitHub no branch `main` tinham 19.041 caracteres e os mesmos marcadores do catálogo/edição. `mobile.css` publicado tinha 5.743 caracteres e incluía os estilos da barra inferior.
- `CNAME` contém `casa.rafaelmr.com.br`; `.nojekyll` está na raiz. O usuário informou que a parte do Cloudflare já estava configurada.

## O que deu errado antes

O histórico anterior teve falhas/cancelamentos durante a configuração inicial do GitHub Pages. O Pages ainda não estava habilitado para publicar corretamente; a publicação foi ajustada para usar a branch `main` na raiz e foi incluído `.nojekyll`. Os registros mais recentes mostram que esse caminho foi resolvido: o deploy do commit atual terminou com sucesso e o domínio está servindo a aplicação.

O endpoint público da API do GitHub para consultar as configurações de Pages respondeu 404 nesta verificação; isso não contradiz o deploy confirmado pelos registros de Actions/Deployments nem a resposta 200 do domínio. A leitura da configuração de Pages via API não foi possível de forma pública.

## Por que as mudanças podem não ter parecido uma melhoria

1. **Não era uma reformulação visual ampla.** Os commits recentes focaram em inicialização do catálogo, interações da lista e correções para celular. Em computador, a estrutura e a identidade visual principais continuam parecidas.
2. **A mudança mais perceptível é mobile-first.** A barra inferior agora usa cinco atalhos e “Mais” reúne as outras seções; ela aparece em telas de até 820 px. Em desktop, a navegação continua na lateral.
3. **Os dados são locais por navegador.** A publicação do código não apaga nem substitui automaticamente um estado já salvo em `localStorage`. Quantidades e gastos antigos podem continuar aparecendo no mesmo aparelho; um navegador novo começa com o catálogo de estoque zero.
4. **A lista e o estoque têm funções separadas.** A lista agora contém somente os produtos escolhidos manualmente; alertas de estoque baixo continuam na Visão geral/Estoque e não alteram a lista. Os controles de quantidade ajustam o que será comprado, e concluir a compra atualiza o estoque. O botão de grupos personalizados ainda não cria grupos.
5. **Os preços continuam estáticos.** São referências em código, sem cotação atualizada por loja/região; alertas de validade e datas novas acompanham a data local do aparelho.

## Como comparar a versão publicada

- Abra o domínio em uma janela privada para observar o estado inicial sem os dados locais do navegador habitual.
- Abra em um celular, ou reduza a janela para no máximo 820 px, para ver a navegação inferior.
- Compare os arquivos `app.js` e `mobile.css` do domínio com os arquivos da branch `main`; no diagnóstico acima, os conteúdos publicados correspondiam à versão atual.

Uma janela privada serve apenas para visualizar o estado inicial daquele contexto; os dados nela podem desaparecer quando a janela for fechada.

## Assistente OpenRouter

O assistente está integrado ao site estático por chamada do navegador para a API de Chat Completions do OpenRouter, usando o modelo roteador gratuito `openrouter/free`. A chave é fornecida pelo usuário na interface e guardada no `localStorage` do navegador, nunca no Git. As propostas estruturadas são validadas pelo site e só alteram os dados locais depois de **Aplicar mudanças**. A chamada envia somente os campos pertinentes ao pedido; não envia fotos nem lançamentos financeiros individuais. Cada navegador precisa de sua própria chave; não existe proxy Cloudflare nem chave compartilhada no servidor.

## Reformulação de interface

A interface agora usa ícones SVG Lucide inline, paleta creme/verde/terracota, cartões e foco refinados, barra inferior com cinco destinos e menu “Mais”, rótulos e datas dinâmicos, grupos que abrem o estoque filtrado e progresso de limpeza ligado aos itens cadastrados. A inspeção visual usou o screenshot runner do Taste em 320, 390, 768 e 1440 px. O `check.mjs` do Taste exige um contêiner `.wrap` e interrompeu a segunda largura; por isso a conferência responsiva foi feita pelas capturas reais de cada tamanho.
