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
- Bullet Hell: fases 1–10 com 5 hambúrgueres verdes por fase. Antes do infinito, a velocidade base muda ao avançar de fase; o hambúrguer amarelo concede imunidade e turbo juntos durante 6 segundos. Cada 3 hambúrgueres dão 3 segundos de imunidade, com contador reiniciado na transição. Sombras anunciam canhões que disparam em quatro direções.

Na fase 11, derrote o Holandês Voador para desbloqueá-lo. A decisão pós-chefe permite continuar no infinito (fase 12 em diante) ou encerrar na tela de vitória e recompensas. Não existe cota de verdes para vencer o chefe: a vitória depende exclusivamente de derrotá-lo. Desde o início da fase 1, a sequência principal alterna rigorosamente verde → vermelho, inclusive ao mudar de fase, entrar na luta contra o chefe e seguir para o infinito; bônus amarelos não alteram a sequência. Somente verdes contam no progresso; ao serem coletados, verdes tocam um som fantasmagórico e disparam quatro projéteis (2 de dano por Plankton, atravessando-os sem repetir o dano; 1 no chefe). A partir da fase 12, cada 10 verdes avançam uma nova fase infinita.

O Holandês jogável atravessa a própria cauda. Sua habilidade dispara na direção atual, destrói o primeiro obstáculo atingido ou causa 1 de dano em inimigos, com recarga de 15 segundos. O desbloqueio e os recordes são salvos no navegador. As trilhas fornecidas ficam em `musicas/bgm_bullet_mode.mp3` e `musicas/bgm_bullet_boss.mp3`.

No Bullet Hell, obstáculos aparecem desde a fase 1. O sopro causa 2 de dano apenas no primeiro alvo, congelando os demais sem dano. O HUD reúne barras de progresso e carga de escudo. O chefe tem 10 HP, barra verde sobre a cabeça e movimento pouco mais rápido que o Plankton vermelho; ao chegar a 3 HP, avisa uma única saraivada de linha inteira, com sombras longas e explosões escalonadas. Queda, estilhaços, tiro fantasma e alerta da saraivada possuem SFX sintetizados distintos.

Nas fases **3, 6 e 9**, o Bullet Hell pausa para escolher um card ilustrado. Os upgrades escolhidos se acumulam e saem do pool; recomeçar zera as escolhas. A fase 3 oferece Frio que queima, Hambúrguer teleguiado e Salva-vidas. A fase 6 oferece os dois recusados mais uma novidade. A fase 9 sorteia três opções ainda não escolhidas. A Saraivada tem uma checagem de 10% em cada sorteio posterior, inclusive quando recusada antes; quando escolhida, não retorna ao pool.

- **Frio que queima:** sopro causa 3 de dano no primeiro alvo e 2 nos demais.
- **Hambúrguer teleguiado:** tiros verdes buscam Planktons em até 6 células.
- **Salva-vidas:** uma ressurreição com 5 segundos de imunidade.
- **Laser perfurante:** o hambúrguer vermelho dispara um feixe até a borda, na direção do Plankton mais próximo, causando 1 de dano e paralisando todos os inimigos alinhados.
- **Amuleto da sorte:** 20% de chance por dano fatal de ignorá-lo e ficar intangível por 4 segundos; a checagem ocorre antes de gastar Salva-vidas.
- **Saraivada fantasmagórica (MÍTICO):** um uso por partida, ativado pelo botão Saraivada ou tecla V. Lança 56 balas roxas pelo mapa, destrói obstáculos, causa 2 de dano aos inimigos e não acerta o jogador. O poder normal do personagem continua disponível.

As ondas de canhões ficam mais frequentes e passam de 1 até 4 bombas por lançamento conforme a fase; a luta contra o chefe mantém uma redução de pressão.

A trilha `musicas/bgm_menu_mode.mp3` toca no menu e na pausa comum. As escolhas de cartas pausam apenas a simulação, mantendo a música da partida. Continuar retoma a trilha de jogo do ponto em que parou. A entrada no menu tenta iniciar o áudio e repete a tentativa na primeira interação permitida pelo navegador, respeitando Silenciar música/Silenciar tudo.

Após cada escolha de card, a simulação inteira acelera de 0% a 100% em 4 segundos reais: jogador, inimigos, projéteis e temporizadores compartilham um relógio virtual. Uma pausa comum suspende o tempo restante dessa retomada. A música continua sem desacelerar. No infinito, a pressão cresce também com o tempo jogado, mesmo sem coletar comida, aumentando a velocidade e a frequência/densidade dos canhões dentro de limites de desempenho.

## Android e página de download

A interface usa HTML/CSS/JavaScript compartilhados com o jogo web. `ocean.css`
moderniza a identidade náutica sem alterar o mapa em tela cheia.
`docs/` é a landing page independente publicada em
https://5an1ty.github.io/joguin-bob-esponja/docs/ pelo GitHub Pages existente.
A página procura a maior versão Android publicada, ignorando reexecuções de
builds antigos, e mantém o APK confirmado como fallback se a API falhar.

O projeto Android em `android/` empacota o jogo e as músicas localmente em uma
WebView, sem exigir conexão ou permissões de rede. Requer Android 8+ e WebView
atualizada. Para compilar: JDK 17, Android SDK 35 e Gradle 8.10.2;
execute `bash android/prepare-assets.sh` e `cd android && gradle :app:assembleDebug`.
O workflow `android.yml` gera um APK instalável, publica-o em uma release e
mantém a assinatura de desenvolvimento em cache. Essa é uma distribuição de
teste: se o cache da chave expirar, reinstalar pode ser necessário e apagar
os dados locais. Para distribuição definitiva, configure uma chave de release
permanente em secrets antes de migrar a assinatura. Nunca armazene chave privada
no repositório. A geração automatizada não substitui teste em aparelho Android.

GitHub Pages publica a branch `main` e disponibiliza a landing em `/docs/`.
Netlify continua servindo `dist/` com o jogo. Não há workflow adicional de Pages
para disputar a publicação automática já configurada no repositório.
