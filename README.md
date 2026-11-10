# Casa em Ordem

Aplicação estática para organizar compras, estoque, validade, orçamento e itens essenciais da casa. A interface está em português e adapta a navegação para celular.

## Abrir e executar

O site publicado está em [casa.rafaelmr.com.br](https://casa.rafaelmr.com.br/). Para executar uma cópia local, entre na pasta do projeto e rode:

```bash
python -m http.server 4173
```

Depois acesse `http://127.0.0.1:4173`. Também é possível abrir `index.html` diretamente, mas um servidor local reproduz melhor o comportamento hospedado.

## Seções

- **Visão geral:** resumo da lista escolhida, itens com estoque baixo, validades próximas e gastos registrados.
- **Lista de compras:** somente itens adicionados manualmente, com busca, filtros, quantidades para comprar, total, compartilhamento e exportação CSV.
- **Estoque:** avisos de quantidade abaixo do mínimo, busca, filtros, edição, exclusão e cadastro de foto, preço, quantidade e validade; cada item pode ser adicionado à lista sem alterar o estoque.
- **Orçamento:** limite mensal, lançamentos manuais e totais agrupados por categoria.
- **Minha casa:** visão dos grupos de produtos atualmente definidos.
- **Primeiros socorros:** checklist doméstico inicial, com possibilidade de adicionar itens.
- **Assistente IA:** conversa em português para consultar e propor alterações na lista, estoque, orçamento, gastos e checklist. As alterações aparecem para revisão antes de salvar.

O catálogo inicial contém **41 registros de produtos**, todos com quantidade inicial zero em um navegador sem dados salvos. Há também **9 itens** no checklist inicial de primeiros socorros. Os grupos pré-configurados incluem Sacola, Supermercado, Açougue e Primeiros socorros; o formulário de produto também oferece Limpeza e Outro.

## Dados e privacidade

O estado do aplicativo é salvo no `localStorage` do navegador, na chave `casa-em-ordem`. Não há conta, banco de dados, API de sincronização ou cópia automática entre celulares e computadores. Cada navegador/dispositivo mantém os próprios dados.

O catálogo padrão com quantidade zero só aparece quando não existe estado salvo. Dados antigos do navegador podem continuar preenchendo o app após a publicação de uma versão nova. Fotos enviadas são gravadas como dados locais no navegador; muitas fotos ou arquivos grandes podem atingir o limite de armazenamento do navegador.

O assistente envia o pedido e somente os campos da casa necessários à resposta para o OpenRouter: dados de estoque/lista nos pedidos sobre produtos, preços e totais financeiros quando a pergunta tratar de valores, validade quando solicitada e checklist quando pertinente. Não envia fotos nem nomes individuais dos lançamentos financeiros. A chave da API fica no `localStorage` deste navegador, separada dos dados da casa; cada aparelho/navegador precisa configurar a própria chave. Não coloque a chave no repositório nem use em aparelho compartilhado.

Compartilhar usa o recurso nativo do dispositivo quando disponível e, caso contrário, tenta copiar o texto da lista. A exportação disponível é CSV da lista de compras; não existe exportação/restauração completa do estoque, orçamento e fotos.

## Imagens

As imagens do catálogo estão em `assets/`. São seis pranchas raster usadas como imagens compostas e recortadas visualmente na interface: hortifruti, frutas, itens domésticos, mercearia, carnes e primeiros socorros. O catálogo não tem uma fotografia individual para cada produto. Itens sem imagem cadastrada ou recorte correspondente podem aparecer com emoji. O formulário permite anexar uma foto própria a um item. Os controles da interface usam um sprite inline de ícones SVG Lucide, sem dependência de CDN.

## Preços e validade

Os preços iniciais são valores de referência editáveis, não cotações ao vivo. Há uma lista de preços codificada em `app.js` para alguns produtos; esses valores são reaplicados quando o app inicia, então uma edição de preço desses nomes pode voltar ao valor de referência na próxima abertura.

O cadastro aceita validade opcional. O cálculo de dias, a data no cabeçalho e o mês do orçamento seguem a data local do aparelho. As datas de validade que vêm com os produtos são valores de demonstração; revise-as para os produtos que você tem em casa.

## Interface móvel

Em telas de até 820 px, a navegação vira uma barra fixa inferior com cinco atalhos; “Mais” abre Minha casa e Primeiros socorros. A barra respeita a área segura do aparelho. Em telas maiores, permanece a barra lateral.

## Publicação

- Repositório: [UPraggy/casa-em-ordem](https://github.com/UPraggy/casa-em-ordem)
- Branch publicada: `main`, diretório raiz.
- Domínio configurado pelo arquivo `CNAME`: `casa.rafaelmr.com.br`.
- `.nojekyll` evita que o GitHub Pages processe o site como um projeto Jekyll.
- Não há workflow de publicação versionado em `.github/workflows`; o histórico do GitHub registra o fluxo gerenciado de Pages.

O estado da publicação e o motivo de as mudanças recentes parecerem discretas estão documentados em [docs/ESTADO-E-PUBLICACAO.md](docs/ESTADO-E-PUBLICACAO.md). O comportamento atual e as limitações de cada tela estão em [docs/GUIA-DO-USUARIO.md](docs/GUIA-DO-USUARIO.md).

## Limitações conhecidas

- Os dados não sincronizam entre dispositivos e não há login/compartilhamento de estoque doméstico.
- O botão para criar grupos personalizados ainda não cria grupos.
- A lista começa vazia e só recebe itens que você escolher. Os alertas de estoque baixo não adicionam produtos à lista.
- O total estimado soma todos os itens da lista; marcar a caixa indica quais itens serão baixados ao concluir a compra.
- Os controles `+` e `−` alteram a quantidade a comprar; concluir a compra soma essa quantidade ao estoque atual.
- Alertas são indicadores dentro da página, sem notificações do navegador ou push.
- Os preços são referências estáticas e não vêm de uma cotação em tempo real.
- O assistente usa `openrouter/free` e requer uma chave OpenRouter configurada no navegador. A disponibilidade e os limites do modelo gratuito dependem do OpenRouter.

## Estrutura

| Caminho | Conteúdo |
| --- | --- |
| `index.html` | Estrutura das telas, formulários e navegação |
| `styles.css` | Estilos base e layout para telas maiores |
| `mobile.css` | Regras responsivas e barra inferior |
| `app.js` | Catálogo, estado local, cálculos e interações |
| `design.css` | Sistema visual, componentes e ajustes tablet/celular |
| `assistant.js` / `assistant.css` | Assistente OpenRouter, revisão de ações e interface responsiva |
| `assets/` | Pranchas de imagens do catálogo |
| `CNAME` | Domínio usado pelo GitHub Pages |
| `.nojekyll` | Desativa processamento Jekyll |
| `docs/` | Guia de uso e diagnóstico de publicação |
