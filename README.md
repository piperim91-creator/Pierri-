# Jaqueta Filho — Backend

Servidor que recebe mensagens do app Jaqueta Filho e repassa para a API
do Google Gemini, com suporte a function calling (tools).

```
Celular (app Jaqueta Filho)  →  este backend  →  API do Gemini
```

## Hospedando no Render.com (gratuito)

### Passo 1 — Criar uma conta no GitHub (se ainda não tiver)

O Render puxa o código direto de um repositório GitHub. Vá em
https://github.com e crie uma conta gratuita, se ainda não tiver.

### Passo 2 — Subir esta pasta para o GitHub

1. No GitHub, clique em **"New repository"**
2. Nome: `jaqueta-filho-backend` (ou o que preferir)
3. Deixe como **Private** (privado) — assim ninguém mais vê seu código
4. Clique em **"Create repository"**
5. Na página do repositório vazio, clique em **"uploading an existing file"**
6. Arraste todos os arquivos desta pasta (server.js, package.json,
   README.md, .gitignore) — **NÃO** envie o `.env`, `cert.pem` nem `key.pem`
7. Clique em **"Commit changes"**

### Passo 3 — Criar o serviço no Render

1. Vá em https://render.com e crie uma conta (pode entrar com GitHub)
2. No painel, clique em **"New +"** → **"Web Service"**
3. Conecte sua conta do GitHub se pedir, e selecione o repositório
   `jaqueta-filho-backend`
4. Configure:
   - **Name**: jaqueta-filho (ou o que preferir)
   - **Region**: a mais próxima do Brasil (Ohio costuma ser a melhor opção)
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: Free
5. Em **"Environment Variables"**, adicione:
   - `GEMINI_API_KEY` = sua chave do Gemini
   - `IS_HOSTED` = `true`
6. Clique em **"Create Web Service"**

O Render vai instalar tudo e iniciar o servidor automaticamente. Isso leva
alguns minutos na primeira vez.

### Passo 4 — Pegar a URL pública

Quando o deploy terminar, o Render mostra uma URL no topo da página,
parecida com:

```
https://jaqueta-filho.onrender.com
```

### Passo 5 — Configurar o app com a nova URL

1. Abra o `jaqueta-filho.html` (no celular ou no PC)
2. Toque na engrenagem ⚙
3. Configure a URL do backend como:
   ```
   https://jaqueta-filho.onrender.com/jaqueta/chat
   ```
4. Salve

Pronto — agora funciona de qualquer lugar (Wi-Fi ou 4G), sem precisar do
PC ligado.

> **Nota sobre o plano gratuito**: o Render "dorme" o serviço após um
> tempo sem uso, e leva 30-50 segundos para acordar na primeira mensagem
> do dia. As mensagens seguintes são rápidas normalmente.

---

## Rodando localmente (no seu PC, para testes)

```bash
npm install
node --env-file=.env server.js
```

Para usar HTTPS local (necessário para o microfone funcionar ao acessar
pelo IP da rede, como `192.168.x.x`), gere um certificado:

```bash
node gerar-certificado.js
```

Isso cria `cert.pem` e `key.pem`. Reinicie o servidor e acesse via:
```
https://SEU-IP-LOCAL:3443/jaqueta-filho.html
```

---

## Segurança

- Nunca coloque a `GEMINI_API_KEY` direto no código ou no app do celular.
- O arquivo `.env` nunca deve ser commitado no Git (já está no `.gitignore`).
- O repositório no GitHub deve ser **privado**.

---

## Próximos passos possíveis

- Memória de conversa (lembrar mensagens anteriores)
- Tools reais conectadas aos dados do ARP
- Wake word ("Ei, Jaqueta") para ativação por voz sem tocar na tela
