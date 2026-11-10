# Eco 4 Solutions; site institucional (PT, ES, EN)

Site estático gerado por um script Node sem dependências. Você edita arquivos JSON, roda `node build.js` e a pasta `dist/` sai pronta para publicar.

## Estrutura

```
build.js                 gerador (lê config + traduções e cria dist/)
netlify.toml             configuração de deploy
src/config.json          NÚMEROS, CONTATOS, REDES, CLIENTES, DEPOIMENTOS, NOTÍCIAS, VÍDEOS
src/locales/pt.json      textos em português (padrão)
src/locales/es.json      textos em espanhol
src/locales/en.json      textos em inglês
src/assets/css/style.css estilos (cores no topo, em :root)
src/assets/js/main.js    interações (tema, menu, contadores, ciclo, vídeos)
src/assets/img/          logo, favicon e imagem de compartilhamento (og.jpg)
tools/og.html            modelo da imagem og.jpg
```

## Como visualizar no computador

```bash
node build.js
```

```bash
python -m http.server 8090 -d dist
```

Abra http://localhost:8090

## O que editar e onde

| Quero mudar | Arquivo | Campo |
|---|---|---|
| Números de impacto (contadores) | `src/config.json` | `stats[].value` e `prefix` (ex.: "+") |
| Anos de atuação (aparece em todos os textos) | `src/config.json` | `stats` com `"key": "years"`; o `{years}` nos textos é trocado por esse número |
| Telefones, e-mails, endereços | `src/config.json` | `offices.br` / `offices.py` (`phoneE164` é o número usado no `tel:` e no WhatsApp) |
| Instagram, LinkedIn, YouTube | `src/config.json` | `social`; ícone só aparece quando o link é preenchido (nunca gera link vazio) |
| Clientes do carrossel | `src/config.json` | `clients` (nome e cor de destaque ao passar o mouse) |
| Depoimentos | `src/config.json` (nome, empresa, vídeo) + `home.testimonials.items` nos 3 locales (cargo e citação) | |
| Notícias | `src/config.json` `news` (id e data) + `news.items.<id>` nos 3 locales | |
| Vídeos da página Notícias | `src/config.json` `videos`: `[{ "youtubeId": "abc123", "title": { "pt": "...", "es": "...", "en": "..." } }]` | |
| Qualquer texto | `src/locales/*.json` | a mesma chave nos três arquivos |
| URLs (slugs) | `src/locales/*.json` | `routes` |
| Domínio | `src/config.json` | `siteUrl` (usado em canonical, hreflang, Open Graph e sitemap) |
| Para onde vai o formulário | `src/config.json` | `formEndpoint` (vazio = Netlify Forms; preenchido = Formspree ou similar) |

Depois de editar, rode `node build.js` (na Netlify isso é automático a cada deploy).

### Travas automáticas do build
O build para com uma mensagem clara se:
- um dos locales não tiver exatamente as mesmas chaves do `pt.json` (tradução faltando);
- algum texto tiver travessão (— ou –);
- o mesmo vídeo do YouTube estiver repetido em depoimentos ou vídeos;
- alguma página tiver link `href="#"` ou não tiver exatamente um H1.

### Adicionar vídeo em um depoimento
Preencha `youtubeId` (o código depois de `watch?v=`). O vídeo só carrega quando o visitante clica (miniatura leve, sem iframe até o clique).

## Deploy na Vercel
1. Suba a pasta para um repositório no GitHub (sem a pasta `dist/`).
2. Na Vercel: Add New; Project; importe o repositório. O `vercel.json` já define o build (`node build.js`) e a pasta (`dist`); não precisa mudar nada na tela de configuração.
3. Em Settings; Domains, adicione `eco4solutions.com`.
4. **Formulário (obrigatório na Vercel):** a Vercel não recebe formulários sozinha. Crie um formulário grátis em formspree.io com o e-mail que deve receber os contatos, copie o endereço (ex.: `https://formspree.io/f/abcdwxyz`) e cole em `formEndpoint` no `src/config.json`. Faça o commit; o próximo deploy já envia para lá. Enquanto `formEndpoint` estiver vazio, o formulário fica no modo Netlify e **não funciona na Vercel**.

## Deploy na Netlify (alternativa)
1. Suba a pasta para um repositório no GitHub (sem a pasta `dist/`).
2. Na Netlify: Add new site; Import from Git; escolha o repositório. Build command e pasta já vêm do `netlify.toml`.
3. Em Domain settings, aponte o domínio `eco4solutions.com`.
4. Formulário: a Netlify detecta o form `contato` sozinha. Em Forms; Notifications, cadastre o e-mail que deve receber os contatos.

## Antes de publicar (conteúdo provisório)
Estes itens foram escritos como exemplo e precisam ser confirmados pela empresa:
- **Números de impacto** em `config.json` (toneladas, cabeças de gado).
- **Depoimentos**: nomes, empresas e falas são modelos. Use apenas depoimentos reais e autorizados.
- **Linha do tempo** (Quem Somos): marcos por década são ilustrativos.
- **Certificados**: a lista descreve licenças típicas do setor; confirme quais a empresa possui.
- **Notícias**: três artigos técnicos de exemplo, com datas fictícias.
- **Logos de clientes**: ficam em `src/assets/img/clients/` (PNG) e são ligadas pelo campo `logo` em `clients` no `config.json`. Cliente sem `logo` aparece como nome em texto. Confirme a autorização de uso de cada marca.
- **Política de Privacidade**: revisar com o jurídico, principalmente a parte da lei paraguaia.
- **Redes sociais**: preencher `social` no `config.json`.

## Imagem de compartilhamento (WhatsApp/LinkedIn)
`src/assets/img/og.jpg` (1200x630). Para refazer, edite `tools/og.html`, gere um print 1200x630 (ex.: Edge/Chrome headless) e converta para JPG.
