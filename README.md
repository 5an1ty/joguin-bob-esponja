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
- Bullet Hell: fases 1–4 com 5 hambúrgueres por fase, fases 5–7 com 8 e fases 8–10 com 10. A velocidade base muda somente ao avançar de fase; o hambúrguer amarelo concede imunidade e turbo juntos durante 6 segundos. Cada 3 hambúrgueres dão 3 segundos de imunidade, com contador reiniciado na transição. Sombras anunciam canhões que disparam em quatro direções.

Na fase 11, derrote o Holandês Voador para desbloqueá-lo e entrar no infinito. Não existe cota de verdes para vencer o chefe: a vitória depende exclusivamente de derrotá-lo. Desde o início da fase 1, a sequência principal alterna rigorosamente verde → vermelho, inclusive ao mudar de fase, entrar na luta contra o chefe e seguir para o infinito; bônus amarelos não alteram a sequência. Somente verdes contam no progresso; ao serem coletados, verdes tocam um som fantasmagórico e disparam quatro projéteis (2 de dano por Plankton, atravessando-os sem repetir o dano; 1 no chefe). A partir da fase 12, cada 10 verdes avançam uma nova fase infinita.

O Holandês jogável atravessa a própria cauda. Sua habilidade dispara na direção atual, destrói o primeiro obstáculo atingido ou causa 1 de dano em inimigos, com recarga de 15 segundos. O desbloqueio e os recordes são salvos no navegador. As trilhas fornecidas ficam em `musicas/bgm_bullet_mode.mp3` e `musicas/bgm_bullet_boss.mp3`.

No Bullet Hell, obstáculos aparecem desde a fase 1. O sopro causa 2 de dano apenas no primeiro alvo, congelando os demais sem dano. O HUD reúne barras de progresso e carga de escudo. O chefe tem 10 HP, barra verde sobre a cabeça e movimento pouco mais rápido que o Plankton vermelho; ao chegar a 3 HP, avisa uma única saraivada de linha inteira, com sombras longas e explosões escalonadas. Queda, estilhaços, tiro fantasma e alerta da saraivada possuem SFX sintetizados distintos.

Ao entrar na fase 5 do Bullet Hell, a partida pausa para escolher um upgrade ilustrado: **Frio que queima** (sopro com 3 de dano no primeiro alvo e 2 nos demais), **Hambúrguer teleguiado** (tiros verdes buscam Planktons em até 6 células) ou **Salva-vidas** (uma ressurreição, com 5 segundos de imunidade). A escolha vale até o fim da partida; recomeçar permite escolher novamente. As ondas de canhões ficam mais frequentes e passam de 1 até 4 bombas por lançamento conforme a fase; a luta contra o chefe mantém uma redução de pressão.
