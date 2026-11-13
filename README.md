# Painel de senhas lite

Balcão e TV no mesmo navegador. O site só entrega as páginas. A senha chamada numa janela aparece na outra porque as duas compartilham o armazenamento deste computador. Não há login, banco nem conexão com o painel da nuvem.

## Uso

1. Abra o site no computador ligado à TV pelo HDMI.
2. Clique em **Abrir na TV**.
3. Arraste essa janela para a TV e clique nela para liberar o áudio.
4. No balcão, digite a senha e pressione Enter.

A TV só acompanha o balcão se estiver aberta no mesmo navegador. Outro celular, outra TV ou outro computador abrindo o mesmo endereço vê o painel vazio.

## Desenvolvimento

```bash
npm install
npm run dev
```

O balcão fica em `http://localhost:5173/` e a TV em `http://localhost:5173/tv.html`.

## Publicar

```bash
npm run build
```

A pasta `dist` é o site estático. Ela contém `index.html`, `tv.html` e os assets com caminho relativo, então funciona tanto na raiz da Vercel quanto em `https://usuario.github.io/painel-senhas-lite/`.

### GitHub Pages

Publique o conteúdo de `dist` (não a raiz do repositório). O arquivo `.nojekyll` já vai dentro de `dist` para o Pages não ignorar arquivos.

### Vercel

Importe o repositório com framework Vite, comando `npm run build` e pasta de saída `dist`.
