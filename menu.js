(() => {
  const characters = {
    dutch: ['Holandês Voador', 'O terror incorpóreo dos sete mares.'],
    bob: ['Bob Esponja', 'O otimismo é seu superpoder.'],
    patrick: ['Patrick', 'Seu melhor amigo nessa aventura.'],
    sandy: ['Sandy Bochechas', 'Coragem e karatê no fundo do mar.']
  };
  function refreshHero() {
    const selected = document.querySelector('.character.selected');
    if (!selected) return;
    const key = selected.dataset.character;
    const [name, tagline] = characters[key];
    const image = document.getElementById('heroCharacter');
    image.src = `assets/${key}.svg`;
    image.alt = `${name} em uma pose alegre`;
    document.getElementById('heroName').textContent = name;
    document.getElementById('heroTagline').textContent = tagline;
  }
  document.querySelectorAll('[data-character], [data-mode]').forEach(button => button.addEventListener('click', refreshHero));
  new MutationObserver(refreshHero).observe(document.querySelector('.character-options'), {subtree:true, attributes:true, attributeFilter:['class']});
  refreshHero();
})();

// Retrato da partida acompanha a seleção, sem alterar os controles do jogo.
const playingAvatar=document.getElementById('playingAvatar');
function syncPlayingAvatar(){
  const selected=document.querySelector('.character.selected');
  if(selected)playingAvatar.src='assets/'+selected.dataset.character+'.svg';
}
document.querySelector('.character-options').addEventListener('click',syncPlayingAvatar);
syncPlayingAvatar();
