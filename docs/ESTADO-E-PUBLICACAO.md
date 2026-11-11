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

A interface usa ícones SVG Lucide inline, paleta creme/verde/terracota, barra inferior com cinco destinos e menu “Mais”, rótulos e datas dinâmicos, grupos que abrem o estoque filtrado e progresso de limpeza ligado aos itens cadastrados. A conferência responsiva foi feita em 320, 390, 768 e 1440 px.

## Continuação em 11 de novembro de 2026

- Os botões dos cartões de estoque se ajustam à largura do celular; modais ficam acima da barra inferior e do atalho do assistente.
- As seis pranchas de fotos do catálogo foram convertidas para JPEG otimizado: o total caiu de aproximadamente 13 MB para 1,2 MB, reduzindo a primeira carga em dispositivos móveis.
- Uma prancha fotográfica extra cobre ervas, temperos, frutas sazonais, água de coco e palha de aço; todos os produtos iniciais passam a ter uma imagem correspondente.
- As imagens de primeiros socorros foram mapeadas para o item médico correspondente. Fotos enviadas pelo usuário são reduzidas antes de serem guardadas localmente.
- A organização inclui calendário, compromissos com checklist e lembretes, compartilhamento/importação de cópia JSON e grupos personalizados.
- O orçamento mostra contas e planos recorrentes com equivalência mensal; cada compromisso pode ser editado ou excluído.
- A validação manual em 320 px e 390 px confirmou navegação inferior, cartões sem transbordamento, inclusão de item na lista, ajuste de quantidade, checkbox e recálculo do total.
- Os produtos começam com estoque zero em uma instalação nova. Alterações existentes de preço deixam de ser substituídas automaticamente pelos preços de referência ao reabrir o site.
- Dados continuam no navegador. O compartilhamento da casa atualiza por arquivo, com backup antes da importação; não há sincronização simultânea entre aparelhos.
- Valores são referências estáticas e variam por cidade, loja, unidade e data. Levantamentos oficiais mostram diferenças entre capitais e supermercados; revise os valores cadastrados para sua região. [Conab/Dieese, outubro de 2026](https://www.gov.br/conab/pt-br/assuntos/noticias/tomate-arroz-e-carne-bovina-pressionam-o-custo-da-cesta-basica-em-outubro-e-cafe-e-feijao-ficam-mais-baratos), [Procon de Joinville, novembro de 2026](https://www.joinville.sc.gov.br/noticias/procon-de-joinville-divulga-pesquisas-de-precos-da-cesta-basica-e-churrasco-do-mes-de-novembro/).
- O `node --check` dos três scripts passou; `git diff --check` não apontou erros de patch. O commit `2248a20` chegou ao GitHub e o workflow do Pages terminou com sucesso. O Cloudflare manteve um 404 em cache para o endereço versionado de `planning.js` e uma cópia anterior de `app.js`; os identificadores foram renovados para forçar a busca dos arquivos atuais.
