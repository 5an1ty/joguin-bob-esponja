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
