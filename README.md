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
