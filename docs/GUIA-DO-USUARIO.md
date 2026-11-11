# Guia do Casa em Ordem

O site está disponível em [casa.rafaelmr.com.br](https://casa.rafaelmr.com.br/). No celular, a barra fixa mostra **Início**, **Compras**, **Estoque**, **Agenda** e **Mais**. Orçamento e Primeiros socorros ficam em **Mais**.

Para testar uma cópia local, rode `python -m http.server 4173` na pasta e abra `http://127.0.0.1:4173`.

## Primeiro uso

- O catálogo vem com 41 produtos em quantidade zero e a lista de compras começa vazia.
- Cada navegador guarda seus próprios dados. Uma atualização do site não apaga os dados já salvos.
- A lista de primeiros socorros começa com nove itens desmarcados.

## Compras

- Use **Adicionar** ou o botão **Comprar** no cartão do estoque. Um item só entra na lista quando você o escolhe.
- Pesquise por nome e use os filtros de grupo. Os botões `+` e `−` alteram a quantidade que pretende comprar; o `×` remove só da lista.
- O total estimado usa preço unitário × quantidade. **Concluir compra** soma os itens marcados ao estoque.
- **Exportar lista** baixa um CSV. **Compartilhar** abre o menu nativo do aparelho quando disponível.

O aviso de estoque baixo continua separado: ele informa o que precisa de reposição, mas não inclui produtos na lista por conta própria.

## Estoque, fotos e validade

Em **Estoque**, busque por produto, grupo ou data e filtre itens baixos ou com validade próxima. Cada cartão permite editar, adicionar/remover da lista ou excluir. Para ajustar os dados, abra **Editar** e altere nome, grupo, foto, preço, quantidade, mínimo ou validade. **Remover foto** apaga a foto anexada sem apagar o produto. Fotos enviadas são reduzidas automaticamente para caber melhor no armazenamento do celular.

A quantidade fica em zero no catálogo inicial; estoque mínimo, preço e validade são valores de referência editáveis. O aviso considera baixo quando a quantidade é menor ou igual ao mínimo. Validade próxima inclui itens vencidos e os que vencem nos próximos 30 dias; confirme a data cadastrada.

## Orçamento recorrente

A tela **Orçamento** é para contas e compromissos que se repetem — por exemplo aluguel, internet, mensalidade escolar ou assinatura. **Adicionar compromisso** permite informar nome, categoria, valor, frequência e próximo vencimento. A previsão mensal converte valores semanais, trimestrais e anuais para uma estimativa mensal.

O limite mensal pode ser alterado em **Ajustar teto mensal**. Cada compromisso pode ser editado ou apagado. Compras e gastos avulsos não entram nessa previsão.

## Organização, calendário e avisos

Na aba **Agenda**, use **Agendar compromisso** para criar eventos de escola, saúde, casa ou planos. É possível anexar ou remover uma foto, incluir detalhes e lista de itens, marcar a tarefa como feita, editar ou apagar. A busca e os filtros ajudam a localizar os compromissos.

Toque em um dia do calendário para ver os próximos compromissos a partir daquela data; use as setas para trocar o mês. Listas vinculadas ao evento aceitam novos itens, marcação e exclusão.

**Ativar avisos** pede permissão ao navegador e verifica lembretes enquanto a página está aberta. Para receber avisos com o site fechado, use **Exportar calendário** e importe o arquivo `.ics` no calendário do celular. O sistema e as permissões desse calendário controlam os avisos em segundo plano.

Os grupos predefinidos aparecem mais abaixo na mesma aba. Use **Novo grupo** para criar uma categoria; ela também fica disponível ao cadastrar ou editar um produto. Toque no cartão do grupo para filtrar o estoque.

## Compartilhar e atualizar em outro aparelho

1. No aparelho com os dados mais recentes, abra **Agenda** e toque em **Compartilhar tudo**.
2. Envie o arquivo pelo menu de compartilhamento ou envie o JSON baixado por mensagem.
3. No outro aparelho, abra o site, acesse **Agenda** e toque em **Importar atualização**.
4. Escolha o arquivo e confirme a substituição. Se houver dados locais, o site baixa um arquivo de backup antes de importar.

O arquivo inclui lista, estoque, fotos, agenda, compromissos recorrentes, limite e checklist. A importação substitui o conjunto local; portanto, use sempre a cópia mais recente. Não há sincronização simultânea ou conta compartilhada nesta versão.

## Primeiros socorros

A lista inclui curativos, gaze estéril, antisséptico, termômetro, soro fisiológico, luvas, tesoura sem ponta, analgésico e compressa fria. As imagens estão associadas aos itens médicos correspondentes. É possível marcar os itens ou adicionar outro. A lista serve para organização doméstica e não substitui orientação profissional; em emergências, procure atendimento adequado.

## Assistente IA (OpenRouter)

O assistente pode propor mudanças na lista, estoque, orçamento recorrente e checklist. Revise a lista de ações e toque em **Aplicar mudanças**; **Descartar** mantém os dados como estavam. O estoque baixo não gera compras automaticamente.

A chave OpenRouter é salva localmente no navegador e não é incluída no arquivo de compartilhamento. O pedido e os campos necessários à resposta são enviados ao OpenRouter; fotos não são enviadas. Disponibilidade do modelo gratuito depende do serviço.

## Imagens e preços

Pranchas fotográficas JPEG otimizadas para produtos comuns ficam na pasta `assets/`; juntas ocupam cerca de 1,5 MB, aproximadamente 90% menos que as versões PNG anteriores. Todos os produtos do catálogo inicial têm um recorte associado; itens cadastrados por você podem receber uma foto própria. Preços iniciais são referências estáticas, não uma cotação em tempo real. Revise os valores para sua loja e região.

## Limites desta versão

- Os dados ficam no aparelho e não sincronizam automaticamente. O arquivo de compartilhamento atualiza os dados por importação manual.
- Notificações do navegador dependem da página estar aberta; o calendário do celular pode fornecer avisos em segundo plano após importar o `.ics`.
- Os grupos iniciais são Sacola, Supermercado, Açougue, Limpeza, Primeiros socorros e Outro; novos grupos podem ser criados na aba Organização.
- Preços de referência não acompanham alterações de mercado automaticamente.
