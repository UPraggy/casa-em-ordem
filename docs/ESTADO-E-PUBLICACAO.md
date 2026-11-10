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
2. **A mudança mais perceptível é exclusiva de celular.** A barra inferior e vários ajustes de toque só entram em telas de até 720 px. Em desktop, a navegação continua na lateral.
3. **Os dados são locais por navegador.** A publicação do código não apaga nem substitui automaticamente um estado já salvo em `localStorage`. Quantidades e gastos antigos podem continuar aparecendo no mesmo aparelho; um navegador novo começa com o catálogo de estoque zero.
4. **Há interações com comportamento incompleto.** O total da lista inclui itens desmarcados; `+`/`−` altera estoque; quantidade positiva abaixo do mínimo não aparece na lista. O botão de grupos personalizados ainda não cria grupos. Esses pontos podem fazer a tela parecer pouco interativa ou diferente do esperado.
5. **Preços e datas ainda não são dinâmicos.** Valores são referências em código e a data-base de validade está fixa em 09 nov 2026. A tela não acompanha corretamente a passagem dos dias.

## Como comparar a versão publicada

- Abra o domínio em uma janela privada para observar o estado inicial sem os dados locais do navegador habitual.
- Abra em um celular, ou reduza a janela para no máximo 720 px, para ver a navegação inferior.
- Compare os arquivos `app.js` e `mobile.css` do domínio com os arquivos da branch `main`; no diagnóstico acima, os conteúdos publicados correspondiam à versão atual.

Uma janela privada serve apenas para visualizar o estado inicial daquele contexto; os dados nela podem desaparecer quando a janela for fechada.

## Limite desta atualização

Esta entrega atualiza **somente documentação**. Portanto, o commit documental pode gerar um novo deploy do GitHub Pages, mas não altera cores, componentes, imagens ou interações do site. Para uma mudança visível, será necessária uma alteração de implementação separada.
