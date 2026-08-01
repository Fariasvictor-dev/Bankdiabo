# Mocho do Diabo MC — Painel Oficial

Site leve (HTML + CSS + JS puro) para o clube: controle de mensalidades,
registro de sangrias com comprovante em foto, e uma calculadora de
combustível para os rolês. Sem build, sem framework — abre direto no navegador.

## Estrutura

```
motoclube/
├── index.html
├── styles.css
├── app.js
├── assets/
│   └── logo.png
└── README.md
```

## 1. Criar o projeto no Supabase

1. Crie uma conta gratuita em [supabase.com](https://supabase.com) e um novo projeto.
2. Em **Project Settings → API**, copie a **Project URL** e a chave **anon/public**.
3. Abra `app.js` e substitua:

```js
const SUPABASE_URL = 'SUA_URL_AQUI';
const SUPABASE_ANON_KEY = 'SUA_CHAVE_ANON_AQUI';
```

A chave `anon` é feita para ficar exposta no front-end — quem controla o que
cada visitante pode fazer é a Row Level Security (RLS) das tabelas, configurada
no passo 2.

## 2. Criar as tabelas

No **SQL Editor** do Supabase, rode:

```sql
create table membros (
  id bigint generated always as identity primary key,
  nome text not null,
  pago boolean not null default false,
  created_at timestamp with time zone default now()
);

create table sangrias (
  id bigint generated always as identity primary key,
  descricao text not null,
  valor numeric not null,
  comprovante_url text,
  created_at timestamp with time zone default now()
);

alter table membros enable row level security;
alter table sangrias enable row level security;

-- leitura liberada para todo mundo
create policy "Leitura publica membros" on membros for select using (true);
create policy "Leitura publica sangrias" on sangrias for select using (true);

-- escrita liberada (o app já esconde os botões de quem não é tesoureiro,
-- mas para travar de verdade no banco, troque estas políticas por uma
-- checagem de usuário autenticado — ver "Segurança" abaixo)
create policy "Escrita membros" on membros for insert with check (true);
create policy "Atualizacao membros" on membros for update using (true);
create policy "Escrita sangrias" on sangrias for insert with check (true);
```

## 3. Criar o bucket de comprovantes

Em **Storage**, crie um bucket público chamado `comprovantes`
(Storage → New bucket → marque "Public bucket").

## 4. Trocar a senha do tesoureiro

Em `app.js`:

```js
const SENHA_TESOUREIRO = "admin123";
```

Troque `"admin123"` pela senha que o tesoureiro do clube vai usar.

⚠️ **Isso é só uma trava de interface** — esconde os botões de edição de quem
não digitou a senha, mas não impede alguém tecnicamente hábil de editar o
banco diretamente. Para uma trava de verdade, veja a seção **Segurança** abaixo.

## 5. Subir no GitHub Pages

1. Crie um repositório no GitHub e suba os arquivos deste projeto na raiz.
2. Vá em **Settings → Pages**, escolha a branch `main` e a pasta `/root`.
3. Em alguns minutos o site estará no ar em `https://seu-usuario.github.io/nome-do-repo/`.

## Segurança (recomendado para uso real)

O modelo acima (senha só na interface + políticas de escrita abertas) é
suficiente para uso informal entre membros de confiança, mas qualquer pessoa
que abra o DevTools do navegador consegue ver a chave e escrever no banco
diretamente. Se quiser uma trava de verdade:

1. Ative **Authentication** no Supabase e crie um único usuário para o tesoureiro.
2. Troque `loginAdmin()` em `app.js` para usar `db.auth.signInWithPassword(...)`.
3. Troque as políticas de `insert`/`update` de `using (true)` para
   `using (auth.uid() is not null)`, restringindo a escrita a quem estiver logado.

## Personalização

- **Valor da mensalidade**: constante `VALOR_MENSALIDADE` em `app.js`.
- **Modelos de moto da calculadora**: lista `<option>` dentro de `#moto-select` em `index.html`.
- **Cores e tipografia**: variáveis no topo de `styles.css` (`:root`).
