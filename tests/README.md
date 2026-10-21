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
