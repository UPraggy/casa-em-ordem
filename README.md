# Casa em Ordem

Aplicação estática para organizar compras, estoque, validade, orçamento e itens essenciais da casa. A interface está em português e adapta a navegação para celular.

## Abrir e executar

O site publicado está em [casa.rafaelmr.com.br](https://casa.rafaelmr.com.br/). Para executar uma cópia local, entre na pasta do projeto e rode:

```bash
python -m http.server 4173
```

Depois acesse `http://127.0.0.1:4173`. Também é possível abrir `index.html` diretamente, mas um servidor local reproduz melhor o comportamento hospedado.

## Seções

- **Visão geral:** resumo de itens para comprar, estoque baixo, validades próximas e gastos registrados.
- **Lista de compras:** itens sem estoque, busca, filtro por grupo, seleção, estimativa de valor, compartilhamento e exportação CSV.
- **Estoque:** busca por nome/grupo/validade, filtros de estoque baixo e validade, edição, exclusão e cadastro de foto, preço, quantidade, mínimo e validade.
- **Orçamento:** limite mensal, lançamentos manuais e totais agrupados por categoria.
- **Minha casa:** visão dos grupos de produtos atualmente definidos.
- **Primeiros socorros:** checklist doméstico inicial, com possibilidade de adicionar itens.

O catálogo inicial contém **41 registros de produtos**, todos com quantidade inicial zero em um navegador sem dados salvos. Há também **9 itens** no checklist inicial de primeiros socorros. Os grupos pré-configurados incluem Sacola, Supermercado, Açougue e Primeiros socorros; o formulário de produto também oferece Limpeza e Outro.

## Dados e privacidade

O estado do aplicativo é salvo no `localStorage` do navegador, na chave `casa-em-ordem`. Não há conta, banco de dados, API de sincronização ou cópia automática entre celulares e computadores. Cada navegador/dispositivo mantém os próprios dados.

O catálogo padrão com quantidade zero só aparece quando não existe estado salvo. Dados antigos do navegador podem continuar preenchendo o app após a publicação de uma versão nova. Fotos enviadas são gravadas como dados locais no navegador; muitas fotos ou arquivos grandes podem atingir o limite de armazenamento do navegador.

Compartilhar usa o recurso nativo do dispositivo quando disponível e, caso contrário, tenta copiar o texto da lista. A exportação disponível é CSV da lista de compras; não existe exportação/restauração completa do estoque, orçamento e fotos.

## Imagens

As imagens do catálogo estão em `assets/`. São seis pranchas raster usadas como imagens compostas e recortadas visualmente na interface: hortifruti, frutas, itens domésticos, mercearia, carnes e primeiros socorros. O catálogo não tem uma fotografia individual para cada produto. Itens sem imagem cadastrada ou recorte correspondente podem aparecer com emoji. O formulário permite anexar uma foto própria a um item.

## Preços e validade

Os preços iniciais são valores de referência editáveis, não cotações ao vivo. Há uma lista de preços codificada em `app.js` para alguns produtos; esses valores são reaplicados quando o app inicia, então uma edição de preço desses nomes pode voltar ao valor de referência na próxima abertura.

O cadastro aceita validade opcional. No estado atual, o cálculo de dias usa a data fixa `2026-11-09`, e alguns rótulos do orçamento/lista também usam datas fixas. Portanto, alertas de validade e datas registradas precisam ser corrigidos para acompanhar o calendário real.

## Interface móvel

Em telas de até 720 px, a navegação principal vira uma barra fixa na parte inferior, com espaço para a área segura do aparelho. Em telas maiores, permanece a barra lateral. Para ver a barra inferior, abra o site num telefone ou reduza a largura da janela para até 720 px.

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
- A lista considera para compra apenas produtos com quantidade exatamente zero; não inclui automaticamente produtos positivos abaixo do mínimo.
- O total estimado da lista é calculado para todos os itens exibidos, mesmo os desmarcados.
- Os controles `+` e `−` da lista alteram o estoque atual; não alteram uma quantidade de compra separada.
- Alertas são indicadores dentro da página, sem notificações do navegador ou push.
- Preços e datas usam dados fixos descritos acima. Não há integração com OpenRouter ou outra IA.

## Estrutura

| Caminho | Conteúdo |
| --- | --- |
| `index.html` | Estrutura das telas, formulários e navegação |
| `styles.css` | Estilos base e layout para telas maiores |
| `mobile.css` | Ajustes para celular, barra inferior e microinterações |
| `app.js` | Catálogo, estado local, cálculos e interações |
| `assets/` | Pranchas de imagens do catálogo |
| `CNAME` | Domínio usado pelo GitHub Pages |
| `.nojekyll` | Desativa processamento Jekyll |
| `docs/` | Guia de uso e diagnóstico de publicação |
