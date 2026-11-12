# matturo burger

Crie uma loja virtual profissional, moderna e totalmente responsiva para a marca NovaFix Tech Lab.

IMPORTANTE: Este projeto é exclusivamente uma loja virtual de artigos personalizados fabricados por impressão 3D, gravação a laser e corte a laser. Não tem qualquer relação com sistemas de publicação automática em redes sociais.

IDENTIDADE VISUAL:
- Tema escuro.
- Fundo preto e grafite.
- Detalhes em azul e roxo neon.
- Design premium, moderno e tecnológico.
- Interface limpa, elegante e intuitiva.
- Excelente experiência em computadores e telemóveis.

FUNCIONALIDADES DA LOJA:

1. Página inicial com banner principal, produtos em destaque, categorias e novidades.
2. Catálogo de produtos com pesquisa e filtros.
3. Categorias: Impressão 3D, Figuras 3D, Personalizados, Gravação Laser, Decoração, Presentes Personalizados, Chaveiros e Luminárias.
4. Página individual de cada produto.
5. Galeria de imagens dos produtos.
6. Seleção de variações, como cor, tamanho e modelo.
7. Carrinho de compras.
8. Área de finalização de encomendas.
9. Área de contacto e solicitação de produtos personalizados.
10. Layout otimizado para SEO e velocidade.

INTEGRAÇÃO COM SUPABASE:

Já existe um projeto Supabase com produtos, categorias, atributos, variações e imagens importados do Base44.

Antes de criar qualquer tabela ou modificar o banco:
- Inspecione a estrutura existente.
- Identifique as tabelas e relacionamentos.
- Utilize os produtos já cadastrados.
- Utilize as imagens existentes no bucket público product-images.
- Utilize a coluna storage_path para recuperar as imagens.
- Preserve todos os dados existentes.
- Não crie produtos fictícios.
- Não duplique tabelas.
- Não altere políticas RLS, configurações ou estruturas do banco sem autorização.

OBJETIVO:
Construir uma loja virtual completa, profissional e preparada para receber encomendas reais da NovaFix Tech Lab.

Comece pela estrutura visual e pela arquitetura do frontend. Antes de qualquer alteração no banco de dados, apresente o que pretende fazer.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://matturo-burger.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/97eaa71e-9135-4386-8abd-d0e2bd63b603).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
