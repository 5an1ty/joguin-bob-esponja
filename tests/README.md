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
layout dos controles por gesto em quatro tamanhos e entrada/saída da tela cheia.
Também validam o arrasto contínuo com eventos de toque do Chromium, proporção e
resolução em telas com densidade 2×, interpolação entre frames, efeitos visuais,
frequência de poderes por dificuldade e alternância normal/vermelho no Plankton.
As regressões do HUD verificam a explicação do hambúrguer fora do mapa, a barra de
vida sem números, os raios partindo dos dois olhos e a separação entre mapa e poder.
A orientação e o comportamento da tela cheia em aparelhos reais devem ser
conferidos também no navegador do dispositivo.

Os testes da sobreposição garantem que coletar/expirar poderes não altera a
posição ou tamanho do mapa em mobile e PC, com e sem tela cheia, e que a
indicação permanece fixa no canto superior esquerdo sem interceptar os controles.
Também verificam o limite de três poderes, o bloqueio de especiais até um efeito
expirar, o mapa mobile menor e a fila de curvas rápidas sem inversão da cobra.

A grade mobile adaptativa de 16 colunas é validada com comida segura, obstáculos proporcionais e
portais nas bordas. Os testes também confirmam o reaproveitamento de cenários e
sprites luminosos entre frames e arrasto contínuo com várias curvas por gesto.

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

## Controles mobile e tela cheia

O celular inicia com arrasto contínuo. O menu permite escolher Arrastar, Joystick ou D-Pad, com preferências salvas no navegador. Dois toques rápidos no mapa ativam o poder na Batalha; o botão é opcional. No mobile, pausa com ícone de duas barras e saída de tela cheia ficam no canto superior direito. Continuar e reiniciar ficam no menu de pausa; não há botão de pausa ou jogar novamente no rodapé.

Em tela cheia, o mapa ocupa todo o viewport. A grade tem 14 células no eixo menor e adapta o eixo maior, inclusive nas rotações. O corpo é remapeado mantendo continuidade; se a nova área não comportar todo o corpo sem sobreposição, apenas a cauda excedente é reduzida. Pontuação, poderes e progresso dos inimigos são mantidos. A comida evita as áreas cobertas pelos controles.

`test_control_options.py` valida os três controles, persistência, joystick e D-Pad com área de toque ampliada, poder por toque duplo, rejeição de arrasto/toque longo, doze combinações de tela/controle, reorganização segura, pausa superior e reinício pelo menu.

`test_mobile_ui.py` valida arrasto contínuo e cancelamento, guia inicial sem pausa e sem perda de pontos, e as cinco demonstrações automáticas do treino de Batalha antes da prática.

`test_orientation.py` verifica a escolha de orientação ao entrar em tela cheia com joystick/arrasto, cancelamento sem perder progresso, solicitação de bloqueio ao navegador, orientação manual quando o bloqueio não está disponível, retomada após girar, joystick à esquerda e troca de posições entre Recomeçar e Continuar no menu de pausa.

`test_mobile_pause_hud.py` verifica o ícone de pausa no topo, ausência dos botões inferiores e reinício/continuação dentro do menu em telas vertical, horizontal e tablet.

`test_power_mobile_readability.py` verifica os indicadores compactos de poderes no espaço central da mesma faixa de pontuação e controles, em quatro tamanhos, sem faixa No mapa, sem cartões sobre a arena e sem mudanças no tamanho do tabuleiro. Também percorre demonstração e prática com animação de dois toques: um toque não ativa a habilidade, o segundo ativa e avança, e a orientação desaparece ao concluir ou sair do treino.

`test_joystick_position.py` verifica o editor de posição acessível pelo menu de pausa: arrastar, salvar, cancelar e restaurar o padrão; manter pontuação e pausa; continuar usando o joystick reposicionado; salvar posições distintas na vertical/horizontal e recuperá-las após recarregar.

## Bullet Hell e Holandês Voador

`test_bullet_hell.py` cobre metas por fase (5/8/10), velocidade alterada apenas na transição, escudo de 3 segundos a cada 3 lanches, reset do contador, composição de inimigos, sombras/impacto/quatro estilhaços, dano de verdes em Plankton/chefe, aviso sonoro antes do tiro, coleta exclusivamente verde em todas as fases, desbloqueio persistente e fase infinita. A fase 11 é vencida exclusivamente ao derrotar o chefe, sem cota de verdes. A partir da fase 12, 10 verdes avançam cada fase infinita.

Os projéteis verdes saem nas quatro direções **ao coletar** o hambúrguer. O lanche amarelo da habilidade do Bob é um bônus separado, preservando a sequência principal; ele concede imunidade e turbo simultâneos por 6 segundos, sem contar para avançar a fase. A rotação limpa tiros e sombras em trânsito para evitar colisões causadas pela mudança da grade, preservando fase, pontuação e inimigos. Um bônus amarelo ainda não coletado é removido com devolução da recarga.

O Holandês desbloqueado atravessa o próprio corpo, mas continua sujeito a obstáculos e inimigos. Seu tiro tem recarga de 15 segundos, destrói o primeiro obstáculo atingido ou causa 1 de dano no primeiro inimigo. Os testes também cobrem pausa, rotação mobile, poder por dois toques e decodificação dos MP3 enviados pelo usuário (`bgm_bullet_mode.mp3` e `bgm_bullet_boss.mp3`).

No Bullet Hell, obstáculos aparecem desde a fase 1. O sopro causa 2 de dano apenas no primeiro alvo, congelando os demais sem dano. O HUD reúne barras de progresso e carga de escudo. O chefe tem 10 HP, barra verde sobre a cabeça e movimento pouco mais rápido que o Plankton vermelho; ao chegar a 3 HP, avisa uma única saraivada de linha inteira, com sombras longas e explosões escalonadas. Queda, estilhaços, tiro fantasma e alerta da saraivada possuem SFX sintetizados distintos.
