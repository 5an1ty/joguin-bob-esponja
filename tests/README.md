# Testes do jogo

Os testes abrem o jogo no Chromium real com Playwright e iniciam um servidor
HTTP temporário automaticamente. Não alteram os arquivos do jogo.

Requisitos: Python 3, pacote Python `playwright` e Chromium instalado.
No ambiente de desenvolvimento preparado, esses requisitos já estão disponíveis.

```sh
python3 -m unittest discover -s tests -v
```

Por padrão, usam `/usr/bin/chromium`. Para outro caminho:

```sh
CHROMIUM_PATH=/caminho/do/chromium python3 -m unittest discover -s tests -v
```

Cobrem portais nas bordas, colisões e poderes temporários, pausa e reinício,
ímã, geração de comida, progressão, raios e perseguição do Plankton,
layout do direcional em quatro tamanhos e entrada/saída da tela cheia.
Também validam o arrasto contínuo com eventos de toque do Chromium, proporção e
resolução em telas com densidade 2×, interpolação entre frames, efeitos visuais,
frequência de poderes por dificuldade e alternância normal/vermelho no Plankton.
As regressões do HUD verificam a explicação do hambúrguer fora do mapa, a barra de
vida sem números, os raios partindo dos dois olhos e a folga abaixo do direcional.
A orientação e o comportamento da tela cheia em aparelhos reais devem ser
conferidos também no navegador do dispositivo.

Os testes da sobreposição garantem que coletar/expirar poderes não altera a
posição ou tamanho do mapa em mobile e PC, com e sem tela cheia, e que a
indicação permanece fixa no canto superior esquerdo sem interceptar os controles.
Também verificam o limite de três poderes, o bloqueio de especiais até um efeito
expirar, o mapa mobile menor e a fila de curvas rápidas sem inversão da cobra.

A grade mobile 18×18 é validada com comida segura, obstáculos proporcionais e
portais nas bordas. Os testes também confirmam o reaproveitamento de cenários e
sprites luminosos entre frames e uma única medição dos botões por gesto.

A resposta visual imediata às curvas, continuidade entre passos e pausa/retomada
sem saltos também são verificadas. A suíte cobre a pausa no canto superior
direito, transparência dos poderes e preferência de música persistente.

As regressões de entrada cobrem correção de comandos pendentes, repetição
automática do teclado, direções neutras e troca de controle entre dois dedos.
Os efeitos de coleta, laser e morte são renderizados com OfflineAudioContext
para verificar áudio real e ausência de clipping, sem arquivos de terceiros.
Também são testados os controles independentes de música, efeitos e silêncio geral.

A Batalha é validada até a onda máxima, incluindo contagem e cores de inimigos,
velocidade, perseguição, paralisia, alvo do laser e vida do grupo. As cinco músicas
são decodificadas no navegador e a troca exploração/chefe é testada por dificuldade.

O sopro congelante é testado com alcance e ângulo do cone, dano frontal/traseiro,
congelamento, portais, retorno ao tamanho inicial e recompensas por derrotas
simultâneas. O modo clássico permanece sem essas mecânicas exclusivas da Batalha.

As bombas da Batalha são verificadas quanto à geração exclusiva nesse modo,
ativação por Plankton, dano em raio de 15 células, recompensa por derrota,
consumo único, imunidade do jogador à explosão e colisão como obstáculo.
O cone congelante também cobre inimigos além do antigo limite de 9 células.

Todos os sons de hambúrgueres e do sopro são renderizados em áudio offline para
verificar sinal e ausência de clipping. A suíte também valida os eventos de cada
poder, recorde persistente de abates separado da pontuação e velocidade mobile
reduzida por dificuldade, fase e turbo, mantendo a velocidade original no PC.

As partidas de teste que exercitam movimento retomam explicitamente a pausa
inicial. Há testes próprios da pausa mobile em ambos os modos e três dificuldades,
com entrada em tela cheia e botão Power. As habilidades de Bob, Patrick e Sandy
são verificadas com recarga, colisões, dano, sons sintetizados e exclusão dos abates
da bomba especial na recarga. Também são cobertos os multiplicadores do Clássico,
a exclusividade da Sandy na Batalha e o tutorial que pausa no primeiro abate.

O balanceamento da Batalha cobre os limites das ondas 3 e 6, vida por cor,
barras proporcionais e raios até a derrota. A recarga da Sandy é validada com
2 usos iniciais, 1 uso por 2 abates e teto de 3, sem guardar crédito além do teto.
A velocidade base constante da Batalha e o turbo temporário também são testados.

A recarga da Sandy só é liberada depois de gastar os dois usos iniciais;
spam sem cargas é bloqueado. Também são verificados a luva enquanto o golpe
está armado, a transparência na imunidade, a recarga do Patrick com 1 abate
e sua imunidade à colisão de todas as bombas, preservando a colisão com pedras.

O tutorial jogável percorre cinco eventos reais com Bob: coleta, habilidade,
raio e avanço de onda, bomba e sopro. Os testes verificam a desaceleração antes
da pausa, textos e ilustrações compartilhados com o menu, repetição manual,
restauração do personagem/dificuldade e ausência de alterações nos recordes.
Também cobrem o destaque do primeiro hambúrguer e a dica após dois abates,
com ativação gratuita de Bob, Patrick e Sandy e indicação própria no mobile.
