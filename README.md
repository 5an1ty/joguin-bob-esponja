# Bob Esponja Snake

Jogo web estático. O `index.html` e os arquivos do jogo ficam na raiz do repositório.

## Rodar localmente

```sh
python3 -m http.server 8000
```

Abra http://localhost:8000.

## Deploy automático na Netlify

1. Na Netlify, importe o repositório `5an1ty/joguin-bob-esponja` usando a integração com GitHub (ou conecte-o em **Project configuration → Build & deploy → Continuous deployment → Repository**).
2. Selecione a branch que deve publicar em produção, normalmente `main`.
3. Mantenha a pasta base na raiz (`.`). O arquivo `netlify.toml` define o comando `bash build-site.sh` e a pasta de publicação `dist`.
4. Confirme que os builds automáticos estão ativos. A partir daí, cada push na branch de produção dispara uma nova publicação. Pull requests podem gerar Deploy Previews conforme as configurações do projeto.

Não é necessário configurar GitHub Actions nem adicionar tokens ao repositório. A conexão GitHub–Netlify precisa estar autorizada na conta Netlify; o arquivo de configuração sozinho não cria essa conexão.

Para conferir o pacote publicado localmente:

```sh
bash build-site.sh
python3 -m http.server 8000 --directory dist
```

O pacote inclui somente HTML, CSS, JavaScript, ilustrações e músicas. Testes e documentação ficam fora da publicação.

## Testes

Veja `tests/README.md`. Execute na raiz:

```sh
python3 -m unittest discover -s tests -v
```

## Modos e personagem desbloqueável

- Clássico: exploração e perseguições do Plankton.
- Batalha: ondas de inimigos e habilidades de personagem.
- Bullet Hell: fases 1–4 com 5 hambúrgueres por fase, fases 5–7 com 8 e fases 8–10 com 10. A velocidade muda somente ao avançar de fase. Cada 3 hambúrgueres dão 3 segundos de imunidade, com contador reiniciado na transição. Sombras anunciam canhões que disparam em quatro direções.

Na fase 11, derrote o Holandês Voador para desbloqueá-lo e entrar no infinito. Não existe cota de verdes para vencer o chefe: a vitória depende exclusivamente de derrotá-lo. A sequência principal alterna verde/vermelho, e somente verdes contam no progresso; ao serem coletados, verdes disparam quatro projéteis (2 de dano em Planktons, 1 no chefe). A partir da fase 12, cada 10 verdes avançam uma nova fase infinita.

O Holandês jogável atravessa a própria cauda. Sua habilidade dispara na direção atual, destrói o primeiro obstáculo atingido ou causa 1 de dano em inimigos, com recarga de 15 segundos. O desbloqueio e os recordes são salvos no navegador. As trilhas fornecidas ficam em `musicas/bgm_bullet_mode.mp3` e `musicas/bgm_bullet_boss.mp3`.
