# desabafo amigo

Segue um prompt completo para gerar esse aplicativo em plataformas como Lovable, Bolt, Firebase Studio ou outras ferramentas de IA.



Prompt – Desabafa Amigo

Você é um desenvolvedor Full Stack especialista em aplicações de alto nível, segurança digital, criptografia e experiência do usuário.

Crie um aplicativo moderno chamado Desabafa Amigo, cujo objetivo é oferecer um espaço seguro, gratuito e totalmente anônimo para que qualquer pessoa possa conversar quando estiver passando por momentos difíceis.

Objetivo

O aplicativo deve conectar usuários anonimamente com voluntários e psicólogos cadastrados.

Nenhuma das duas partes conhece a identidade da outra.

O foco é:

anonimato;

segurança;

acolhimento;

simplicidade;

rapidez.

Não é uma rede social.

Não possui curtidas.

Não possui seguidores.

Não possui perfil público.

É apenas um lugar seguro para conversar.



Design

Interface extremamente limpa.

Estilo semelhante ao WhatsApp + Telegram + Notion.

Paleta de cores:

azul escuro

azul claro

branco

pequenos detalhes em verde

Transmitir calma.

Nada chamativo.

Animações suaves.



Tela Inicial

Mostrar apenas:

Logo

Nome:

Desabafa Amigo

Texto:

“Você não precisa enfrentar tudo sozinho.”

Botão grande:

Começar Conversa

A pessoa entra imediatamente.

Sem cadastro obrigatório.

Sem login.

Sem pedir nome.

Sem pedir e-mail.

Sem pedir telefone.



Identidade do usuário

Ao entrar, o sistema gera automaticamente:

um apelido aleatório

Exemplos:

Lua Serena

Nuvem Azul

Andarilho

Estrela 82

Montanha Verde

Esse apelido existe apenas durante aquela conversa.

Depois desaparece.



Chat

Obrigatório.

O aplicativo inteiro gira em torno do chat.

O usuário entra automaticamente em uma fila.

Assim que houver um voluntário disponível, inicia a conversa.

A conversa deve parecer um aplicativo moderno de mensagens.

Enviar:

texto

emoji

imagem (opcional)

áudio (opcional)

mensagem de voz



Segurança

Todo o chat deve utilizar criptografia ponta a ponta.

As mensagens devem se autodestruir.

Depois que a conversa terminar:

todo o histórico deve ser apagado automaticamente.

Nenhuma mensagem permanece salva.

Nenhum administrador pode ler conversas encerradas.

Não armazenar conteúdo das mensagens.

Guardar apenas métricas anônimas, como:

tempo médio de conversa

quantidade de atendimentos

horário de pico

Nunca armazenar nomes.

Nunca armazenar IP em formato identificável.

Nunca armazenar localização precisa.



Sistema de filas

Usuário entra.

Fica aguardando.

Tela:

“Estamos procurando alguém disponível para conversar com você.”

Assim que um voluntário aceitar:

o chat abre automaticamente.



Área do voluntário

Sistema separado.

Login obrigatório.

Somente voluntários aprovados podem acessar.

Cada voluntário possui status:

Disponível

Ocupado

Offline

Quando disponível:

recebe solicitação.

Pode aceitar ou recusar.



Psicólogos

Existe uma categoria especial:

Psicólogos voluntários.

Quando houver psicólogo online, o sistema pode direcionar automaticamente usuários para eles.

Os psicólogos aparecem apenas como:

Psicólogo Voluntário

Nunca mostrar:

nome completo

telefone

redes sociais



Encerramento da conversa

Quando terminar:

Mostrar:

“Esperamos que esta conversa tenha ajudado você.”

Botões:

Conversar novamente

Encerrar

Ao encerrar:

Todo histórico desaparece.



Recursos extras

Modo escuro.

Modo claro.

Notificações.

Indicador de digitando…

Mensagens entregues.

Mensagens lidas.



Segurança adicional

Implementar:

Rate Limit

Proteção contra spam

Proteção contra bots

Criptografia AES-256 para dados armazenados e TLS para comunicação.

Proteção contra ataques comuns.

Logs apenas técnicos.

Sem conteúdo das mensagens.



Casos de crise

Adicionar um botão sempre visível:

Preciso de ajuda urgente

Ao tocar nele:

mostrar imediatamente os contatos oficiais de emergência do país do usuário (como o serviço de prevenção ao suicídio e serviços de emergência), além de orientar que, em situações de risco imediato, procure ajuda presencial ou ligue para a emergência local.

O aplicativo não substitui atendimento médico ou psicológico de urgência.



Tecnologias

Frontend:

React

TypeScript

Tailwind CSS

Backend:

Node.js

Firebase

Firestore

Cloud Functions

Firebase Authentication (apenas para voluntários)

Realtime Database ou Firestore para mensagens em tempo real.



Banco de dados

Criar toda a estrutura automaticamente.

Collections:

volunteers

psychologists

queue

conversations

anonymous_users

metrics

notifications

reports



Administração

Painel administrativo protegido.

Mostrar:

Quantidade de atendimentos

Tempo médio

Voluntários online

Psicólogos online

Fila

Relatórios

Nunca permitir visualizar mensagens privadas.



Acessibilidade

Fonte grande.

Alto contraste.

Compatível com leitores de tela.

Navegação simples.

Responsivo.

Funcionar perfeitamente em Android, iPhone e navegadores.



Objetivo final

Criar uma plataforma extremamente segura, acolhedora e anônima, onde qualquer pessoa possa conversar sem revelar sua identidade. O sistema deve priorizar a privacidade dos usuários, oferecer atendimento humano por voluntários e psicólogos cadastrados e manter uma experiência simples, rápida e confiável, sempre deixando claro que, em situações de emergência ou risco iminente, o aplicativo orienta o usuário a procurar os serviços oficiais de emergência e não substitui atendimento profissional de urgência.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://desabafoamigo.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ce27e131-caf6-49a0-96ff-b49e0b0eee10).

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
