(() => {
  const characters = {
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
