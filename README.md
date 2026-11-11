# Casa em Ordem

Aplicação para organizar a casa: lista de compras, estoque e validade, orçamento recorrente, agenda, primeiros socorros e itens domésticos. Interface em português, com barra fixa para celular.

## Abrir e executar

O site publicado está em [casa.rafaelmr.com.br](https://casa.rafaelmr.com.br/). Para rodar localmente:

```bash
python -m http.server 4173
```

Acesse `http://127.0.0.1:4173`.

## Seções

- **Visão geral:** itens escolhidos para comprar, avisos de estoque baixo e validade e total dos compromissos recorrentes frente ao limite mensal.
- **Lista de compras:** só inclui itens escolhidos pela pessoa. Permite busca, quantidades, total estimado, compartilhamento rápido e exportação CSV.
- **Estoque:** quantidade atual, mínimo, validade, preço e foto. Busca, filtros, edição, exclusão e atalho para incluir ou tirar da lista de compras. O catálogo começa com quantidade zero.
- **Orçamento:** compromissos recorrentes por semana, mês, trimestre ou ano, previsão mensal por categoria, limite mensal, lembretes de vencimento e ações para editar ou apagar cada conta. Compras do mês não são contabilizadas como orçamento recorrente.
- **Organização:** calendário, compromissos de escola e casa, planos, busca, categorias, listas vinculadas, fotos e grupos personalizados de produtos. Itens da lista podem ser marcados, incluídos ou apagados.
- **Primeiros socorros:** checklist doméstico com fotos correspondentes aos itens, opção de marcar e adicionar.
- **Compartilhar a casa:** exporta listas, estoque, fotos, agenda, orçamento e checklist para um arquivo JSON que pode ser enviado e importado em outro aparelho.
- **Assistente IA:** conversa em português com propostas revisáveis para compras, estoque, orçamento recorrente e checklist.

O catálogo inicial contém 41 produtos, todos com estoque inicial zero, além de 9 itens na lista de primeiros socorros.

## Dados e compartilhamento

Os dados ficam no `localStorage` do navegador, na chave `casa-em-ordem`. O site não tem login, banco de dados ou sincronização em tempo real. Para atualizar os dados no aparelho da parceira, use **Compartilhar tudo** e envie o arquivo; no outro aparelho, escolha **Importar atualização**. A importação substitui os dados locais após confirmação e baixa um backup local antes da troca quando há conteúdo salvo. Para evitar edições concorrentes, combinem quem compartilha a versão mais recente.

As imagens anexadas são armazenadas localmente e entram na exportação completa. Fotos grandes podem consumir o limite de armazenamento do navegador. As notificações do navegador funcionam enquanto o site está aberto; o arquivo `.ics` exportado pode ser importado no calendário do celular para receber lembretes com o site fechado.

O assistente envia o pedido e apenas os campos necessários à resposta para o OpenRouter. Não envia fotos. A chave da API fica no navegador e não é incluída nos arquivos de compartilhamento. Cada aparelho pode precisar configurar sua própria chave.

## Imagens e preços

Os recortes fotográficos do catálogo estão em `assets/` como JPEGs otimizados para celular, incluindo alimentos, produtos de casa e cuidados de primeiros socorros. Cada produto inicial tem um recorte associado. Fotos enviadas são reduzidas antes de serem guardadas localmente. Os preços iniciais são referências editáveis, não cotações ao vivo; revise-os para sua região e loja.

## Interface móvel

Até 820 px, a barra inferior fixa traz Início, Compras, Estoque, Agenda e Mais. Orçamento e Primeiros socorros ficam no menu Mais. O layout considera a área segura do aparelho e reorganiza cartões e formulários para telas estreitas.

## Publicação

- Repositório: [UPraggy/casa-em-ordem](https://github.com/UPraggy/casa-em-ordem)
- Branch publicada: `main`, diretório raiz.
- Domínio: `casa.rafaelmr.com.br`, configurado pelo arquivo `CNAME`.
- `.nojekyll` evita o processamento Jekyll pelo GitHub Pages.

O diagnóstico anterior de publicação está em [docs/ESTADO-E-PUBLICACAO.md](docs/ESTADO-E-PUBLICACAO.md). O passo a passo de uso está em [docs/GUIA-DO-USUARIO.md](docs/GUIA-DO-USUARIO.md).

## Estrutura

| Caminho | Conteúdo |
| --- | --- |
| `index.html` | Telas, navegação e formulários |
| `styles.css`, `mobile.css`, `design.css`, `planning.css` | Estilo base, celular, componentes visuais e organização |
| `app.js` | Catálogo, compras, estoque e estado local |
| `planning.js` | Calendário, orçamento recorrente, lembretes e exportação/importação |
| `assistant.js`, `assistant.css` | Assistente OpenRouter e interface |
| `assets/` | Pranchas de imagens do catálogo |
| `CNAME`, `.nojekyll` | Configuração do GitHub Pages |
