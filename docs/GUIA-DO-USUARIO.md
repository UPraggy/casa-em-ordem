# Guia do Casa em Ordem

Este guia descreve o comportamento que está implementado hoje. A interface pode ser usada em computador e celular; no celular a navegação fica fixa no rodapé quando a largura é de até 720 px.

## Começar

1. Abra [casa.rafaelmr.com.br](https://casa.rafaelmr.com.br/) ou sirva a pasta local com `python -m http.server 4173`.
2. Use a navegação para alternar entre Visão geral, Lista de compras, Estoque, Orçamento, Minha casa e Primeiros socorros.
3. Num navegador sem dados anteriores, os 41 produtos do catálogo começam com estoque zero. O orçamento inicial é R$ 1.500,00.

O aplicativo guarda o estado no próprio navegador. Uma publicação não substitui automaticamente o que já está salvo na chave `casa-em-ordem`; por isso quantidades, gastos e checklist podem diferir entre aparelhos ou de um navegador para outro.

## Lista de compras

- A lista mostra produtos cuja quantidade atual é exatamente zero.
- A busca filtra os nomes e os botões de grupo filtram Sacola, Supermercado ou Açougue. “Todos” inclui os demais grupos.
- Toque/clique na linha para marcar ou desmarcar o item. A caixa também pode ser marcada diretamente.
- “Adicionar” abre o formulário para criar um produto.
- “Compartilhar” usa o menu de compartilhamento do aparelho ou copia o texto da lista para a área de transferência.
- “Exportar lista” baixa `lista-de-compras.csv`, com grupo, item, quantidade mínima e preço.
- “Concluir compra” exige ao menos um item marcado; então coloca a quantidade mínima no estoque e cria um lançamento agregado de gasto.

**Atenção aos cálculos atuais:** o valor estimado soma todos os produtos listados, não apenas os marcados. O contador chamado “itens selecionados” também reflete todos os itens exibidos. Os botões `+` e `−` mudam a quantidade em estoque, e não uma quantidade separada para comprar. Um produto com estoque positivo, mesmo abaixo do mínimo, aparece no alerta de estoque baixo, mas não entra na lista automaticamente.

## Estoque e produtos

“Novo item” permite preencher nome, grupo, preço unitário, quantidade, estoque mínimo, validade opcional e foto. A busca aceita nome, grupo e data mostrada. Os filtros exibem todos os itens, estoque baixo ou validade próxima. Cada cartão permite editar ou excluir o registro.

O indicador de estoque baixo considera quantidade menor ou igual ao mínimo, inclusive quantidade zero. Os alertas de validade consideram datas até 30 dias à frente; atualmente a contagem usa uma data-base fixa e também inclui datas já vencidas. Consulte as limitações de data abaixo antes de confiar no aviso.

As fotos enviadas ficam no armazenamento local do navegador. Não são carregadas para um servidor nem compartilhadas automaticamente com outros usuários.

## Orçamento e gastos

O orçamento inicial é R$ 1.500,00 e pode ser alterado pelo botão “Ajustar orçamento”. “Lançar gasto” registra nome e valor usando caixas de diálogo do navegador. A tela mostra totais por categoria e lançamentos armazenados localmente.

Ao concluir uma compra, o sistema cria um lançamento agregado chamado “Compra da casa”, atribuído à categoria Supermercado. A data exibida nos lançamentos e no cabeçalho da lista está fixa em 09 nov 2026; não acompanha automaticamente o dia atual.

## Minha casa e grupos

A tela lista grupos predefinidos: Sacola, Supermercado, Açougue e Primeiros socorros. O formulário de produto também oferece Limpeza e Outro. O botão “Novo grupo” ainda só mostra uma mensagem; não cria um grupo personalizado nem adiciona opções ao formulário.

## Primeiros socorros

O checklist inicial contém curativos, gaze estéril, antisséptico, termômetro, soro fisiológico, luvas descartáveis, tesoura sem ponta, analgésico e compressa fria. É possível marcar os itens e adicionar um item personalizado. A tela informa que é uma lista de organização doméstica, não orientação médica; em emergências, procure atendimento profissional.

## Imagens do catálogo

As seis imagens em `assets/` são pranchas compostas. O app mostra recortes dessas pranchas para alguns produtos; os outros usam emoji até que uma foto seja anexada. Assim, não há uma fotografia individual específica para cada item de supermercado, alimento ou primeiros socorros.

## Preços de referência

Os valores iniciais são referências estáticas sem atualização de loja, região ou data. Para nomes presentes no objeto `marketPrices` em `app.js`, o valor da lista é aplicado outra vez quando o app carrega. Isso pode desfazer uma edição manual de preço para esses produtos.

## Dados locais e compartilhamento

- Chave local: `casa-em-ordem`.
- O navegador mantém produtos, fotos, orçamento, gastos e checklist.
- Não há login, sincronização, banco de dados, exportação integral ou restauração de backup.
- Compartilhar transmite apenas texto da lista de compras; não compartilha o estado completo da casa.
- Fotos grandes podem consumir a cota do `localStorage` e impedir novos salvamentos.

## Recursos ainda não implementados

- Grupos personalizados funcionais.
- Quantidade de compra independente do estoque.
- Total calculado apenas sobre itens marcados.
- Notificações fora da página (push ou notificações do sistema).
- Datas e histórico financeiro dinâmicos.
- Pesquisa de preços atualizada automaticamente.
- Sincronização entre pessoas/dispositivos e integração de IA/OpenRouter.
