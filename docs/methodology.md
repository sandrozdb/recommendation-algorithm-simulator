# Metodologia e fidelidade conceitual

## Base pública utilizada

A principal referência conceitual é a documentação pública da Netflix sobre recomendações. Ela descreve, em alto nível, sinais como:

- histórico de visualização e avaliações;
- preferências de assinantes com gostos semelhantes;
- informações dos títulos, como gênero, categorias, atores e ano de lançamento;
- horário de uso;
- idioma preferido;
- dispositivo;
- tempo assistido.

A Netflix também informa que:

- perfis novos podem começar com escolhas iniciais de títulos;
- interações recentes tendem a influenciar mais que interações antigas;
- a página inicial pode personalizar quais fileiras aparecem, quais títulos entram nelas e a ordem desses títulos;
- novos sinais são usados continuamente para atualizar as recomendações.

Fonte principal: <https://help.netflix.com/pt/node/100639>

## Como a demo traduz esses conceitos

O simulador transforma esses princípios em um modelo pequeno e observável:

```text
comportamento → sinais → perfil inferido → score → ranking → exibição → novo comportamento
```

O objetivo não é reproduzir um sistema comercial, e sim permitir que o usuário enxergue o efeito de cada etapa.

## Score didático

A aplicação usa quatro componentes visíveis, totalizando no máximo 100 pontos:

- **Similaridade:** até 55 pontos;
- **Popularidade:** até 20 pontos;
- **Recência:** até 10 pontos;
- **Exploração:** até 15 pontos.

O total exibido é sempre a soma exata desses quatro componentes. Sinais negativos e penalidades de repetição são incorporados à Similaridade para manter a explicação transparente.

## Conteúdo já consumido

Depois que um título recebe um novo sinal, ele deixa o conjunto principal de candidatos da próxima recomendação. O comportamento continua sendo usado para atualizar o perfil inferido, mas o sistema procura outro conteúdo ainda não consumido para ocupar o ranking.

## O que esta aplicação não faz

- não reproduz código proprietário da Netflix;
- não afirma conhecer pesos, modelos ou regras internas reais;
- não usa dados pessoais reais;
- não coleta interações em servidor;
- não usa informações demográficas;
- não utiliza pôsteres oficiais como dependência visual;
- não representa uma previsão estatística real de clique, retenção ou satisfação.

## Objetivo

Tornar sistemas de recomendação mais fáceis de explicar em uma apresentação, conectando comportamento, personalização, ranking e exposição de forma visual e interativa.
